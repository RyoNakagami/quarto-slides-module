---
name: regmonkey-slide-checker
description: regmonkey-quarto-slides モジュール（format: slides-revealjs）を使う Quarto プロジェクトのスライドレンダリング検証・バグチェックを行う。.qmdファイルの編集後、PRレビュー前、デプロイ前のチェックで発動。Playwright MCP を使ってローカルプレビューを実機検証し、数式(MathJax/KaTeX)、コードハイライト、画像、Mermaid/Plotly等の図、フラグメント遷移、スピーカーノート、印刷ビュー(PDF出力相当)、日本語フォント崩れ、リンク切れを網羅的にチェックする。「quarto」「revealjs」「スライドのバグ」「プレゼン崩れ」などへの言及で発動。
---

# regmonkey スライド検証 Skill

Quarto + revealjs（regmonkey-quarto-slides モジュール）で構築されたスライドを、Playwright MCP を使って実機検証する。
レンダリングログだけでは検出できない「描画後のバグ」を体系的に潰すことが目的。

## 前提

このskillは以下を前提とする。前提が揃っていない場合は、最初にユーザーに確認すること。

1. **対象プロジェクトのルートにいる** — slides-revealjs を使う Quarto プロジェクト（submodule 初期化済み：`git submodule update --init`）のルートがワーキングディレクトリ
2. **Quartoがインストール済み** — `quarto --version` が通る
3. **Playwright MCP が利用可能** — Claude Desktop / Claude Code の MCP 設定に `@playwright/mcp` が登録されている
4. **対象 .qmd ファイルが指定されている** — 複数ある場合はユーザーに優先順位を確認

## 標準ワークフロー

### Step 1 — リポジトリ構造の把握

最初に必ず以下を確認する(キャッシュせず毎回確認):

```bash
ls -la                          # ルート構造
cat _quarto.yml 2>/dev/null     # プロジェクト設定
find . -name "*.qmd" -not -path "*/\.*" -not -path "*/_*" | head -20
find . -name "*.scss" -not -path "*/\.*" | head -10
find . -name "custom*.css" -o -name "custom*.scss" 2>/dev/null
```

確認ポイント:
- format 設定（theme, width, height, slide-number, footer 等）：本体は format extension `slides-revealjs`（`_extensions/regmonkey/slides/_extension.yml`）、プロジェクト側 override は `notebook/_metadata.yml` 等の directory metadata
- カスタムSCSS/CSSの存在 — テーマ崩れチェックの対象を特定
- `images/`, `figs/`, `assets/` 等のリソースディレクトリ
- `_extensions/` の有無 — Quarto拡張(例: revealjs-clean等)が使われているか

### Step 2 — ローカルプレビュー起動

ユーザーに対して、別ターミナルで以下を起動してもらう:

```bash
uv run quarto preview path/to/slide.qmd --no-browser --port 4444
```

複数ファイル一括ならプロジェクトルートで:

```bash
uv run quarto preview --no-browser --port 4444
```

起動を確認したら、Playwright MCP で `http://localhost:4444` にアクセス。

### Step 3 — Playwright MCP による検証

以下を順に実行する。各チェックの結果は `issues` 配列に蓄積し、最後に Step 4 でレポート化する。

#### 3-1. コンソール・ページエラー監視(必須)

ページ遷移前に listener を仕込む:
- `console` イベントで `error` / `warning` を捕捉
- `pageerror` イベントで未捕捉例外を捕捉
- `requestfailed` で 404/CORS等のリソース取得失敗を捕捉

revealjs プラグイン(menu, chalkboard, multiplex 等)はロード順依存で warning を出すことがあるため、warning も全件記録するが Critical/Info に分類する。

#### 3-2. 全スライド走査

revealjs では `?print-pdf` クエリを付けると全スライドが縦に展開される。
これを使って全スライドのDOMを一括検証するのが効率的:

```
http://localhost:4444/?print-pdf
```

ただし fragment 遷移などインタラクティブな挙動は通常モード(`?print-pdf` なし)で別途検証する。

#### 3-3. 検証項目チェックリスト

以下を順に実行:

| # | 項目 | セレクタ / 条件 | 重要度 |
|---|------|----------------|--------|
| 1 | 画像の読み込み | `img` の `naturalWidth > 0` かつ `complete === true` | Critical |
| 2 | 数式レンダリング | `.MathJax, .katex, mjx-container` のカウント。`.qmd`内の`$...$`の数と乖離していないか | Critical |
| 3 | コードハイライト | `pre code` あり、かつ `pre code span` が0でない | Warning |
| 4 | Mermaid図 | `pre.mermaid` または `svg[id^="mermaid"]` が描画完了しているか | Warning |
| 5 | アンカーリンク | `a[href^="#"]` の遷移先が存在するか | Warning |
| 6 | 外部リンク | `a[href^="http"]` を一覧化(疎通確認は別途オプション) | Info |
| 7 | フォント | 本文の `computed font-family` がYAMLで指定したものと一致するか | Warning |
| 8 | 日本語フォント | 日本語文字を含む要素で `tofu`(豆腐文字 = 描画失敗)が出ていないか — 文字幅 < 1px の文字を検出 | Critical |
| 9 | スライド境界 | 各 `section.slide` の `scrollHeight > clientHeight` ならコンテンツ溢れ | Warning |
| 10 | フラグメント | 通常モードで `→` キーを連打し、`.fragment.visible` が想定通り順次出現するか | Info |
| 11 | スピーカーノート | `aside.notes` の存在と内容(あればノートビュー検証推奨) | Info |
| 12 | スライド番号 | 設定で有効なら `.slide-number` が表示されているか | Info |

#### 3-4. レスポンシブ・テーマ検証

| ビューポート | 用途 |
|-------------|------|
| 1920×1080 | 投影想定(16:9) |
| 1280×720 | ノートPC想定 |
| 375×667 | モバイル(revealjs はモバイル非推奨だが崩れの程度を確認) |

各サイズでフルページスクリーンショットを撮影。
`_quarto.yml` で `theme: dark` 等が指定されていればその通り、複数テーマがあれば切り替えて比較。

#### 3-5. 印刷(PDF)ビュー検証

`?print-pdf` 付きでアクセスし:
- ページ分割位置でコンテンツが切れていないか(`.pdf-page` の overflow チェック)
- 背景画像が消えていないか
- フッター/ページ番号が全ページに出ているか

### Step 4 — レポート出力

検証結果を以下の構造のMarkdownで出力する:

```markdown
# regmonkey スライド検証レポート

- 対象: `path/to/slide.qmd`
- 検証日時: YYYY-MM-DD HH:MM
- 検証URL: http://localhost:4444
- スライド総数: N

## サマリ
- 🔴 Critical: X件
- 🟡 Warning: Y件
- 🔵 Info: Z件

## Critical(即時対応)
### [カテゴリ] 概要
- 該当スライド: スライド番号 / 見出し
- 詳細: ...
- 推奨対応: ...

## Warning(レビュー推奨)
...

## Info(参考情報)
...

## スクリーンショット
- desktop_1920.png
- laptop_1280.png
- mobile_375.png
- print_pdf.png
```

スクリーンショットは `present_files` で必ず提示する。

## ありがちなバグパターン(regmonkey スライド想定)

経験的に以下が頻出するため、特に重点的にチェックすること:

1. **日本語フォントの混在** — 本文と見出しでフォントが異なり統一感が失われる。SCSSで `$presentation-heading-font` と `$font-family-sans-serif` の両方を指定しているか確認
2. **数式の改行問題** — `$$ ... $$` ブロック内の長い式がスライド幅をオーバーフローしてはみ出す。`\\` での改行を要検討
3. **コードブロックの行数オーバー** — 20行以上のコードはスライドに収まらない。`code-line-numbers: "|3-5|7-9"` でハイライト切り替え推奨
4. **画像の絶対パス** — `/images/foo.png` のような絶対パスはローカルでは動くがGitHub Pagesデプロイで壊れる。相対パス推奨
5. **Mermaid のテーマ不一致** — ダークテーマのスライドでMermaidが白背景のままになる。`%%{init: {'theme':'dark'}}%%` 指定推奨
6. **fragment の入れ子** — `.fragment` を入れ子にすると意図しない順序で出現する
7. **横方向スクロールの発生** — `width: 1050` (デフォルト)を超えるテーブルやコードでスクロールバーが出る
8. **MathJax v3 と KaTeX の取り違え** — `_quarto.yml` の `html-math-method` 指定で挙動が変わる。CSSが片方しか効かないケースあり

## 補助スクリプト

頻繁に使うチェックは `scripts/check-quarto.mjs` を生成して再利用する。
詳細は `scripts/README.md` を参照。

## 範囲外(このskillはやらない)

- `.qmd` 自体の文法チェック → `quarto render` のログを見る
- 統計的な内容の正しさのチェック → ユーザーが確認
- パフォーマンス測定(Lighthouse 等)→ 別skill候補
- デプロイ後の本番URL検証 → ローカルプレビューが対象。本番チェックは別途指示が必要

## 失敗時のフォールバック

- ポート 4444 が使えない場合は 4445, 4446 と順次試す
- `uv run quarto preview` が起動しない場合は `quarto render` で静的HTMLを出力し、`python -m http.server` で配信して検証
- Playwright MCP が利用不可なら `scripts/check-quarto.mjs` を直接 `node` で実行するよう案内
