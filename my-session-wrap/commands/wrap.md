---
description: 세션 마무리 — handoff 파일 저장, git commit (git 환경 시)
allowed-tools: Bash(git *), Read, Write, Edit, Glob, Grep, AskUserQuestion
plugin: my-session-wrap
---

# Session Wrap-up (/wrap)

Wrap up the current session by saving a handoff document and optionally creating a git commit.

## Quick Usage

- `/wrap` - Interactive session wrap-up (recommended)
- `/wrap [message]` - Quick commit with provided message

## Execution

Follow the workflow defined in the **my-session-wrap** skill:

1. Check git status
2. Generate handoff file (session context → template-based document)
3. Optionally create git commit

Refer to `skills/my-session-wrap/SKILL.md` for detailed execution steps.
