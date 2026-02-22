#!/bin/bash
# capture-session-id.sh — SessionStart hook stdin에서 session_id를 읽어 환경변수로 export
# Claude Code는 SessionStart hook에 JSON을 stdin으로 전달하며, session_id 필드를 포함한다.
# CLAUDE_ENV_FILE에 기록하면 이후 모든 Bash 명령에서 $CLAUDE_SESSION_ID로 접근 가능.

INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // empty')

if [ -z "$SESSION_ID" ]; then
  exit 0
fi

if [ -n "$CLAUDE_ENV_FILE" ]; then
  echo "export CLAUDE_SESSION_ID=$SESSION_ID" >> "$CLAUDE_ENV_FILE"
fi

exit 0
