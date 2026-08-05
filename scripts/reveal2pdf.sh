#!/bin/bash

# A bash script to run decktape with fixed arguments for Quarto/Reveal.js output.
# Usage: ./<script_name> [--compress] <input_dir_or_name> <output_pdf_name>
#
# Options:
#   --compress    Post-process the PDF with Ghostscript to keep it under 1MB.
#                 Tries /ebook first, falls back to /screen if still too large.

# Parse flags
COMPRESS=0
POSITIONAL=()
while [ "$#" -gt 0 ]; do
    case "$1" in
        --compress)
            COMPRESS=1
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [--compress] <input_dir_or_name> <output_pdf_name>"
            exit 0
            ;;
        *)
            POSITIONAL+=("$1")
            shift
            ;;
    esac
done

# Check positional arguments
if [ "${#POSITIONAL[@]}" -ne 2 ]; then
    echo "Error: Two positional arguments are required."
    echo "Usage: $0 [--compress] <input_dir_or_name> <output_pdf_name>"
    exit 1
fi

INPUT_PATH="${POSITIONAL[0]}"
OUTPUT_NAME="${POSITIONAL[1]}"

# Define fixed arguments
CHROME_PATH=$(which google-chrome)
SIZE="1920x1080"
CHROME_ARG="--force-color-profile=srgb"

# Accept either a deck directory (append index.html), a direct .html path, or a URL
case "${INPUT_PATH}" in
    *.html|http://*|https://*) TARGET="${INPUT_PATH}" ;;
    *) TARGET="${INPUT_PATH}/index.html" ;;
esac

# Construct the full command
COMMAND="decktape reveal ${TARGET} ${OUTPUT_NAME} --chrome-path ${CHROME_PATH} --size ${SIZE} --chrome-arg=${CHROME_ARG}"

echo "Starting Decktape conversion for: ${TARGET}"
echo "Output file: ${OUTPUT_NAME}"
echo "--------------------------------------------------------"

# Execute the command
eval "$COMMAND"

# Check the exit status of the decktape command
if [ $? -ne 0 ]; then
    echo "--------------------------------------------------------"
    echo "❌ Error: Decktape failed to convert the presentation."
    exit 1
fi

echo "--------------------------------------------------------"
echo "✅ Success: Presentation converted to ${OUTPUT_NAME}"

# Optional: compress with Ghostscript to hit < 1MB target
if [ "$COMPRESS" -eq 1 ]; then
    if ! command -v gs >/dev/null 2>&1; then
        echo "❌ Error: ghostscript (gs) is not installed; cannot compress."
        echo "    Install with: sudo apt install ghostscript"
        exit 1
    fi

    TARGET_BYTES=1048576  # 1MB
    BEFORE_SIZE=$(stat -c%s "$OUTPUT_NAME")
    BEFORE_HUMAN=$(numfmt --to=iec --suffix=B "$BEFORE_SIZE")

    echo "--------------------------------------------------------"
    echo "Compressing PDF (target: < 1MB)..."
    echo "Before: ${BEFORE_HUMAN}"

    TMP_PDF=$(mktemp --suffix=.pdf)
    trap 'rm -f "$TMP_PDF"' EXIT

    run_gs() {
        local preset="$1"
        gs -sDEVICE=pdfwrite \
           -dCompatibilityLevel=1.4 \
           -dPDFSETTINGS="/${preset}" \
           -dDetectDuplicateImages=true \
           -dCompressFonts=true \
           -dEmbedAllFonts=true \
           -dSubsetFonts=true \
           -dNOPAUSE -dQUIET -dBATCH \
           -sOutputFile="${TMP_PDF}" "${OUTPUT_NAME}"
    }

    # Tier 3: /screen + low-DPI forced JPEG re-encoding
    run_gs_aggressive() {
        local res="$1"
        gs -sDEVICE=pdfwrite \
           -dCompatibilityLevel=1.4 \
           -dPDFSETTINGS=/screen \
           -dDetectDuplicateImages=true \
           -dCompressFonts=true \
           -dEmbedAllFonts=true \
           -dSubsetFonts=true \
           -dColorImageDownsampleType=/Bicubic -dColorImageResolution="${res}" \
           -dGrayImageDownsampleType=/Bicubic  -dGrayImageResolution="${res}" \
           -dMonoImageDownsampleType=/Subsample -dMonoImageResolution=300 \
           -dAutoFilterColorImages=false -dColorImageFilter=/DCTEncode \
           -dAutoFilterGrayImages=false  -dGrayImageFilter=/DCTEncode \
           -dNOPAUSE -dQUIET -dBATCH \
           -sOutputFile="${TMP_PDF}" "${OUTPUT_NAME}"
    }

    # Tier 1: /ebook (≈150 dpi, near-lossless for slides)
    run_gs ebook
    SIZE_NOW=$(stat -c%s "$TMP_PDF")
    USED_PRESET="ebook"

    # Tier 2: /screen (≈72 dpi, more aggressive)
    if [ "$SIZE_NOW" -gt "$TARGET_BYTES" ]; then
        echo "  → /ebook still over 1MB, retrying with /screen..."
        run_gs screen
        SIZE_NOW=$(stat -c%s "$TMP_PDF")
        USED_PRESET="screen"
    fi

    # Tier 3: /screen + 50 dpi + forced JPEG (notable quality drop on screenshots)
    if [ "$SIZE_NOW" -gt "$TARGET_BYTES" ]; then
        echo "  → /screen still over 1MB, retrying with 50dpi forced JPEG..."
        run_gs_aggressive 50
        SIZE_NOW=$(stat -c%s "$TMP_PDF")
        USED_PRESET="screen+50dpi-jpeg"
    fi

    # Tier 4: 36 dpi forced JPEG (last resort — visibly lossy)
    if [ "$SIZE_NOW" -gt "$TARGET_BYTES" ]; then
        echo "  → still over 1MB, retrying with 36dpi forced JPEG (last resort)..."
        run_gs_aggressive 36
        SIZE_NOW=$(stat -c%s "$TMP_PDF")
        USED_PRESET="screen+36dpi-jpeg"
    fi

    mv "$TMP_PDF" "$OUTPUT_NAME"
    AFTER_HUMAN=$(numfmt --to=iec --suffix=B "$SIZE_NOW")

    echo "After:  ${AFTER_HUMAN}  (preset: /${USED_PRESET})"

    if [ "$SIZE_NOW" -gt "$TARGET_BYTES" ]; then
        echo "⚠️  Warning: Final size still exceeds 1MB even at 36dpi forced JPEG."
        echo "    Likely cause: many large embedded images or vector content."
        echo "    Inspect with: pdfimages -list \"${OUTPUT_NAME}\""
    else
        echo "✅ Compressed to under 1MB."
    fi
fi
