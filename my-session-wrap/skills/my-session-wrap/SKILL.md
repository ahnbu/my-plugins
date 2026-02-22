---
name: my-session-wrap
description: "Comprehensive session wrap-up: saves a structured handoff document, proposes CLAUDE.md updates, and creates a git commit (when git is available). Use at session end. Triggers: 'wrap', 'wrap up', 'end session', 'handoff', 'session summary', '마무리', '세션 정리', '인수인계', '오늘은 여기까지', '정리해줘', '세션 완료'"
---

# My Session Wrap

세션 마무리 시 실행하는 통합 워크플로우. 두 가지 목적을 달성한다.

1. **컨텍스트 복원** — `handoff/handoff_NN_YYYYMMDD.md` 저장으로 다음 세션에서 즉시 재개
2. **시스템 개선** — CLAUDE.md 업데이트 + (git 있을 시) commit으로 지식과 변경사항 반영

## 실행 흐름

```
Step 1. Git 감지
Step 2. 멀티에이전트 병렬 분석 (4개)
Step 3. duplicate-checker 검증
Step 4. 결과 통합 + 액션 선택
Step 5. 실행
```

---

## Step 1: Git 감지

```bash
git status --short 2>/dev/null && echo "GIT_AVAILABLE" || echo "NO_GIT"
```

- `GIT_AVAILABLE` → Step 4에서 AskUserQuestion 사용
- `NO_GIT` → Step 4에서 텍스트 제안 후 사용자 승인

---

## Step 2: 멀티에이전트 병렬 분석

4개 에이전트를 단일 메시지로 동시 실행한다.

**에이전트에 전달할 세션 요약:**
```
Session Summary:
- Work: [이번 세션의 주요 작업]
- Files: [생성/수정된 파일]
- Decisions: [핵심 의사결정]
```

**병렬 실행:**

| 에이전트 | 역할 | 출력 |
|---------|------|------|
| `my-session-wrap:doc-updater` | CLAUDE.md/context.md 업데이트 필요 항목 분석 | 추가할 내용 |
| `my-session-wrap:automation-scout` | 반복 패턴 → 자동화 기회 감지 | skill/command 제안 |
| `my-session-wrap:learning-extractor` | 레슨·실수·발견 추출 | TIL 형식 요약 |
| `my-session-wrap:followup-suggester` | 미완료 작업·다음 세션 우선순위 | 우선순위 목록 |

---

## Step 3: duplicate-checker 검증

Phase 1 완료 후 순차 실행. 기존 CLAUDE.md와 직전 handoff 파일을 대조해 중복 제거.

```
Task(
    subagent_type="my-session-wrap:duplicate-checker",
    prompt="""
[doc-updater 결과]
[automation-scout 결과]

기존 CLAUDE.md와 가장 최근 handoff 파일의 내용과 비교해 중복 여부를 검사하라.
- 완전 중복: skip 권고
- 부분 중복: 병합 방안 제시
- 신규: 승인
"""
)
```

---

## Step 4: 결과 통합 + 액션 선택

### Git 있는 경우 → AskUserQuestion

```
AskUserQuestion(
    multiSelect=true,
    options=[
        "handoff 파일 저장 (항상 권장)",
        "CLAUDE.md 업데이트",
        "git commit 생성",
        "자동화 제안 실행 (skill/command 생성)",
        "skip"
    ]
)
```

> **주의:** MEMORY.md(auto memory)는 이 워크플로우의 범위가 아니다. 선택지에 포함하지 마라. auto memory는 작업 중 자연스럽게 갱신되는 별도 기능이다.

### Git 없는 경우 → 텍스트 제안 후 승인

아래 형식으로 제안을 출력하고 "진행할까요?" 1회 확인 후 실행한다.

```markdown
## 세션 마무리 제안

### 1. handoff 파일 저장
저장 위치: handoff/handoff_NN_YYYYMMDD.md

**포함될 내용 개요:**
- **작업 목표**: [1줄 요약]
- **진행 현황**: [완료 N개 / 진행중 N개 / 미착수 N개]
- **핵심 의사결정**: [주요 결정 항목 나열]
- **다음 세션 시작점**: [파일명 + 위치 + 할 일]
- **변경 내역**: [생성/수정/삭제 파일 목록]
- **피드백 루프**: 잘된 점 / 문제·병목 / 레슨 / 개선 액션 (AI 초안, 검토 필요)

### 2. CLAUDE.md 업데이트 제안
[추가할 내용 — duplicate-checker 통과 항목만]

위 내용으로 진행할까요?
```

---

## Step 5: 실행

### handoff 파일 작성

템플릿은 `references/template.md` 참조.

**[필수] 세션 ID 획득 (절대 생략 불가):**

SessionStart hook(`capture-session-id.sh`)이 `$CLAUDE_SESSION_ID` 환경변수를 자동 설정한다.

```bash
echo "$CLAUDE_SESSION_ID"
```

- 환경변수 값을 handoff 문서 헤더의 `세션 ID:` 필드에 기입
- 이 세션 ID로 `~/.claude/projects/<encoded-cwd>/<sessionId>.jsonl` 조회하여 검증 가능
- 환경변수가 비어있으면 `세션 ID: (획득 실패)` 로 기재하고 사용자에게 안내

**[필수] 파일 생성 전 아래 스크립트를 반드시 실행한다 (절대 생략 불가):**

```bash
bash "C:/Users/ahnbu/.claude/my-plugins/my-session-wrap/skills/my-session-wrap/scripts/next-handoff.sh" "handoff"
```

- stdout으로 출력된 경로(예: `handoff/handoff_03_20260221.md`)를 Write 도구의 대상으로 사용
- **스크립트 실패(exit 1) 시**: 사용자에게 오류 보고 후 중단. 직접 파일명을 결정하거나 기존 파일에 쓰는 것은 절대 금지
- §3 피드백 루프는 AI 초안 작성 후 "검토·수정해 주세요" 안내

### CLAUDE.md 업데이트

duplicate-checker가 승인한 항목만 추가.

### git commit (선택 시)

```bash
git add -p   # 사용자가 직접 스테이징 확인
git commit -m "[세션 작업 요약]"
```
