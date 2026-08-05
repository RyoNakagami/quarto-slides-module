# scripts

## check-quarto.mjs

Quarto + revealjs スライドの自動検証スクリプト。

### セットアップ

```bash
npm install -D playwright
npx playwright install chromium
```

または既にPlaywrightがある環境ならそのまま実行可能。

### 使い方

事前に別ターミナルで `quarto preview --no-browser --port 4444` を起動した状態で:

```bash
node scripts/check-quarto.mjs http://localhost:4444 \
  --out=report.json \
  --screenshots-dir=./screenshots
```

### 出力

- `report.json` — 検証結果の構造化データ
- `screenshots/desktop_1920.png` 等 — 各ビューポートのスクリーンショット
- 終了コード: Critical issue が1件以上で `1`、それ以外は `0` → CIで活用可

### CI(GitHub Actions)組み込み例

```yaml
- name: Install Quarto
  uses: quarto-dev/quarto-actions/setup@v2

- name: Render
  run: quarto render

- name: Serve
  run: |
    cd _site
    python -m http.server 4444 &
    sleep 3

- name: Install Playwright
  run: |
    npm i -D playwright
    npx playwright install --with-deps chromium

- name: Check
  run: node scripts/check-quarto.mjs http://localhost:4444

- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: quarto-check-report
    path: |
      report.json
      screenshots/
```

### 検出項目まとめ

| 項目 | 重要度 | 説明 |
|------|--------|------|
| broken-image | Critical | 画像読み込み失敗 |
| pageerror | Critical | JS未捕捉例外 |
| console.error | Critical | コンソールエラー |
| possible-tofu | Critical | 日本語フォント描画失敗の疑い |
| math-not-rendered | Warning | $...$ があるのに数式要素0 |
| no-syntax-highlighting | Warning | コードブロックにハイライトなし |
| mermaid-not-rendered | Warning | Mermaidの未処理ブロック |
| dead-anchor | Warning | 内部アンカーの遷移先なし |
| content-overflow | Warning | スライドからのコンテンツ溢れ |
| requestfailed | Warning | リソース取得失敗 |

### 既知の制約

- KaTeX / MathJax の選択は `_quarto.yml` の `html-math-method` に従う。スクリプトは両方の要素を検出する
- `embed-resources: true` で出力されたスタンドアロンHTMLにはキャッシュ問題が起きにくいので、検証時のみ `false` にしておくと差分が見やすい
- フォント検証は `computed font-family` の文字列マッチのみ。実際にWebフォントがロードされたかは別途 `document.fonts.ready` を待つ必要がある
