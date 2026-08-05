#!/usr/bin/env node
/**
 * regmonkey-presentation 検証スクリプト
 *
 * 使い方:
 *   node check-quarto.mjs [URL] [--out=report.json] [--screenshots-dir=./screenshots]
 *
 * 例:
 *   node check-quarto.mjs http://localhost:4444 --out=report.json
 */

import { chromium } from 'playwright';
import { writeFileSync, mkdirSync } from 'fs';
import { resolve } from 'path';

const args = process.argv.slice(2);
const url = args.find(a => !a.startsWith('--')) ?? 'http://localhost:4444';
const outFile = (args.find(a => a.startsWith('--out=')) ?? '--out=report.json').split('=')[1];
const shotDir = (args.find(a => a.startsWith('--screenshots-dir=')) ?? '--screenshots-dir=./screenshots').split('=')[1];

mkdirSync(shotDir, { recursive: true });

const issues = { critical: [], warning: [], info: [] };
const stats = {};

const browser = await chromium.launch();
const context = await browser.newContext();
const page = await context.newPage();

// ---- listeners ----
page.on('console', msg => {
  const text = msg.text();
  if (msg.type() === 'error') issues.critical.push({ kind: 'console.error', message: text });
  else if (msg.type() === 'warning') issues.info.push({ kind: 'console.warn', message: text });
});
page.on('pageerror', err => issues.critical.push({ kind: 'pageerror', message: err.message }));
page.on('requestfailed', req => {
  // favicon等の軽微なものは除外
  if (req.url().includes('favicon')) return;
  issues.warning.push({ kind: 'requestfailed', url: req.url(), reason: req.failure()?.errorText });
});

// ---- navigate (print-pdf mode で全スライド一括取得) ----
const printUrl = url.includes('?') ? `${url}&print-pdf` : `${url}?print-pdf`;
await page.goto(printUrl, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(2000); // MathJax/Mermaid のレンダリング待ち

// ---- 1. 画像チェック ----
const broken = await page.$$eval('img', imgs =>
  imgs
    .filter(i => !i.complete || i.naturalWidth === 0)
    .map(i => ({ src: i.src, alt: i.alt, slideTitle: i.closest('section')?.querySelector('h1,h2,h3')?.textContent?.trim() }))
);
broken.forEach(b => issues.critical.push({ kind: 'broken-image', ...b }));
stats.images = { total: await page.locator('img').count(), broken: broken.length };

// ---- 2. 数式 ----
const mathCount = await page.locator('.MathJax, mjx-container, .katex').count();
stats.math = { rendered: mathCount };
if (mathCount === 0) {
  // 本文に $ が含まれていれば warn
  const bodyText = await page.locator('body').innerText();
  if (/\$[^$]+\$/.test(bodyText)) {
    issues.warning.push({ kind: 'math-not-rendered', message: '$...$ が本文に存在するが MathJax/KaTeX 要素が0件' });
  }
}

// ---- 3. コードハイライト ----
const codeBlocks = await page.locator('pre code').count();
const highlighted = await page.locator('pre code span').count();
stats.code = { blocks: codeBlocks, highlighted };
if (codeBlocks > 0 && highlighted === 0) {
  issues.warning.push({ kind: 'no-syntax-highlighting', message: `${codeBlocks}個のコードブロックがあるがハイライトなし` });
}

// ---- 4. Mermaid ----
const mermaidPending = await page.locator('pre.mermaid:not([data-processed="true"])').count();
const mermaidRendered = await page.locator('svg[id^="mermaid"], div.mermaid svg').count();
stats.mermaid = { rendered: mermaidRendered, pending: mermaidPending };
if (mermaidPending > 0) issues.warning.push({ kind: 'mermaid-not-rendered', count: mermaidPending });

// ---- 5. アンカーリンク ----
const anchors = await page.$$eval('a[href^="#"]', as =>
  as.map(a => a.getAttribute('href')).filter(h => h && h !== '#')
);
const deadAnchors = [];
for (const a of [...new Set(anchors)]) {
  try {
    const exists = await page.locator(a).count() > 0;
    if (!exists) deadAnchors.push(a);
  } catch {
    deadAnchors.push(a);
  }
}
deadAnchors.forEach(a => issues.warning.push({ kind: 'dead-anchor', href: a }));
stats.anchors = { total: anchors.length, dead: deadAnchors.length };

// ---- 6. 外部リンク一覧 ----
const externals = await page.$$eval('a[href^="http"]', as =>
  [...new Set(as.map(a => a.getAttribute('href')))]
);
stats.externalLinks = externals.length;

// ---- 7. コンテンツ溢れ ----
// 注: `.pdf-page` を含めるとReveal `?print-pdf` モードの section 配置
// (top:45px / bottom:-45px)で systematic な 45px 偽陽性が出るため、
// 実際にコンテンツが溢れている `section.slide` のみを計測する。
const overflowing = await page.$$eval('section.slide', sections =>
  sections
    .map(s => ({
      title: s.querySelector('h1,h2,h3')?.textContent?.trim() || '(no title)',
      overflowY: s.scrollHeight - s.clientHeight,
      overflowX: s.scrollWidth - s.clientWidth
    }))
    .filter(o => o.overflowY > 5 || o.overflowX > 5)
);
overflowing.forEach(o => issues.warning.push({ kind: 'content-overflow', ...o }));
stats.slides = await page.locator('section.slide').count();

// ---- 8. 日本語tofu検出(簡易) ----
// 文字幅0のテキストノードを検出
const tofuSuspects = await page.evaluate(() => {
  const result = [];
  const range = document.createRange();
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    const text = node.nodeValue?.trim();
    if (!text || !/[\u3000-\u9fff]/.test(text)) continue;
    range.selectNodeContents(node);
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && text.length > 0) {
      result.push(text.slice(0, 30));
    }
  }
  return result;
});
tofuSuspects.slice(0, 5).forEach(t => issues.critical.push({ kind: 'possible-tofu', sample: t }));

// ---- スクリーンショット ----
await context.close();

// 通常モードで複数ビューポート
const viewports = [
  { name: 'desktop_1920', width: 1920, height: 1080 },
  { name: 'laptop_1280', width: 1280, height: 720 },
  { name: 'mobile_375', width: 375, height: 667 }
];

for (const vp of viewports) {
  const ctx = await browser.newContext({ viewport: vp });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.waitForTimeout(1500);
  const path = resolve(shotDir, `${vp.name}.png`);
  await p.screenshot({ path, fullPage: false });
  await ctx.close();
}

// print-pdf スクリーンショット(全スライド縦)
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage();
  await p.goto(printUrl, { waitUntil: 'networkidle' });
  await p.waitForTimeout(2000);
  const path = resolve(shotDir, 'print_pdf.png');
  await p.screenshot({ path, fullPage: true });
  await ctx.close();
}

await browser.close();

// ---- レポート出力 ----
const report = {
  url,
  timestamp: new Date().toISOString(),
  stats,
  summary: {
    critical: issues.critical.length,
    warning: issues.warning.length,
    info: issues.info.length
  },
  issues
};

writeFileSync(outFile, JSON.stringify(report, null, 2));
console.log(`Report written to ${outFile}`);
console.log(`Critical: ${issues.critical.length}, Warning: ${issues.warning.length}, Info: ${issues.info.length}`);

// CIで使うなら critical があれば exit 1
if (issues.critical.length > 0) process.exit(1);
