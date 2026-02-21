---
description: 세션 마무리 — handoff 파일 저장, CLAUDE.md 업데이트, git commit (git 환경 시)
allowed-tools: Bash(git *), Read, Write, Edit, Glob, Grep, Task, AskUserQuestion
---

# Session Wrap-up (/wrap)

Wrap up the current session by analyzing work done and suggesting improvements.

## Quick Usage

- `/wrap` - Interactive session wrap-up (recommended)
- `/wrap [message]` - Quick commit with provided message

## Execution

Follow the workflow defined in the **my-session-wrap** skill:

1. Check git status
2. Phase 1: Run 4 analysis agents in parallel
3. Phase 2: Run validation agent
4. Integrate results and present options
5. Execute selected actions

Refer to `skills/my-session-wrap/SKILL.md` for detailed execution steps and agent configurations.
