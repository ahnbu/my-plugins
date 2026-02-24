#!/bin/bash
# capture-session-id.sh — UserPromptSubmit hook stdin에서 session_id를 읽어 파일로 저장
# Claude Code는 모든 hook에 JSON을 stdin으로 전달하며, session_id 필드를 포함한다.
# cwd/.claude/.current-session-id에 기록하면 wrap 스킬에서 읽어서 handoff에 포함 가능.
#
# 발동 시점: 사용자가 프롬프트를 제출할 때마다 (AI 처리 전)
# 참고: 공식 문서 - "All matching hooks run in parallel" (각 hook은 독립 프로세스, 독립 stdin)

INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')

if [ -n "$SESSION_ID" ]; then
  mkdir -p .claude
  echo "$SESSION_ID" > .claude/.current-session-id
fi

exit 0
