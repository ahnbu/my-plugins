#!/usr/bin/env bash
# next-handoff.sh — 다음 handoff 파일 경로를 생성하고 stdout으로 출력
# Usage: bash next-handoff.sh [HANDOFF_DIR]
#   HANDOFF_DIR defaults to "handoff"

HANDOFF_DIR="${1:-handoff}"
DATE=$(date +%Y%m%d)
mkdir -p "$HANDOFF_DIR"

MAX_NN=0
for f in "$HANDOFF_DIR"/handoff_*_${DATE}.md; do
  [ -f "$f" ] || continue
  NN=$(basename "$f" | sed 's/handoff_0*\([0-9]*\)_.*/\1/')
  [ "${NN:-0}" -gt "$MAX_NN" ] && MAX_NN=$NN
done

NEXT_NN=$(printf "%02d" $((MAX_NN + 1)))
NEW_FILE="$HANDOFF_DIR/handoff_${NEXT_NN}_${DATE}.md"

if [ -f "$NEW_FILE" ]; then
  echo "ERROR: $NEW_FILE already exists" >&2
  exit 1
fi

touch "$NEW_FILE"
echo "$NEW_FILE"
