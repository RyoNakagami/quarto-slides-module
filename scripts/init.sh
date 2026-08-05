#!/usr/bin/env bash
# regmonkey-quarto-slides: 親プロジェクトの scaffolding（冪等）
#
# 使い方（親プロジェクトのルートで実行）:
#   git submodule add <url> _slides
#   ./_slides/scripts/init.sh [--copy] [--force] [--check]
#
# オプション:
#   --copy   symlink の代わりにコピーを配置（Windows / symlink 不可環境向け）．
#            コピーは submodule 更新時に古くなるため，更新後は --force で再実行すること
#   --force  既存の生成物（symlink/コピー）を作り直す
#   --check  doctor モード: 配線の欠落を明示的に検査して終了（何も書き込まない）
#
# 生成物（コミットする）:
#   _extensions -> <submodule>/_extensions   (symlink)
#   _quarto.yml, notebook/_metadata.yml, notebook/example.qmd   (無い場合のみ雛形から)
#   .claude/skills/{regmonkey-slide-skill,regmonkey-slide-checker}   (symlink)
#   .vscode/custom.code-snippets   (コピー)
set -euo pipefail

MODE=link; CHECK=0; FORCE=0
for a in "$@"; do
    case "$a" in
        --copy) MODE=copy ;;
        --check) CHECK=1 ;;
        --force) FORCE=1 ;;
        -h|--help) sed -n '2,20p' "$0"; exit 0 ;;
        *) echo "Unknown option: $a"; exit 1 ;;
    esac
done

SELF="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"   # submodule root
ROOT="$(pwd)"
case "$SELF" in
    "$ROOT"/*) SUB_REL="${SELF#"$ROOT"/}" ;;
    *) echo "ERROR: run this from the parent project root (submodule must live inside it)"; exit 1 ;;
esac

# Quarto は `_` 始まりディレクトリを入力探索から除外する．submodule のマウント名が
# `_` 始まりでないと submodule 内の template/*.qmd 等が親プロジェクトでレンダリングされる．
case "$(basename "$SUB_REL")" in
    _*) : ;;
    *) echo "WARN: submodule dir '$SUB_REL' should start with '_' (recommended mount: _slides)."
       echo "      Otherwise Quarto renders qmd files inside the submodule." ;;
esac

# ---------- doctor mode ----------
check() {
    local ok=0
    [ -f "$SUB_REL/_extensions/regmonkey/slides/_extension.yml" ] \
        || { echo "FAIL: submodule not initialized (run: git submodule update --init)"; ok=1; }
    [ -e "_extensions" ] \
        || { echo "FAIL: _extensions missing at project root (run: ./$SUB_REL/scripts/init.sh)"; ok=1; }
    if [ -e "_extensions" ] && [ ! -L "_extensions" ]; then
        # copy mode: detect drift against the submodule
        if ! diff -rq "_extensions" "$SUB_REL/_extensions" >/dev/null 2>&1; then
            echo "FAIL: _extensions copy has drifted from $SUB_REL/_extensions (re-run init.sh --copy --force)"; ok=1
        fi
    fi
    [ -f "_quarto.yml" ] || { echo "FAIL: _quarto.yml missing"; ok=1; }
    [ -f "notebook/_metadata.yml" ] || echo "WARN: notebook/_metadata.yml missing (decks won't pick up slides-revealjs)"
    grep -q "slides-revealjs" notebook/_metadata.yml 2>/dev/null \
        || echo "WARN: notebook/_metadata.yml does not declare format: slides-revealjs"
    [ "$ok" -eq 0 ] && echo "OK: wiring looks good"
    return $ok
}
if [ "$CHECK" = 1 ]; then check; exit $?; fi

# ---------- install helpers ----------
install_entry() {  # $1 = path inside submodule, $2 = destination
    if [ -e "$2" ] || [ -L "$2" ]; then
        if [ "$FORCE" = 0 ]; then echo "skip    $2 (exists)"; return; fi
        rm -rf "$2"
    fi
    if [ "$MODE" = link ]; then
        ln -s "$SUB_REL/$1" "$2"
    else
        cp -r "$SUB_REL/$1" "$2"
    fi
    echo "install $2 -> $SUB_REL/$1 ($MODE)"
}

scaffold() {  # $1 = template path inside submodule, $2 = destination
    if [ -f "$2" ]; then echo "skip    $2 (exists)"; return; fi
    mkdir -p "$(dirname "$2")"
    sed "s|@SLIDES@|$SUB_REL|g" "$SELF/$1" > "$2"
    echo "create  $2"
}

# ---------- 1. _extensions at project root ----------
install_entry _extensions _extensions

# ---------- 2. starter config ----------
scaffold templates-project/_quarto.yml            _quarto.yml
scaffold templates-project/notebook/_metadata.yml notebook/_metadata.yml
scaffold templates-project/notebook/example.qmd   notebook/example.qmd

# ---------- 3. authoring assets (optional but recommended) ----------
mkdir -p .claude/skills .vscode
for s in regmonkey-slide-skill regmonkey-slide-checker; do
    if [ ! -e ".claude/skills/$s" ]; then
        if [ "$MODE" = link ]; then
            ln -s "../../$SUB_REL/skills/$s" ".claude/skills/$s"
        else
            cp -r "$SUB_REL/skills/$s" ".claude/skills/$s"
        fi
        echo "install .claude/skills/$s ($MODE)"
    fi
done
if [ ! -f ".vscode/custom.code-snippets" ]; then
    cp "$SELF/.vscode/custom.code-snippets" .vscode/custom.code-snippets
    echo "create  .vscode/custom.code-snippets"
fi

# ---------- 4. .gitignore hygiene ----------
touch .gitignore
for line in "/_site/" "/.quarto/" "_freeze/" "node_modules/"; do
    grep -qxF "$line" .gitignore || { echo "$line" >> .gitignore; echo "gitignore += $line"; }
done

echo ""
check || true
echo ""
echo "Done. Commit these: _extensions _quarto.yml notebook/ .claude/ .vscode/ .gitignore"
echo "PPTX export needs:  (cd $SUB_REL && npm install)"
