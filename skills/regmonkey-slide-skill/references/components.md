# Components reference

Every named component the repo's CSS supports. Group by purpose. Each entry shows the canonical fenced-div invocation and what it's for. When picking a component, **match against this table; do not invent class names** — undefined classes silently render unstyled.

## Table of contents

1. [Contrast & paired blocks](#contrast--paired-blocks) — pentagon-box, square-box
2. [Status / framed blocks](#status--framed-blocks) — info-box, def-block, success/warning/caution/danger-box, message-box
3. [Headers & dividers](#headers--dividers) — border-bottom-header(-left), mini-section, h2-submessage, section-header
4. [Stage / phase blocks](#stage--phase-blocks) — hop-step-jump, step-container, past-phase / active-phase
5. [Keypoint blocks](#keypoint-blocks) — vertical-keypoints, horizontal-keypoints
6. [Summary blocks](#summary-blocks) — message-card, summary-container
7. [Cards](#cards) — component-card, component-card-for-analysis-summary, component-card-index
8. [Grids & layouts](#grids--layouts) — tools-grid, tools-column, centered-column-wrapper
9. [List markers](#list-markers) — checkmark, checkmark_none, squaredmark, custom-list
10. [Tables](#tables) — custom-table(-no-header), yaml2table, yaml2grouptable
11. [Index slide](#index-slide) — regmonkey-index-slide(-no-title), sidebar
12. [Misc](#misc) — topleftbox, regmonkey-bold, border-bottom

---

## Contrast & paired blocks

These are the repo's signature for "課題 → 対応" / AS-IS → TO-BE. **Pentagon goes left**, with its right-pointing arrow visually delivering the problem into the **square on the right**, where the answer lives. Reversing the sides loses the meaning. Two squares for a contrast reads as "two parallel things", not as problem→answer.

| Class | Height | Notes |
|---|---|---|
| `.pentagon-box-400` | 400px | Compact; for slides with sparse content. |
| `.pentagon-box-500` | 500px | Default. Matches square-box-500. |
| `.pentagon-box-550` | 550px | When 500 is just barely too short. |
| `.pentagon-box-600` | 600px | High-density bullets. |
| `.pentagon-box-700` | 700px | Almost full slide; rare. |
| `.square-box-400` … `-700` | matching | Always pair with the same number. |

Internal structure: header div + body div. Header uses `.border-bottom-header-left`. Body uses `.squaredmark` (square bullet markers) — see [List markers](#list-markers).

```
::::{.pentagon-box-500}
:::{.border-bottom-header-left}
ヘッダー文言
:::
:::{.squaredmark style="font-size: 0.9em"}
- 1点目
- 2点目
:::
::::
```

The pentagon's arrow tip (rendered as an SVG `::after`) extends ~165px past the box. Don't put another column hard against the pentagon's right edge — leave the `width="50%"` columns alone and the arrow will fit.

---

## Status / framed blocks

All share the same internal anatomy: a 4px-wide colored bar on the left and pale tinted background. Pick by semantic.

| Class | Bar color | Background | Use for |
|---|---|---|---|
| `.info-box` | #428CE6 (blue) | #e8f1fe | Definitions, framing, neutral takeaways. The workhorse. |
| `.def-block` | #428CE6 (blue) | white | Mathematical / theoretical definitions. Use with `.def-title` and `.def-contents` inside. |
| `.success-box` | #1e8e3e (green) | #e6f4ea | Confirmation, "実現できること". |
| `.warning-box` | #f9ab00 (yellow) | #fef7e0 | Caveat, things to be aware of. |
| `.caution-box` | #e8710a (orange) | #fff3e0 | Stronger caution; gotchas. |
| `.danger-box` | #d93025 (red) | #fde8e8 | Hard "do not" — anti-patterns, errors. |
| `.message-box` | — | bordered | Plain bordered callout (no left bar). |
| `.message-box-no-border` | — | none | Plain block, padding only. |

Internal structure for `.info-box`:

```
:::{.info-box}
{{< reveal_vspace 0.25em >}}
:::{.info-contents .font-10 .padding-left-05 .lh-12}
- bullet 1
- bullet 2
:::
:::
```

For `.info-box` you can title it: put `[タイトル]{.info-box-title}` inside. **必須ルール:** `[...]{.info-box-title}` の行の[**上下に必ず空行**]を入れる．直前の `:::{.info-box}` フェンスや直後の `:::{.info-contents}` フェンスとくっつくと Pandoc が span として認識せず，タイトルが消える（または info-contents の中身に飲み込まれる）．番号付きの場合は `①②③④⑤⑥⑦⑧⑨⑩` を先頭に付ける．

```
:::{.info-box}

[① タイトル]{.info-box-title}

:::{.info-contents .font-10 .padding-left-05 .lh-12}
- bullet 1
- bullet 2
:::

:::
```

For `.def-block` the same blank-line rule applies to `[定義名]{.def-title}`:

```
:::: {.def-block style="font-size:1.2em;"}

[定義名]{.def-title}

::: {.def-contents}
- 定義の本文
:::

::::
```

`.success-box` / `.warning-box` / `.caution-box` / `.danger-box` mirror `.info-box` exactly — same `.info-contents`, `.info-box-title` work inside them too (同じ空行ルールが適用される)．

---

## Headers & dividers

| Class | Render | Use for |
|---|---|---|
| `.border-bottom-header` | Centered text with bottom border (97.5% width) | Headers inside boxes when centering reads better. |
| `.border-bottom-header-left` | Left-aligned text with bottom border | The default for box headers. Used inside pentagon/square boxes. |
| `.border-bottom` | Just a bottom border, applied as inline span via `[text]{.border-bottom}` | Section labels mid-slide. |
| `.section-header` | Bold section label | Top-of-slide subdivision marker. Auto-flattened into a span by the `regmonkey_slide_editing` filter. |
| `.mini-section` | Bold + ▶ prefix, inline | Sub-headings within a slide. Used as `[見出し]{.mini-section}`. |
| `.h2-submessage` | Large blue (#0e3666) text, 1.3em bold | Sub-message under the H2 title. Used as `[本文]{.h2-submessage}`. |

`.h2-submessage` pattern (very common at slide top):

```
## スライドタイトル

[一文で表現したサブメッセージ]{.h2-submessage}

{{< reveal_vspace 0.5em >}}
```

---

## Stage / phase blocks

### `.hop-step-jump-container`

Three-stage left-to-right progression with implied "→" between stages. Each child is a `.step` with a numbered class `.step-1` / `.step-2` / `.step-3` (these set color tones — earlier=lighter).

Internal structure:
```
:::::{.hop-step-jump-container}
::::{.step .step-1}
:::{.step-number}    <- typically a role/label
ジュニア
:::
:::{.step-title}     <- the verb-phrase that defines the stage
分析ができる
:::
:::{.info-content}   <- bullets describing the stage
- ...
:::
::::
... step 2, step 3 ...
:::::
```

`.hop-step-jump-container-vanilla` is the same layout without the colored decoration — use when you want a flat presentation of the same structure.

### `.step-container` / `.step` / `.past-phase` / `.active-phase` / `.active-phase-sm`

Arrow-shaped phase pills laid out left→right with chevron tips that interlock visually．**Use for ordered processes・workflows・daily cycles where each step "feeds into" the next**．`.hop-step-jump-container` describes 3 distinct stages（昇順成長）；`.step-container` describes **N ステップ（4 以上も可）の連続プロセス**．

クラス対応：

| クラス | 効果 |
|---|---|
| `.step-container` | flex 横並びコンテナ．`style="height: 48%"` 等で高さ指定可． |
| `.step` | コンテナ内の1セグメント．flex 等分割． |
| `.active-phase` | 内部の塗り＋左右の chevron 矢印（青色．高さ 4em） |
| `.active-phase-sm` | `.active-phase` を **高さ 2.5em に縮める修飾子**．`.step-label` で下に説明を付けるレイアウトのとき矢印が太すぎるので**ほぼ常に併用**． |
| `.past-phase` | 灰色版（履歴・完了済みフェーズ用） |
| `.step-label` | 矢印の**下に表示される説明テキスト**ブロック．`position: absolute; top: 100%` で矢印直下に張り付く． |

**典型形（N ステップの日次サイクル等）：**

```
::::{.step-container style="height: 48%"}

:::{.step}
[ステップ1ラベル]{.step .active-phase .active-phase-sm}

:::{.step-label}
- 1点目の説明
- 2点目の説明
:::
:::

:::{.step}
[ステップ2ラベル]{.step .active-phase .active-phase-sm}

:::{.step-label}
- ...
:::
:::

... step3, step4 ...

::::
```

**運用ルール：**

- **`.active-phase` 単体ではなく必ず `.active-phase-sm` を併用**：単体だと矢印高さ 4em で `.step-label` がスライドからはみ出す．小さい矢印＋下の `.step-label` の組み合わせで初めて読みやすくなる．
- **矢印内のラベルは `[...]{.step .active-phase .active-phase-sm}` の span 形式**：div ではなく Pandoc bracketed span．こうしないと chevron `::before` / `::after` が効かない．
- **`.step-label` 内は箇条書きを推奨**：1〜3 個程度．多すぎると下のスライド領域を圧迫する．
- **本数は 3〜6 が現実的**．7 以上だと矢印の幅が狭くなりラベルが折り返して読みづらい．それより多いときは yaml2table を選ぶ．
- **過去フェーズと現在フェーズの対比**が欲しいときだけ `.past-phase` を混在させる（roadmap 用途）．日次サイクル等で全ステップを並列に見せたいときは `.active-phase` で揃える．

実例：regmonkey-presentation repo の `posts/2026-05-28-monitoring-memo/index.qmd` の「オンコールは『アラート改善のオーナー』でもある」スライド（4 ステップの日次サイクル）．低レベルの CSS は format extension の `scss/_layouts.scss` の `.step-container` 周辺と `scss/_widgets.scss` の `.active-phase-sm` を参照．

---

## Keypoint blocks

### `.vertical-keypoints-block`

Stacked-vertical layout, each child has `.block` (or `.no-border-block`) and a header (`.block-header` or `.block-header-centered`). Use when you have 3+ "key takeaway" items that need to read top-to-bottom.

```
:::{.vertical-keypoints-block}
:::{.block}
:::{.block-header}
{{< bi exclamation-circle-fill size=1.6em color=#428CE6 >}} 観点1
:::
- bullet
- bullet
:::
:::{.block .last-block}
... last item ...
:::
:::
```

### `.horizontal-keypoints-block` / `.horizontal-keypoints-block-no-border`

Same idea, laid out left-to-right inside a `.columns` row. Used for **N-column slides where each column is one keypoint**. The `-no-border` variant drops the right-side separator (use for the last column only).

**列数の選び方：**

| 列数 | 各カラム幅 | 用途 | 文字密度の目安 |
|---|---|---|---|
| 2 | `50%` | 二項対比（AS-IS/TO-BE，定性/定量 等）．Pentagon×Square より軽い見せ方． | `font-size:0.9em`，bullet 3-5 個 |
| 3 | `33.3%` | 標準．「3つの観点」で要約するときの第一選択． | `font-size:0.85em`，bullet 3-5 個 |
| 4 | `25%` | 「4 つのルール / 4 つのカテゴリ」で並列に並べたいとき． | `font-size:0.8em`，bullet 3 個 |
| 5 | `20%` | 限界．これ以上は yaml2table を検討． | `font-size:0.75em`，bullet 2-3 個 |

**4 列レイアウトの典型形（実例：「良いアラートを作る7つの Tips」を4観点に集約）：**

```
::::: {.columns}

:::: {.column style="width: 25%; height:50%"}
:::{.horizontal-keypoints-block style="height:95%;"}
:::{.block-header}
{{< bi chat-dots-fill size=1.6em color=#428CE6 >}}
通知・記録
:::
{{< reveal_vspace 5% >}}
:::{.block style="font-size:0.8em; padding-right:0.4em;" .lh-14}
- メールではなく [チャット]{.regmonkey-bold} で通知
- アラートの [ログを必ず保持]{.regmonkey-bold}
:::
:::
::::

:::: {.column style="width: 25%; height:50%"}
:::{.horizontal-keypoints-block ...}
... col 2 ...
:::
::::

:::: {.column style="width: 25%; height:50%"}
:::{.horizontal-keypoints-block ...}
... col 3 ...
:::
::::

:::: {.column style="width: 25%; height:50%"}
:::{.horizontal-keypoints-block-no-border style="height:95%;"}
... col 4 (no right border) ...
:::
::::

:::::
```

**運用ルール：**

- **最後のカラムだけ `-no-border` 版**を使う．他のカラムを `-no-border` にすると区切りが消えて読みづらい．
- **各カラムの `.block-header` には `{{< bi ... >}}` アイコン**を 1 個入れる．これだけで一気に「並列で見せる」表現になる．
- **`.block-header` の直後に `{{< reveal_vspace 5% >}}` を入れて本文との間隔を確保**．省くとアイコンに本文が張り付く．
- **N>3 のときは N 個の bullet を Tips 数より少なく集約する**（例：7 Tips → 4 観点）．並列カラムは「観点」を見せる場であって個別 Tips を見せる場ではない．
- 各カラム高さは `style="height:50%"` 等で**揃える**．カラム間で高さがバラつくと矢印・枠線がガタつく．

---

## Summary blocks

### `.message-card`

Multi-block summary slide / labeled card. Use at deck open or section recap. Each card is one sub-takeaway: 紺色見出しバー + bullets. Stack 3–5 cards, separated by `{{< reveal_vspace 0.6em >}}`.

```
::::{.message-card .position-left-05 .font-08}

:::{.message-card-title-no-margin .center}

ラベル

:::

:::{.message-card-body .squaredmark .font-08}

- 本文 bullet
- 本文 bullet

:::

::::
```

Slots inside `.message-card`:

- `.message-card-label` — セクションラベル（グレー帯）．span 記法 `[...]{.message-card-label}`．省略可
- `.message-card-title` — 紺色見出しバー（ラベル併用時）．span 記法
- `.message-card-title-no-margin` — ラベルを省き見出しバーをカード上端に密着させる版．fence div + `.center` の組み合わせが定番
- `.message-card-body` — 本文．`.squaredmark` で ▪ bullets
- `.message-card-footer` — 注記フッター（上罫線 + グレー小文字）．span 記法．省略可

### `.summary-container`

Flexbox wrapper that stacks blocks vertically and centers them in the slide's height. Still useful around `.info-box` stacks (e.g. numbered findings summaries); not needed around `.message-card` stacks.

### `.main-message-block` / `.main-message-box`

Single-block "main message" callout, larger and louder than `.info-box`. Use when one sentence is the entire slide's payload.

---

## Cards

| Class | Render | Use for |
|---|---|---|
| `.component-card` | White card with shadow, hover lift | Generic content card. |
| `.component-card-for-analysis-summary` | Flat card, smaller font | Inside `.tools-grid` analysis-summary layouts. |
| `.component-card-index` | Bordered (#0a1e3d 2px), with `.title` slot | Index/agenda items. |

For `.component-card-index`:
```
:::{.component-card-index}
[1. セクション名]{.title}
- 内容...
:::
```

---

## Grids & layouts

| Class | Render | Use for |
|---|---|---|
| `.tools-grid` | 2-column CSS grid, gap 2em | Analysis-summary: 2×2 quadrants. |
| `.tools-column` | One column inside `.tools-grid` | Children for `.tools-grid`. |
| `.tools-column-after` | Variant with extra spacing | When the right column is action-items. |
| `.centered-column-wrapper` | Centers `.column` children | When `.columns` defaults look off-center. |

```
::::{.tools-grid}
::::: {.tools-column}
:::{.border-bottom-header}
左カラム見出し
:::
... cards ...
:::::
::::: {.tools-column}
:::{.border-bottom-header}
右カラム見出し
:::
... cards ...
:::::
::::
```

---

## List markers

Lists in Reveal default to disc bullets. The repo's CSS provides three styled variants — apply by wrapping the list in a div.

| Class | Marker | Use for |
|---|---|---|
| `.squaredmark` | Filled square in #0e3666 | Default for "structured/serious" lists. Used in pentagon/square boxes. |
| `.checkmark` | ✔ checkmark | "Done", "achieved", confirmable items. |
| `.checkmark_none` | Square (no checkmark) | When you want `.checkmark`'s spacing/typography but not the icon. |
| `.custom-list` | Custom bullet via `::before` | Edge cases; see CSS line 1511. |

Nested bullets automatically degrade to `disc` (one level) and the parent marker doesn't apply — this is intentional.

```
:::{.squaredmark style="font-size: 0.9em"}
- 親レベル（四角マーカー）
  - 子レベル（自動でdisc）
:::

:::{.checkmark}
- ✔ 完了したこと
- ✔ もう一つ完了したこと
:::
```

---

## Tables

| Class | Use for |
|---|---|
| `.custom-table` | The repo's standard styled table. |
| `.custom-table-no-header` | Same, when the first row isn't a header. |
| `.custom-table-for-analysis-summary` | Variant tuned for analysis-summary slides. |
| `.yaml2table` | Marker class — content rendered from YAML by `js/yaml2table.js`. |
| `.yaml2grouptable-custom-top` | Same, for grouped tables (モジュール同梱の `regmonkey_yaml2grouptable.js`). |

For YAML-driven tables, write YAML inside a fenced code block and the JS converts it at render time. See `posts/2025-10-17-index-slide/index.qmd` in the regmonkey-presentation repo for a full example.

### `.yaml2table .yaml2table-custom-top` の第1列ルール

`.yaml2table .yaml2table-custom-top` では，**各レコードの最初のキーの値（= 第1列・行ラベル）に `regmonkey-bold` クラスを付けない**．第1列は CSS 側で太字・色付けされた行ラベルとして既にスタイルが当たっており，ここに `<span class="regmonkey-bold">...</span>` を重ねると以下の問題が起きる：

- 行ラベル本来のスタイルと色が衝突して見た目が壊れる
- すべての行が均一に強調されることで「強調すべき箇所」の情報がなくなる
- `regmonkey-bold` の意味的な役割（本文中で特に注目させたい語）と矛盾する

```yaml
# NG ────────────────────────────────────────
record1:
  雑音モデル: <span class="regmonkey-bold">独立等分散（homoskedastic）</span>
  ...

# OK ────────────────────────────────────────
record1:
  雑音モデル: 独立等分散（homoskedastic）
  ...
```

`regmonkey-bold` を使うのは **2 列目以降の本文セルの中**で，1 文の中の特定の語句を目立たせたいときだけにする．

### yaml2table の YAML 値で `` ` `` で始まる行を禁止

`.yaml2table` / `.yaml2grouptable` の YAML ブロックでは，**配列要素の値を `` ` `` (バックティック) で開始してはいけない**．YAML 1.2 仕様で `` ` `` と `@` は予約済み indicator のため，値の冒頭に置くと js-yaml が `bad indentation of a sequence entry` 等のパース失敗を出す．エラーは隠れた `<script>` レベルで起きるため，`quarto render` は通り，ブラウザコンソールに `pageerror` が出るまで気付きにくい．**`` `foo` `` と書きたい箇所は `<code>foo</code>` に置き換える**．`<code>` は CSS でインラインコードとして整形され見た目もほぼ同等．

```yaml
# NG ────────────────────────────────────────
record1:
  category: Bedrock
  actions:
    - `CLAUDE_CODE_USE_BEDROCK=1` + `AWS_REGION`     # 行頭が `` ` `` でパース失敗
    - `ANTHROPIC_API_KEY` を環境から外す             # 同上

# OK ────────────────────────────────────────
record1:
  category: Bedrock
  actions:
    - 環境変数 <code>CLAUDE_CODE_USE_BEDROCK=1</code> + <code>AWS_REGION</code>
    - <code>ANTHROPIC_API_KEY</code> を環境から外す  # 行頭が日本語/英数なら mid-string `` ` `` でも OK だが
                                                     # ハウス統一のため `<code>` を推奨
```

迷ったら **yaml2table の YAML 内では `` `…` `` を使わず `<code>…</code>` に統一**．Markdown 本文（フェンス div の中など）では `` `foo` `` のままで構わない — この制約は yaml2table の YAML 値に限る．

### yaml2table の列を垂直中央寄せ — `data-centered-cols`

`.yaml2table` には列ごとの**垂直中央寄せ**を宣言する属性 `data-centered-cols` がある．**`○`・`△`・`×` の判定列のように，隣の列に複数行の箇条書きが入り行高が縦に伸びるとき**，記号セルが上端に張り付くと視線移動が増えて読みづらい．`data-col-widths` と同じく**0-indexed の列番号を JSON 配列で渡す**と，対応する `<th>` と `<td>` に `vertical-align: middle;` が適用される（水平方向の整列は既存スタイルのまま変えない）．

使用例（属性のみ抜粋）：

```qmd
:::{.yaml2table .yaml2table-custom-top data-col-widths="[28, 12, 60]" data-centered-cols="[1]"}
```

- `data-centered-cols="[1]"` → 2 列目（`rule`）のみ垂直中央寄せ
- `data-centered-cols="[1, 2]"` → 2 列目と 3 列目を垂直中央寄せ
- 水平方向の整列は変えない（既存 CSS のまま）．水平中央寄せが必要ならセル内に `<div style="text-align:center">…</div>` で局所対応する
- 用途は **隣の列が縦に伸びるテーブルで，短いラベル・記号・数値の列を行の中央高さに揃える**こと．箇条書きが入る列に当てると `<ul>` 全体が中央高さで詰まるので避ける
- 実例：regmonkey-presentation repo の `posts/2026-05-25-git-development-flow/index.qmd` の「`develop` で許容するのは…」スライド（`○`／`△`／`×` の判定列を垂直中央寄せ）

---

## Index slide

`.regmonkey-index-slide` and `.regmonkey-index-slide-no-title` are slide-level classes (apply to the H2). They convert the slide layout to the indexed-table-of-contents pattern with sidebar + numbered sections.

```
## Index {.regmonkey-index-slide}

::::: {.columns}
:::: {.column width="30%"}
:::: {.sidebar}
::: {.sidebar-title}
本研修の目的
:::
:::{.sidebar-text}
本文...
:::
::::
::::
::: {.column width="70%"}
::: {.regmonkey_index style="width:1100px"}
\`\`\`yaml
regmonkey_index:
  title_fontsize: 1.3em
  bullet_fontsize: 0.85em
  numbering: true
  children:
    - title: 監視とは何か
      description:
        - 監視の定義・目的・スコープを整理する
      width: [48, 52]
\`\`\`
:::
:::
:::::
```

`.regmonkey_index` はモジュール同梱の `regmonkey_index_summary.js` が render 時に YAML をパースして HTML を生成する．YAML がデータ，見た目は JS 側で組まれる．

### `regmonkey_index` の YAML キー（重要・全網羅）

| キー | 型 | 既定値 | 用途 |
|---|---|---|---|
| `title_fontsize` | string | `1.5em` | 各 `title` の文字サイズ．`1.3em` が代表値． |
| `bullet_fontsize` | string | `0.85em` | `description` の bullet 文字サイズ．7-9 行のときは `0.85em` 程度が目安． |
| `title_position` | string | `0em` | title 列の左マージン上書き．通常は不要．widget 全体を右に寄せたいときに `1em` 等を指定． |
| `bullet_position` | string | `1em` | bullet 列の左マージン上書き．title と bullet の **間隔を詰めたい時に `0.5em` 等を指定**． |
| `numbering` | boolean | `false` | `true` で各 `title` 先頭に `1.` `2.` … を自動付与．**`title:` 側で `1. 監視とは` のように番号を手で書いてはいけない**（二重採番になる）．`numbering: true` のときの折返しは番号分の hanging-indent で左揃え（左寄せレイアウト）． |
| `children[].title` | string | 必須 | セクションのタイトル．`<br>` で強制改行可．`numbering: true` のとき先頭に番号は書かない． |
| `children[].description` | string\|list | 必須 | 各セクションの説明 bullet 群．文字列単一でも，list でも可． |
| `children[].width` | `[N, M]` | 必須 | `[title 列%, bullet 列%]`．例 `[48, 52]` で半々．**numbering: true でも title 列は番号分が flex 確保される**ので 48〜50% から始めて調整． |

**重要：** `title` と `description` の左右間隔が空きすぎると感じたら，`bullet_position: 0.5em` 等で詰める（既定 `1em`）．`width` だけ調整しても効かない場合がある．

`numbering: true` を使う場合の典型形：

```yaml
regmonkey_index:
  title_fontsize: 1.3em
  bullet_fontsize: 0.85em
  numbering: true            # 1. 2. 3. を自動付与
  bullet_position: 0.5em     # title と bullet の間を詰める
  children:
    - title: 監視とは何か    # 番号は書かない（自動で "1." が付く）
      description:
        - 監視の定義・目的・スコープを整理する
      width: [48, 52]
```

---

## Misc

| Class | Render | Use for |
|---|---|---|
| `.topleftbox` | Absolutely-positioned label at top-left of slide | Slide-type label like `[Goal Setting]{.topleftbox}` above an H2. |
| `.regmonkey-bold` | Color #206f83, bold ("McKinsey green") | Emphasis inline: `[強調]{.regmonkey-bold}`. |
| `.border-bottom` | Bottom border line | Section headers via inline span. |
| `.wrap-text` | Word-wrap rules | Force break long English/code in titles. |
