# Slide-level patterns

Components (in `components.md`) are building blocks. Patterns are the recurring slide *types* the repo uses to tell a story. When a user asks "create a Summary slide" or "an Abstract" or "an AS-IS / TO-BE comparison", they're asking for a pattern, not a component — multiple components arranged in a known way.

## Patterns covered

1. [Title slide & section opener](#1-title-slide--section-opener) — meta-data slide
2. [Index / table of contents](#2-index--table-of-contents)
3. [Summary slide (message-card)](#3-summary-slide-message-card)
4. [Abstract / IMRaD slide](#4-abstract--imrad-slide)
5. [Goal Setting (AS-IS × TO-BE / 課題 × ソリューション)](#5-goal-setting-as-is--to-be--課題--ソリューション)
6. [Concept / definition explanation](#6-concept--definition-explanation)
7. [Process / progression (hop-step-jump)](#7-process--progression-hop-step-jump)
8. [Three-keypoint horizontal](#8-three-keypoint-horizontal)
9. [Tools-grid analysis summary](#9-tools-grid-analysis-summary)
10. [Book / reference introduction](#10-book--reference-introduction)
11. [Gantt / timeline slide](#11-gantt--timeline-slide)

For every pattern, an `assets/templates/*.qmd` file may exist as a copy-and-edit starting point. Prefer that over typing from scratch.

---

## 1. Title slide & section opener

**Use when**: opening a chapter, or marking a major topic shift mid-deck.

**Template**: `assets/templates/meta-data-slide.qmd`

**Anatomy**:
- Three-column row at top: `対象者` (Biz / DS / Dev checkboxes) · `難易度` (★ rating) · `キーワード` (tags)
- `Key Takeaways` section below with bullets

**Why this exists**: lecture-style decks need a "who / how-hard / about-what" front matter on each major section. The meta-data slide is that front matter rendered consistently.

In Quarto Reveal.js, a single `#` heading creates a section title slide automatically. Use `#` for the section, then a meta-data-slide as the first `##` inside, then content `##` slides after.

---

## 2. Index / table of contents

**Use when**: the deck is long enough that a structural overview helps, or the user explicitly wants an index/agenda.

**Template**: `assets/templates/meta-data-slide.qmd` (for the chapter version) or write inline (for the index slide proper)

**Anatomy**:
- H2 with the slide-level class: `## Index {.regmonkey-index-slide}`
- Left column (~30% width): `.sidebar` with `.sidebar-title` + `.sidebar-text` — short context paragraph
- Right column (~70% width): `.regmonkey_index` div containing a YAML block — JS converts it to numbered sections at render time

```
## Index {.regmonkey-index-slide}

::::: {.columns}
:::: {.column width="30%"}
:::: {.sidebar}
::: {.sidebar-title}
本研修の目的
:::
:::{.sidebar-text}
背景パラグラフ。
:::
::::
::::
::: {.column width="70%"}
::: {.regmonkey_index style="width:1100px"}
\`\`\`yaml
regmonkey_index:
  title_fontsize: 1.3em
  bullet_fontsize: 0.7em
  children:
    - title: 1. 分析目的
      description:
        - 都市化とエネルギー需要の増加は気候変動と密接に関係
        - 既存研究は北米・欧州の主要都市が中心
      width: [28, 72]
    - title: 2. 分析手法
      description:
        - 対象 — 東京・大阪・福岡の3都市
        - 手法 — ARIMA + XGBoost
      width: [28, 72]
\`\`\`
:::
:::
:::::
```

Notes: the `regmonkey_index` YAML must be raw inside a fenced code block; the JS plugin parses it. `width: [28, 72]` is the title-vs-description column ratio.

### Variant: Lecture-style index (top page of a lecture deck)

**Use when**: building the *front page* of a lecture/training deck and you want to communicate, alongside the table of contents, the lecture's **target level**, **prerequisite knowledge**, and **required environment**.

**Template**: `assets/templates/lecture-index-slide.qmd`

**Anatomy**:
- H2 with `.regmonkey-index-slide-no-title` (suppresses the visible H2 title)
- Left column (~30%): `.sidebar` containing **3 stacked `.component-card-index` cards**
  - Card 1 — `{{< bi person >}}` + `### 対象レベル`: who the lecture is for
  - Card 2 — `{{< bi book >}}` + `### 前提知識`: required background knowledge
  - Card 3 — `{{< bi terminal >}}` + `### 必要環境`: tooling / runtime requirements
- Right column (~70%): `.regmonkey_index` YAML block (same as the basic index variant) listing chapters

```
## Index {.regmonkey-index-slide-no-title}

::::: {.columns}
{{< reveal_vspace 3em >}}
:::: {.column width="30%"}
:::: {.sidebar}
::::{.component-card-index .pl-4 .pr-4 .pt-1 .pb-6 .border-blue-500}
:::{.flex .items-center .mb-2}
{{< bi person size=1.7em color=#428CE6 >}}
### 対象レベル
:::
- 想定する受講者像を1〜2行で
::::
... (book / terminal cards follow the same shape) ...
::::
::::
::: {.column width="70%" style="padding-left:1em;"}
::: {.regmonkey_index style="width:1100px"}
\`\`\`yaml
regmonkey_index:
  ...chapters...
\`\`\`
:::
:::
:::::
```

Notes:
- Use `.regmonkey-index-slide-no-title` (not `.regmonkey-index-slide`) so the H2 text doesn't render — the visual is built entirely from the sidebar cards and the right-column YAML.
- The 3 sidebar cards are **fixed in role** (受講者像・前提・環境). If a lecture genuinely needs a different trio, change the icons and headings — but keep the 3-card cadence; CSS spacing assumes it.

---

## 3. Summary slide (message-card)

**Use when**: opening a deck with the takeaways, or recapping a section. The single most-used pattern in the repo.

**Template**: `<module>/template/message-card.qmd`

**Anatomy**:
- 3–5 `.message-card` blocks stacked vertically, separated by `{{< reveal_vspace 0.6em >}}`
- each card = `.message-card-title-no-margin .center` (紺色見出しバー) + `.message-card-body .squaredmark` (bullets)

```
::::{.message-card .position-left-05 .font-08}

:::{.message-card-title-no-margin .center}

サブテイクアウェイのラベル

:::

:::{.message-card-body .squaredmark .font-08}

- 本文 bullet
- 本文 bullet

:::

::::

{{< reveal_vspace 0.6em >}}

... more cards ...
```

The `## Summary` H2 is the slide title. Each card is one sub-takeaway, headlined by its title bar, supported by 1–2 bullets. **One sentence per bullet maximum**; if a thought needs two sentences, the slide has too many cards.

Pattern variant — `.info-box` instead of `.message-card`:

```
::::{.summary-container style="font-size:1em;"}

:::: {.info-box}

[① モデル面]{.info-box-title}

::: {.info-contents}
- 精度・複雑性が再現必要なほど高くなかった
- 物理モデルと回帰モデルの入力フィールドが大きく異なっていた
:::

::::

{{< reveal_vspace 1em >}}

:::: {.info-box}

[② 体制面]{.info-box-title}

::: {.info-contents}
- 物理モデルの仕様書共有ができなかった
- ヒアリング経由でしか仕様を確認できなかった
:::

::::

::::
```

**ルール:** `[...]{.info-box-title}` の行は[**上下に必ず空行を入れる**]．直前・直後の `:::` フェンスとくっつくと Pandoc が span として認識できず，タイトルがレンダリングされない（または info-contents の中身に飲み込まれる）．番号は `①②③④⑤⑥⑦⑧⑨⑩` を使う．

Use `.message-card` when summarizing the *deck*. Use numbered `.info-box` when summarizing *findings* (where the order matters).

### Variant: yaml2table 3-column summary (category × rule × actions)

**Use when**: deck の各セクションが「**原則 + それを満たすための具体的アクション**」というセットで束ねられるとき．message-card の bullet 列挙より構造化したい，アクションが3つ以上ある，原則とアクションを明示的に区別したい場合に向く．

**Template**: `templates/summary-yaml2table.qmd`

**Anatomy**:
- `.custom-table` ラッパー + `.yaml2table` 内部．`data-col-widths="[15, 30, 55]"` で 3 列の幅を指定（合計 100）
- 各 `recordN` が 1 行．`category` / `rule` / `actions` の 3 キーを必ず持つ
- `category`：そのセクション・トピックの短いラベル．長いものは `<br>` で改行
- `rule`：単一の主原則を 1 文で．list-of-1 形式（`rule:` 直下に `- <文>`）にすると yaml2table がレンダリングを揃えやすい
- `actions`：主原則を満たすための具体アクション．**プロセス・手順として読める粒度**にする（「〜する」「〜を実行する」）
- 値の中で強調は `<span class="regmonkey-bold">...</span>`，コード断片は `<code>...</code>` を使う

**Recommended rules（推奨ルール．守ると読みやすい）**:
- **rule は 1 文・1 主張．** 複数主張になりそうなら record を分ける
- **actions はプロセスが明確な動詞句．** 「〜する」「〜で〜する」のように，読み手がそのまま実行に移せる粒度
- **文字数とのトレードオフを意識．** 5 record × 3 actions が上限の目安．actions が 3 を超える record があるならスライド分割を検討
- **category は short label．** 7 文字以内が望ましい．長くなる場合は `<br>` で 2 行に割る

Example:

```
::::{.custom-table style="width:100%; height:80%; font-size: 0.9em !important;"}
:::{.yaml2table .yaml2table-custom-top #yaml-tidy-table data-col-widths="[15, 30, 55]"}

```yaml
record1:
  category: メタデータ
  rule:
    - name と description が必須．残りはオプションで<span class="regmonkey-bold">段階的に拡張</span>する
  actions:
    - name は最大 64 文字．小文字・数字・ハイフンのみ
    - description は最大 1024 文字．非空
    - 必要に応じて compatibility・allowed-tools・model を活用

record2:
  category: バリデーション
  rule:
    - 公開前に<span class="regmonkey-bold">skills-ref validate</span>で機械チェック
  actions:
    - <code>skills-ref validate ./my-skill</code> を CI に組み込む
    - frontmatter のスキーマ準拠と include 整合を確認
    - 壊れた Skill をマージ前にブロック
``\`

:::
::::
```

（注：上の例では markdown の入れ子コードフェンスを示すために最後の閉じフェンスを `` ``\` `` でエスケープしている．実物では普通の三連バッククォートを使う．）

**3 つの Summary バリアントの使い分け**:
- `.message-card` — deck 全体・テイクアウェイの羅列（一番シンプル）
- 番号付き `.info-box` — 順序のある findings の要約
- yaml2table 3 列 — 原則とアクションを構造化して並べたいとき（このバリアント）

---

## 4. Abstract / IMRaD slide

**Use when**: a research/analysis report's abstract — single slide that says "here's what we did, how, what we found, why it matters".

**Template**: see `posts/2025-10-10-abstract-slide/index.qmd` in the regmonkey-presentation repo (no template file; copy from there)

**Anatomy**:
- Top: `.info-box` with the rule for what an abstract is (optional but recommended)
- `[IMRaD方式のAbstract構成要素]{.mini-section}` divider
- 4-column row, each column is a `.horizontal-keypoints-block`:
  1. **背景・目的** — why this analysis, with `{{< bi signpost-fill >}}`
  2. **分析手法** — design, data, statistical methods, with `{{< bi graph-up >}}`
  3. **分析結果** — main findings, with `{{< bi bar-chart-fill >}}`
  4. **結論・意義** — what it means, with `{{< bi check2-circle >}}` or similar
- Last column uses `.horizontal-keypoints-block-no-border` to drop the right separator

Each column's bullets answer one structural question:
- 背景: 何に取り組んだ・なぜこの分析を行うのか
- 手法: どのように分析を行ったのか
- 結果: 何が分かったのか
- 意義: 何が新しい・誰に価値があるのか

---

## 5. Goal Setting (AS-IS × TO-BE / 課題 × ソリューション)

**Use when**: framing the problem the analysis/proposal addresses. The signature contrast slide.

**Template**: `assets/templates/pentagon-squared-box.qmd`

**Anatomy**:
- H2 states the goal as one sentence (the conclusion the slide argues for)
- `[Goal Setting]{.topleftbox}` or `[Solution提案]{.topleftbox}` slide-type label
- Two-column row: pentagon-box (left, problem) × square-box (right, response)

```
## モデル管理の自動化、及び過去のモデルも容易に再デプロイできる開発体制をMLflow導入により実現
[Goal Setting]{.topleftbox}

{{< reveal_vspace 1em >}}

:::::: {.columns}
::::: {.column width="50%"}
::::{.pentagon-box-700}
:::{.border-bottom-header-left}
AS-IS（現状）
:::
:::{.squaredmark style="font-size: 0.9em"}
- ① 実機テスト環境が市場条件を十分に再現できない
  - 実稼働環境では不具合が顕在化するリスク
- ② パラメータ調整が手作業で非効率
  - 調整作業に時間がかかり開発サイクルが長期化
:::
::::
:::::
::::: {.column width="50%"}
::::{.square-box-700}
:::{.border-bottom-header-left}
TO-BE（デジタルツイン導入後）
:::
:::{.squaredmark style="font-size: 0.9em"}
- ① **デジタルツイン環境構築**
  - 実市場に近い動的条件でシミュレーション可能
  - **効果**: 市場投入後の不具合低減・試験工数削減
- ② **パラメータ最適化アルゴリズムの導入**
  - ML・PIML による効率的な条件探索
  - **効果**: 調整時間短縮・開発リードタイム圧縮
:::
::::
:::::
::::::
```

Variations on the side labels:
- `課題` × `対応` — generic
- `AS-IS` × `TO-BE` — system/process change
- `Before` × `After` — outcome change
- `現状` × `理想` — design/architecture
- `課題` × `分析ソリューション` — research proposal

In every case, the **left** is the problem state and the **right** is the answer. The pentagon's right-pointing arrow is delivering the problem to the answer.

Sometimes the bullets on each side are numbered ① ② ③ and correspond 1-to-1 (the right's ① answers the left's ①). When you do this, make the correspondence clean — don't reorder, don't merge.

---

## 6. Concept / definition explanation

**Use when**: introducing a term, framework, or concept that the rest of the deck builds on.

**Template**: `assets/templates/concept-explanation.qmd`

**Anatomy**:
- `.def-block` at top with `.def-title` (the term) and `.def-contents` (the definition)
- Two-column row below for **目的** (purpose) and **構造** (structure), separated by `[**目的**]{.border-bottom}` style headers

The definition above; the explanation below in two angles.

---

## 7. Process / progression (hop-step-jump)

**Use when**: three escalating stages, levels, or phases. Strict left-to-right reading.

**Template**: `assets/templates/hop-step-jump.qmd`

See [components.md → hop-step-jump-container](components.md#stage--phase-blocks) for the markup. Pattern-level guidance:

- Three steps. If you have four, split into two slides — `hop-step-jump` is shaped for three.
- Each step's `.step-title` is a verb-phrase: "分析ができる", "分析を構想できる", "PJを推進できる". Not a noun-label.
- Color tone darkens left → right. The visual asymmetry implies "growth/progression".

---

## 8. Three-keypoint horizontal

**Use when**: three independent (not escalating) observations, each gets equal weight.

**Template**: `assets/templates/three-horizontal-points.qmd`

Three `.column` of width 33.3%, each containing a `.horizontal-keypoints-block`. The third uses `.horizontal-keypoints-block-no-border` to drop the right separator.

Difference from hop-step-jump: hop-step-jump implies *progression* (1→2→3); three-horizontal-points implies *parallel observations* (independent A, B, C).

---

## 9. Tools-grid analysis summary

**Use when**: 4-quadrant analysis summary — typically 背景/課題 × スコープ/結果.

**Template**: `assets/templates/analysis-summary.qmd`

**Anatomy**:
- `.tools-grid` (2-column CSS grid)
- Left `.tools-column`: 背景・課題 with `.border-bottom-header` + 2 cards (`.component-card-for-analysis-summary`)
- Right `.tools-column`: 実施内容 with another header + 2 cards
- Each card has a Bootstrap icon + H3 + bullet body

Cards in this layout are smaller than a full slide section, so each one's content should be 2–4 short bullets only. If you need more, use the IMRaD abstract pattern (#4) instead.

---

## 10. Book / reference introduction

**Use when**: presenting a referenced book or paper.

**Template**: `assets/templates/book-template.qmd`

**Anatomy**:
- Two-column row
- Left `.column.book-image`: cover image
- Right `.column.book-info`: H3 `書籍情報` (metadata bullets) + H3 `この本の内容` (synopsis bullets)

---

## 11. Gantt / timeline slide

**Use when**: project plan, phases over time, or showing a methodological timeline.

**Reference example**: `posts/2025-05-27-slide-with-gannt-chart/index.qmd` (regmonkey-presentation repo)

The module bundles `regmonkey_gantt_chart.js` (format extension assets) which renders Gantt charts from YAML. Mermaid `gantt` blocks also work and are simpler — enable Mermaid in the project `_quarto.yml` (`gantt: true`). Use Mermaid first; reach for the JS plugin only when Mermaid's customization isn't enough.

```
\`\`\`{mermaid}
gantt
    title 分析プロジェクトのタイムライン
    dateFormat YYYY-MM-DD
    section データ取得・整備
    要件定義       :a1, 2025-04-01, 14d
    データ抽出     :a2, after a1, 21d
    section モデリング
    ベースライン   :b1, after a2, 14d
    本番モデル     :b2, after b1, 30d
\`\`\`
```

---

## Pattern selection guide

| User's request shape | Pattern |
|---|---|
| 「1枚目に要約を入れたい」 | #3 Summary |
| 「分析の概要を1枚で」 | #4 Abstract / IMRaD |
| 「課題と対応を並べたい」「AS-IS / TO-BE」 | #5 Goal Setting |
| 「概念の定義から始めたい」 | #6 Concept |
| 「ジュニア・ミドル・シニア」「フェーズ1・2・3」 | #7 hop-step-jump |
| 「3つの観点を並べる」 | #8 three-horizontal-points |
| 「分析の4要素サマリー」 | #9 tools-grid |
| 「目次・章立て」 | #2 Index |
| 「セクションの扉」 | #1 meta-data |
| 「参考書籍紹介」 | #10 book |
| 「プロジェクトのスケジュール」 | #11 Gantt |
