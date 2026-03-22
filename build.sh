#!/bin/bash
# ══════════════════════════════════════════════════════════════
# NO QUARTER — Build Script
# Generates EPUB, PDF, DOCX, and HTML from Markdown source
# Usage: bash build.sh [epub|pdf|docx|html|all]
# ══════════════════════════════════════════════════════════════

set -e

PANDOC="C:/Users/Administrator/AppData/Local/Pandoc/pandoc.exe"
MANUSCRIPT="manuscript"
OUTPUT="output"
METADATA="$MANUSCRIPT/metadata.yaml"

# Ensure output directory exists
mkdir -p "$OUTPUT"

# Build the ordered file list
FILES=(
  "$MANUSCRIPT/00-front-matter.md"
  "$MANUSCRIPT/ch00-prevention.md"
  "$MANUSCRIPT/ch01-triage.md"
  "$MANUSCRIPT/ch02-go-bag.md"
  "$MANUSCRIPT/ch03-prepositioning.md"
  "$MANUSCRIPT/ch04-night-one.md"
  "$MANUSCRIPT/ch05-orientation.md"
  "$MANUSCRIPT/ch06-shelter-system.md"
  "$MANUSCRIPT/ch07-vehicle-living.md"
  "$MANUSCRIPT/ch08-outside.md"
  "$MANUSCRIPT/ch09-couch-surfing.md"
  "$MANUSCRIPT/ch10-food.md"
  "$MANUSCRIPT/ch11-water-hygiene.md"
  "$MANUSCRIPT/ch12-sleep.md"
  "$MANUSCRIPT/ch13-income.md"
  "$MANUSCRIPT/ch14-benefits.md"
  "$MANUSCRIPT/ch15-panhandling.md"
  "$MANUSCRIPT/ch16-legal.md"
  "$MANUSCRIPT/ch17-physical-health.md"
  "$MANUSCRIPT/ch18-mental-health.md"
  "$MANUSCRIPT/ch19-violence.md"
  "$MANUSCRIPT/ch20-populations.md"
  "$MANUSCRIPT/ch21-phone-alive.md"
  "$MANUSCRIPT/ch22-phone-tool.md"
  "$MANUSCRIPT/ch23-survival-kit.md"
  "$MANUSCRIPT/ch24-water-power-heat.md"
  "$MANUSCRIPT/ch25-urban-improvisation.md"
  "$MANUSCRIPT/ch26-prioritizing-exit.md"
  "$MANUSCRIPT/ch27-getting-housed.md"
  "$MANUSCRIPT/ch28-staying-housed.md"
  "$MANUSCRIPT/ch29-best-worst-places.md"
  "$MANUSCRIPT/ch30-climate-zones.md"
  "$MANUSCRIPT/ch31-legal-landscapes.md"
  "$MANUSCRIPT/ch32-your-brain.md"
  "$MANUSCRIPT/ch33-identity.md"
  "$MANUSCRIPT/ch34-traps.md"
  "$MANUSCRIPT/ch35-resilience.md"
  "$MANUSCRIPT/appendix-a-legal-rights.md"
  "$MANUSCRIPT/appendix-b-resources.md"
  "$MANUSCRIPT/99-back-matter.md"
)

build_epub() {
  echo "Building EPUB..."
  "$PANDOC" "${FILES[@]}" \
    --metadata-file="$METADATA" \
    --toc \
    --toc-depth=2 \
    --epub-chapter-level=1 \
    --standalone \
    -o "$OUTPUT/No_Quarter.epub"
  echo "EPUB: $OUTPUT/No_Quarter.epub ($(du -h "$OUTPUT/No_Quarter.epub" | cut -f1))"
}

build_pdf() {
  echo "Building PDF..."
  "$PANDOC" "${FILES[@]}" \
    --metadata-file="$METADATA" \
    --toc \
    --toc-depth=2 \
    --pdf-engine=wkhtmltopdf \
    --variable geometry:margin=1in \
    --variable fontsize=11pt \
    --standalone \
    -o "$OUTPUT/No_Quarter.pdf"
  echo "PDF: $OUTPUT/No_Quarter.pdf ($(du -h "$OUTPUT/No_Quarter.pdf" | cut -f1))"
}

build_docx() {
  echo "Building DOCX..."
  "$PANDOC" "${FILES[@]}" \
    --metadata-file="$METADATA" \
    --toc \
    --toc-depth=2 \
    --reference-doc="$MANUSCRIPT/reference.docx" \
    --standalone \
    -o "$OUTPUT/No_Quarter.docx" 2>/dev/null || \
  "$PANDOC" "${FILES[@]}" \
    --metadata-file="$METADATA" \
    --toc \
    --toc-depth=2 \
    --standalone \
    -o "$OUTPUT/No_Quarter.docx"
  echo "DOCX: $OUTPUT/No_Quarter.docx ($(du -h "$OUTPUT/No_Quarter.docx" | cut -f1))"
}

build_html() {
  echo "Building HTML..."
  "$PANDOC" "${FILES[@]}" \
    --metadata-file="$METADATA" \
    --toc \
    --toc-depth=2 \
    --standalone \
    --self-contained \
    -o "$OUTPUT/No_Quarter.html"
  echo "HTML: $OUTPUT/No_Quarter.html ($(du -h "$OUTPUT/No_Quarter.html" | cut -f1))"
}

# Parse argument
case "${1:-all}" in
  epub) build_epub ;;
  pdf)  build_pdf ;;
  docx) build_docx ;;
  html) build_html ;;
  all)
    build_epub
    build_docx
    build_html
    echo ""
    echo "PDF requires LaTeX or wkhtmltopdf. Run 'bash build.sh pdf' separately."
    echo ""
    echo "All builds complete."
    ;;
  *)
    echo "Usage: bash build.sh [epub|pdf|docx|html|all]"
    exit 1
    ;;
esac
