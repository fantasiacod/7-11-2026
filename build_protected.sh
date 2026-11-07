#!/usr/bin/env bash
# build_protected.sh
# ---------------------------------------------------------------
# Produces a distribution copy of the site with the front-end
# JavaScript minified and name-mangled.
#
# WHAT THIS DOES AND DOES NOT DO — read before relying on it:
#
#   • It makes the JS unreadable at a glance and roughly 60% smaller.
#     A casual visitor who opens "view source" gets nothing usable.
#
#   • It is NOT encryption. The browser must be able to run the code,
#     so the code must reach the browser. A determined person can run
#     the result through a formatter and read the logic again.
#     Treat this as a speed bump, not a lock.
#
#   • Your real protection is elsewhere: every PHP file (login, storage,
#     the whole API and the database credentials) is executed on the
#     server and is never sent to the browser at all.
#
# Usage:  bash build_protected.sh  [source_dir]  [output_dir]
# ---------------------------------------------------------------
set -e

SRC="${1:-site_ready_v48}"
OUT="${2:-site_ready_v48_protected}"

if [ ! -d "$SRC" ]; then
  echo "لم يُعثر على مجلد المصدر: $SRC"
  exit 1
fi

echo "نسخ الملفات..."
rm -rf "$OUT"
cp -r "$SRC" "$OUT"

echo "ضغط وتشويش ملفات الجافاسكربت..."
TOTAL_BEFORE=0
TOTAL_AFTER=0

for f in "$OUT"/js/*.js; do
  [ -e "$f" ] || continue
  before=$(wc -c < "$f")

  npx terser "$f" \
    --compress passes=3,drop_console=true,drop_debugger=true \
    --mangle toplevel=false \
    --format comments=false \
    --output "$f.min" 2>/dev/null

  if [ -s "$f.min" ]; then
    mv "$f.min" "$f"
    after=$(wc -c < "$f")
    TOTAL_BEFORE=$((TOTAL_BEFORE + before))
    TOTAL_AFTER=$((TOTAL_AFTER + after))
    pct=$(( 100 - (after * 100 / before) ))
    printf "  %-22s %7s ← %7s بايت  (-%s%%)\n" "$(basename "$f")" "$after" "$before" "$pct"
  else
    rm -f "$f.min"
    echo "  تخطّي $(basename "$f") (فشل الضغط، أُبقي كما هو)"
  fi
done

echo
if [ "$TOTAL_BEFORE" -gt 0 ]; then
  echo "الإجمالي: $TOTAL_AFTER بايت بدلاً من $TOTAL_BEFORE"
fi
echo "جاهز في: $OUT"
echo
echo "تذكير: ملفات PHP لا تُرسل للمتصفح أصلاً، فهي محمية بالكامل."
