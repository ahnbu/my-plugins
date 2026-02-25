#!/usr/bin/env bash
# next-handoff.sh — 다음 handoff 파일 경로를 생성하고 stdout으로 출력
# Usage: bash next-handoff.sh [HANDOFF_DIR] [요약]
#   HANDOFF_DIR defaults to "handoff"
#   요약: 세션 작업 한줄요약 (미제공 시 HHMM 사용)

HANDOFF_DIR="${1:-handoff}"
SUMMARY="${2:-}"
DATE=$(date +%Y%m%d)
mkdir -p "$HANDOFF_DIR"

if [ -n "$SUMMARY" ]; then
  SUFFIX="$SUMMARY"
else
  SUFFIX=$(date +%H%M)
fi

# 순번 계산: 당일 handoff 파일에서 최대 번호 + 1
MAX_SEQ=0
for f in "$HANDOFF_DIR"/handoff_${DATE}_[0-9][0-9]_*.md; do
  [ -f "$f" ] || continue
  base=$(basename "$f")
  seq=$(echo "$base" | sed 's/^handoff_[0-9]\{8\}_\([0-9]\{2\}\)_.*/\1/')
  seq=$((10#$seq))  # 08,09 등 octal 방지
  [ "$seq" -gt "$MAX_SEQ" ] && MAX_SEQ=$seq
done
SEQ=$(printf "%02d" $((MAX_SEQ + 1)))

NEW_FILE="$HANDOFF_DIR/handoff_${DATE}_${SEQ}_${SUFFIX}.md"

if [ -f "$NEW_FILE" ]; then
  echo "ERROR: $NEW_FILE already exists" >&2
  exit 1
fi

touch "$NEW_FILE"
echo "$NEW_FILE"
