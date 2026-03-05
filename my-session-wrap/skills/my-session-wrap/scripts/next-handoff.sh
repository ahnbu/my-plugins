#!/usr/bin/env bash
# next-handoff.sh — 다음 handoff 파일 경로를 생성하고 stdout으로 출력
# Usage: bash next-handoff.sh [PROJECT_ROOT] [요약]
#   PROJECT_ROOT: 명시적 프로젝트 루트 (비어 있으면 자동 탐색)
#   요약: 세션 작업 한줄요약 (미제공 시 HHMM 사용)

EXPLICIT_ROOT="${1:-}"
SUMMARY="${2:-}"

# --- ProjectRoot 결정 ---
resolve_project_root() {
  local markers="CHANGELOG.md AGENTS.md CLAUDE.md GEMINI.md"

  # Priority 1: explicit argument
  if [ -n "$EXPLICIT_ROOT" ]; then
    local found=0
    for m in $markers; do
      [ -f "$EXPLICIT_ROOT/$m" ] && found=$((found + 1))
    done
    if [ "$found" -eq 0 ]; then
      echo "ERROR: ProjectRoot '$EXPLICIT_ROOT' has no marker files" >&2
      exit 1
    fi
    echo "$EXPLICIT_ROOT"
    return
  fi

  # Priority 2: git root
  local git_root
  git_root=$(git rev-parse --show-toplevel 2>/dev/null)
  if [ $? -eq 0 ] && [ -n "$git_root" ]; then
    echo "$git_root"
    return
  fi

  # Priority 3: marker scan — CWD + up to 3 levels, pick most markers
  local dir
  dir=$(pwd)
  local best_dir=""
  local best_count=0

  for i in 0 1 2 3; do
    local count=0
    for m in $markers; do
      [ -f "$dir/$m" ] && count=$((count + 1))
    done
    if [ "$count" -gt "$best_count" ]; then
      best_count=$count
      best_dir="$dir"
    fi
    local parent
    parent=$(dirname "$dir")
    [ "$parent" = "$dir" ] && break
    dir="$parent"
  done

  if [ "$best_count" -gt 0 ]; then
    echo "$best_dir"
    return
  fi

  # Priority 4: fail with hint
  local hint=""
  hint=$(git rev-parse --show-toplevel 2>/dev/null || true)
  local msg="ERROR: ProjectRoot could not be determined. No marker files found within 3 levels."
  [ -n "$hint" ] && msg="$msg Git root candidate: $hint"
  echo "$msg" >&2
  exit 1
}

PROJECT_ROOT=$(resolve_project_root)
HANDOFF_DIR="$PROJECT_ROOT/_handoff"
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

echo "$NEW_FILE"
