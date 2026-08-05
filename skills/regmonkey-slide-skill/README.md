# regmonkey-slide-skill

`regmonkey-presentation` リポジトリ専用の Quarto + RevealJS スライド作成 Skill．Claude Code が独自 CSS デザインシステム（`info-box`，`pentagon-box`，`square-box`，`shannon-model` 等）と house writing rule に沿ってスライドを書けるようにする．

## このSkillが解決する問題

スライド `.qmd` を書くたびに発生していた手間を Claude Code 側に押し込める：

- frontmatter の `filters` 設定を毎回コピペ
- `pentagon-box-500` / `square-box-500` のフェンス div の colon 数で混乱
- `regmonkey-bold` / `mini-section` / `h2-submessage` の使い分けが曖昧
- 既存 deck と見た目が揃わない

これらを Claude Code が**自動で**正しく解決する．

## ディレクトリ構成

```text
regmonkey-slide-skill/
├── skill.toml              # skilltool マニフェスト
├── SKILL.md                # Claude が読み込む指示書（本体）
├── README.md               # このファイル（人間向け）
├── references/             # 詳細リファレンス（必要時のみ Claude が参照）
│   ├── components.md       # CSS コンポーネント一覧
│   ├── patterns.md         # スライドレベルのパターン集
│   └── utilities.md        # ユーティリティクラス一覧
└── templates/              # コピペ起点のテンプレート
    ├── info-box-bullets.qmd
    ├── status-boxes.qmd
    └── yaml-frontmatter.txt
```

## インストール方法

### A. プロジェクトスキルとして使う（推奨）

このリポジトリ内の `.claude/skills/regmonkey-slide-skill/` に配置済み．Claude Code がこのリポジトリ直下で起動されたとき，自動的に発見される．追加の作業は不要．

### B. 個人スキルとして全プロジェクトで使う

```bash
cp -r .claude/skills/regmonkey-slide-skill ~/.claude/skills/
```

### C. skilltool で publish

```bash
skilltool publish .claude/skills/regmonkey-slide-skill/
```

## 自動ロードのトリガー

ユーザーが以下のような発話をすると，Claude Code が `skill.toml` の `description` とマッチさせて自動的に Skill を読み込む：

- 「スライド作って」「`.qmd` 書いて」「deck に新しいページ追加」
- 「対比で見せて」「AS-IS / TO-BE で」
- 「`pentagon-box` / `square-box` / `hop-step-jump` / `info-box` で」
- 「summary スライドを足して」「セクション扉を作って」

ロードされると Claude Code のターミナルに `Skill(regmonkey-slide-skill)` が表示される．これが見えないときは `description` のキーワードと依頼文が合っていない可能性が高い．

## カスタマイズ

### 新しいテンプレートを追加

1. テンプレート `.qmd` を `templates/` に置く
2. `SKILL.md` の「テンプレートを起点にする」表に行を追加
3. `skill.toml` の `version` を上げる（SemVer に従う）

### 新しい CSS パターンを追加

1. regmonkey-quarto-slides の `_extensions/regmonkey/slides/scss/_*.scss` に新クラスを追加（既存命名規則 `-400` / `-500` 等のサフィックスに従う）
2. `references/components.md` にクラスの説明を追記
3. 必要なら `templates/` に対応する `.qmd` を追加

### `description` の調整

Claude が誤発火する／不発火するときは `skill.toml` の `description` を更新する．具体的なキーワード（「対比」「summary」など）を含めるほどマッチ精度が上がる．

## トラブルシューティング

| 症状 | 原因 | 対応 |
|---|---|---|
| Claudeが Skill を読まない | `description` のキーワードと依頼が不一致 | `skill.toml` の `description` を具体化 |
| `:::` のフェンスエラー | colon 数が階層と不一致 | `templates/` のテンプレートをコピペし直す |
| `{{< fas >}}` がそのまま表示 | `regmonkey_slide_editing` フィルタが未指定 | frontmatter の `filters` に追加 |
| 画像が表示されない | パスが絶対 / 不正 | deck ディレクトリ内に置き相対パスで参照 |
| `pentagon-box-450` が無効 | 存在しないサイズバリアント | `-400` か `-500` を使う |

## ライセンス

親リポジトリ `regmonkey-presentation` の LICENSE に従う．
