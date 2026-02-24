---
name: my-session-wrap
description: "Session wrap-up: saves a structured handoff document and creates a git commit (when git is available). Use at session end. Triggers: 'wrap', 'wrap up', 'end session', 'handoff', 'session summary', '마무리', '세션 정리', '인수인계', '오늘은 여기까지', '정리해줘', '세션 완료'"
---

# My Session Wrap

세션 마무리 시 실행하는 경량 워크플로우.

1. **컨텍스트 복원** — `handoff/handoff_NN_YYYYMMDD.md` 저장으로 다음 세션에서 즉시 재개
2. **변경사항 반영** — (git 있을 시) commit으로 작업 이력 기록

## 실행 흐름

```
Step 1. Git 감지
Step 2. handoff 파일 생성
Step 3. git commit (선택)
```

---

## Step 1: Git 감지

```bash
git status --short 2>/dev/null && echo "GIT_AVAILABLE" || echo "NO_GIT"
```

---

## Step 2: handoff 파일 생성

### 2-1. 세션 ID 획득 (절대 생략 불가)

SessionStart hook(`capture-session-id.js`)이 세션 시작 시 `$CLAUDE_SESSION_ID` 환경변수를 자동 설정한다.

```bash
echo "$CLAUDE_SESSION_ID"
```

- 환경변수 값을 handoff 문서 헤더의 `세션 ID:` 필드에 기입
- 이 세션 ID로 `~/.claude/projects/<encoded-cwd>/<sessionId>.jsonl` 조회하여 검증 가능
- 환경변수가 비어있으면 `세션 ID: (획득 실패)` 로 기재하고 사용자에게 안내

### 2-2. 파일 경로 생성 (절대 생략 불가)

```bash
bash "${baseDir}/scripts/next-handoff.sh" "handoff"
```

- stdout으로 출력된 경로(예: `handoff/handoff_03_20260221.md`)를 Write 도구의 대상으로 사용
- **스크립트 실패(exit 1) 시**: 사용자에게 오류 보고 후 중단. 직접 파일명을 결정하거나 기존 파일에 쓰는 것은 절대 금지

### 2-3. handoff 파일 작성

템플릿은 `references/template.md` 참조. 메인 에이전트가 세션 컨텍스트에서 직접 작성한다.

- 각 항목은 실제 내용이 있을 때만 포함하고, 해당 없는 항목은 생략
- §3 피드백 루프는 AI 초안 작성 후 "검토·수정해 주세요" 안내

---

## Step 3: git commit (선택)

### Git 있는 경우 → AskUserQuestion

```
AskUserQuestion(
    question="git commit을 생성할까요?",
    options=[
        "git commit 생성",
        "skip"
    ]
)
```

선택 시:
```bash
git add -p   # 사용자가 직접 스테이징 확인
git commit -m "docs: [세션 작업 요약]"
```

### Git 없는 경우

handoff 파일 저장 후 완료.

---

> **주의:** MEMORY.md(auto memory)는 이 워크플로우의 범위가 아니다. auto memory는 작업 중 자연스럽게 갱신되는 별도 기능이다.
