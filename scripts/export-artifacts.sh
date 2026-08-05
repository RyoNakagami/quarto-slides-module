#!/usr/bin/env bash
# 右上出力ボタン用のアーティファクト（decktape PDF・embed-resources HTML）を
# レンダリング済み site ディレクトリ内に生成する．
#
# 使い方（親プロジェクトのルートで，quarto render 完了後に実行）:
#   ./_slides/scripts/export-artifacts.sh [options] [deck-html ...]
#
# options:
#   --site-dir DIR   レンダリング済みサイト（default: _site）
#   --no-pdf         decktape PDF 生成をスキップ
#   --no-html        embed-resources HTML 生成をスキップ
#   deck-html        対象を限定する場合，site-dir 相対の html パス
#                    （例: posts/2026-06-16-computer-network/index.html）．
#                    省略時は frontmatter で `export-buttons: true` を宣言した
#                    デッキのみを自動検出（marker meta タグの有無で判定）
#
# 生成物（デッキ <base>.html に対して）:
#   <base>.pdf         decktape reveal によるPDF
#   <base>-embed.html  QUARTO_PROFILE=embed の再レンダリング（自己完結HTML）
#
# 前提:
#   - PDF: decktape + Chrome．（decktape が PATH に無ければ npx -y decktape を使用）
#   - HTML: プロジェクトに _quarto-embed.yml（無ければ本スクリプトが生成する．要コミット）
set -euo pipefail

SITE_DIR="_site"
DO_PDF=1
DO_HTML=1
DECKS=()
while [ "$#" -gt 0 ]; do
    case "$1" in
        --site-dir) SITE_DIR="$2"; shift 2 ;;
        --no-pdf)   DO_PDF=0; shift ;;
        --no-html)  DO_HTML=0; shift ;;
        -h|--help)  sed -n '2,22p' "$0"; exit 0 ;;
        *)          DECKS+=("$1"); shift ;;
    esac
done

ROOT="$(pwd)"
[ -d "$SITE_DIR" ] || { echo "ERROR: $SITE_DIR not found — run 'quarto render' first"; exit 1; }

# ---------- デッキ検出（export-buttons: true を宣言したデッキの marker） ----------
if [ "${#DECKS[@]}" -eq 0 ]; then
    while IFS= read -r f; do
        DECKS+=("${f#"$SITE_DIR"/}")
    done < <(grep -rl 'name="regmonkey-export-buttons"' "$SITE_DIR" --include='*.html' \
             | grep -v -- '-embed\.html$' | sort)
fi
if [ "${#DECKS[@]}" -eq 0 ]; then
    echo "no decks opted in (add 'export-buttons: true' to a deck's frontmatter). nothing to do."
    exit 0
fi
echo "target decks: ${#DECKS[@]}"

# ---------- embed-resources HTML ----------
if [ "$DO_HTML" = 1 ]; then
    if [ ! -f "_quarto-embed.yml" ]; then
        cat > "_quarto-embed.yml" <<'YAML'
# QUARTO_PROFILE=embed: 出力ボタン用の自己完結HTML生成プロファイル
# （_slides/scripts/export-artifacts.sh が使用．コミットしてください）
project:
  output-dir: _embed
embed-resources: true
format:
  slides-revealjs:
    chalkboard: false   # chalkboard plugin は self-contained 出力と非互換
YAML
        echo "created _quarto-embed.yml (commit this file)"
    fi
    echo "== rendering embed profile =="
    # デッキごとに対応する qmd（<base>.qmd）があれば個別レンダリング（高速），
    # 1つでも見つからなければサイト全体を embed プロファイルでレンダリング
    ALL_SOURCES_FOUND=1
    for d in "${DECKS[@]}"; do
        [ -f "${d%.html}.qmd" ] || { ALL_SOURCES_FOUND=0; break; }
    done
    if [ "$ALL_SOURCES_FOUND" = 1 ]; then
        for d in "${DECKS[@]}"; do
            QUARTO_PROFILE=embed quarto render "${d%.html}.qmd"
        done
    else
        QUARTO_PROFILE=embed quarto render
    fi
    for d in "${DECKS[@]}"; do
        src="_embed/${d}"
        dst="$SITE_DIR/${d%.html}-embed.html"
        [ -f "$src" ] || { echo "WARN: $src not found, skip"; continue; }
        cp "$src" "$dst"
        echo "html  $dst ($(du -h "$dst" | cut -f1))"
    done
fi

# ---------- decktape PDF ----------
if [ "$DO_PDF" = 1 ]; then
    CHROME_PATH="$(command -v google-chrome || command -v chromium-browser || command -v chromium || true)"
    [ -n "$CHROME_PATH" ] || { echo "ERROR: Chrome/Chromium not found"; exit 1; }
    if command -v decktape >/dev/null 2>&1; then DECKTAPE=(decktape); else DECKTAPE=(npx -y decktape); fi

    # 空きポートで一時サーバーを立てる
    PORT=$(python3 - <<'PY'
import socket
s = socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()
PY
)
    python3 -m http.server "$PORT" --directory "$ROOT/$SITE_DIR" >/dev/null 2>&1 &
    SERVER_PID=$!
    trap 'kill "$SERVER_PID" 2>/dev/null || true' EXIT
    sleep 1

    echo "== decktape via http://localhost:$PORT =="
    for d in "${DECKS[@]}"; do
        out="$SITE_DIR/${d%.html}.pdf"
        "${DECKTAPE[@]}" reveal "http://localhost:${PORT}/${d}" "$out" \
            --chrome-path "$CHROME_PATH" --size 1920x1080 \
            --chrome-arg=--force-color-profile=srgb \
            --chrome-arg=--no-sandbox \
            >/dev/null 2>&1 \
            && echo "pdf   $out ($(du -h "$out" | cut -f1))" \
            || echo "FAIL  $d (decktape error)"
    done
fi

echo "done."
