# Reveal Auto-Agenda

[andrie/reveal-auto-agenda](https://github.com/andrie/reveal-auto-agenda)（v0.0.3）をベースに、
このリポジトリ向けにカスタマイズした Quarto Reveal.js フィルタ。

デッキ内の H1（`#` 見出し）をセクション区切りとして拾い、各セクションの先頭に「現在地がハイライトされたアジェンダスライド」を自動挿入する。

## 使い方

`.qmd` の frontmatter でフィルタを有効化する：

```yaml
---
title: "ネットワークを学ぶ"
filters:
  - reveal-auto-agenda
auto-agenda:
  bullets: bullet
---
```

`# セクション名` と書いた H1 がアジェンダ項目になる。アジェンダに含めたくない H1 には `{.no-auto-agenda}` クラスを付ける。

### 階層構造（ネストしたセクション）

H1 に `{.nested}` クラスを付けると、直前のトップレベル H1 の子としてアジェンダに入れ子表示される：

```markdown
# ルーティング

# ネットワーク実践{.nested}
```

- ネストしたセクションにも通常どおりアジェンダスライドが挿入され、そのスライドではサブ項目の行に
  navy 帯のハイライトが付く（親セクションのタイトルは通常表示のまま。太字にしたい場合は
  テーマ側で `.agenda-parent-active { font-weight: bold; }` を定義する）
- 親セクション自体がアクティブなときは、navy 帯は親タイトルの行だけに掛かり、
  サブ項目は通常表示のまま
- `{.agenda-nested}` も同じ意味のエイリアスとして使える
- アジェンダでの表示名を短くしたい場合は `agenda-text` 属性で上書きできる：
  `# 長いセクションタイトル {.nested agenda-text="短いラベル"}`（トップレベル H1 でも使用可）

## オプション

すべて `auto-agenda:` 以下に指定する。

| オプション | 値 | デフォルト | 説明 |
| --- | --- | --- | --- |
| `bullets` | `bullet` / `numbered` / `none` | `bullet` | アジェンダ項目のリスト形式 |
| `heading` | 任意の文字列 | なし | アジェンダスライドの見出しテキスト。未指定時はテーマ CSS の `::before` が "Agenda" を表示する |
| `font-size` | CSS 長さ（例 `30pt`） | `26pt` | アジェンダ項目のフォントサイズ |
| `item-spacing` | CSS 長さ（例 `0.6em`） | `0.3em` | 項目間の上下マージン |
| `item-padding` | CSS 長さ（例 `0.2em`） | `0.4em` | 各項目内側の上下パディング（現在地ハイライトの帯の太さに効く） |
| `line-height` | 数値（例 `1.6`） | `1.4` | リストの行間 |
| `heading-font-size` | CSS 長さ（例 `36pt`） | `40pt` | "Agenda" 見出しのフォントサイズ |
| `sub-font-size` | CSS 長さ（例 `0.7em`） | `0.8em` | ネスト項目のフォントサイズ（親項目に対する相対値） |
| `sub-display` | `all` / `active` | `all` | ネスト項目を常に表示するか、アクティブなセクションのみ展開するか |

### 指定例

```yaml
auto-agenda:
  bullets: numbered
  font-size: 30pt
  item-spacing: 0.6em
  item-padding: 0.2em
  line-height: 1.6
  heading-font-size: 36pt
```

## 仕組み（サイズ系オプション）

`font-size` / `item-spacing` / `item-padding` / `line-height` / `heading-font-size` / `sub-font-size`
を指定すると、
`reveal-auto-agenda.lua` が `.agenda` div（`heading:` 指定時は `.agenda-heading` div にも）へ
CSS カスタムプロパティを inline style として注入する：

```html
<div class="agenda" style="--agenda-font-size: 30pt; --agenda-item-spacing: 0.6em;">
```

実際のスタイルはサイトテーマ `style/scss/_base.scss` の Agenda セクションが
`var(--agenda-font-size, 26pt)` のようにフォールバック付きで参照している。
オプション未指定時は変数が定義されないため、フォールバック値（＝サイトデフォルト）がそのまま適用される。

見た目のデフォルト値を変えたい場合は `style/scss/_base.scss` を編集する
（`style/revealjs.css` は読み込まれない legacy コピーなので同期のみ）。
同梱の `reveal-auto-agenda.css` は最小限の構造スタイルだけを持ち、サイズ系はテーマに委譲している。

## 元実装からの主な変更点

- `font-size` / `item-spacing` / `item-padding` / `line-height` / `heading-font-size` /
  `sub-font-size` オプションの追加（CSS カスタムプロパティ注入方式）
- `{.nested}` クラスによる階層構造（入れ子アジェンダ）と `sub-display` オプション、
  `agenda-text` 属性による表示名の上書き
- アジェンダスライドの見た目はサイトテーマ（`style/scss/_base.scss`）側で定義：現在地ハイライト（navy 背景・白文字）、"Agenda" 見出しの `::before` 自動挿入など

## PATCHED (regmonkey fork)

This is a locally patched fork of upstream v0.0.3 (andrie/reveal-auto-agenda).
Local changes: nested-section support, configurable sizing options
(`font-size`, `item-spacing`, `item-padding`, `line-height`, `sub-font-size`),
and `agenda-text` override. Do not replace with a fresh upstream pull.

Note: the agenda's visual styling lives in the format-extension theme
(`_extensions/regmonkey/slides/scss/_base.scss`), not in this extension.
