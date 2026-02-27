---
name: my-session-wrap
description: "Session wrap-up: saves a structured handoff document and creates a git commit (when git is available). Use at session end. Triggers: 'wrap', 'wrap up', 'end session', 'handoff', 'session summary', '마무리', '세션 정리', '인수인계', '오늘은 여기까지', '정리해줘', '세션 완료'"
---

# My Session Wrap

세션 마무리 시 실행하는 경량 워크플로우.

1. **컨텍스트 복원** — `handoff/handoff_YYYYMMDD_01_한줄요약.md` 저장으로 다음 세션에서 즉시 재개
2. **변경사항 반영** — (git 있을 시) commit으로 작업 이력 기록

## 실행 흐름

```
Step 1. Git 감지
Step 1.5. 프로젝트 CLAUDE.md Wrap 체크리스트 확인
Step 2. handoff 파일 생성
Step 3. git commit (선택)
Step 4. 규칙 후보 확인 + 재개 안내
```

---

## Step 1: Git 감지

```bash
git status --short 2>/dev/null && echo "GIT_AVAILABLE" || echo "NO_GIT"
```

---

## Step 1.5: 프로젝트 CLAUDE.md Wrap 체크리스트 확인

프로젝트 CLAUDE.md(또는 `.claude/CLAUDE.md`)에서 `## Wrap 체크리스트` 섹션을 읽어라:

```bash
# 프로젝트 CLAUDE.md 위치 탐색 (우선순위: .claude/CLAUDE.md > CLAUDE.md)
cat .claude/CLAUDE.md 2>/dev/null || cat CLAUDE.md 2>/dev/null || echo "NO_PROJECT_CLAUDE_MD"
```

- `## Wrap 체크리스트` 섹션이 **있으면**: 각 항목을 git diff, 파일 존재 여부 등으로 실제 확인하고, 미완료 항목이 있으면 사용자에게 보고 후 처리한다. handoff 작성 전에 완료하라.
- 섹션이 **없으면**: 이 단계 스킵.

---

## Step 2: handoff 파일 생성

### 2-1. 세션 ID 획득 (절대 생략 불가)

SessionStart hook(`capture-session-id.js`)이 세션 시작 시 `.claude/.current-session-id` 파일에 세션 ID를 기록한다.

```bash
cat .claude/.current-session-id 2>/dev/null || echo "(획득 실패)"
```

- 파일에서 읽은 값을 handoff 문서 헤더의 `세션 ID:` 필드에 기입
- 이 세션 ID로 `~/.claude/projects/<encoded-cwd>/<sessionId>.jsonl` 조회하여 검증 가능
- 파일이 없거나 비어있으면 `세션 ID: (획득 실패)` 로 기재하고 사용자에게 안내

### 2-2. 파일 경로 생성 (절대 생략 불가)

세션 작업 내용을 3-4단어로 요약한다 (예: `출력경로변경`, `세션ID-훅수정`).

```bash
bash -c '
HANDOFF_DIR="handoff"
SUMMARY="<요약>"
DATE=$(date +%Y%m%d)
mkdir -p "$HANDOFF_DIR"
MAX_SEQ=0
for f in "$HANDOFF_DIR"/handoff_${DATE}_[0-9][0-9]_*.md; do
  [ -f "$f" ] || continue
  seq=$(basename "$f" | sed "s/^handoff_[0-9]\{8\}_\([0-9]\{2\}\)_.*/\1/")
  seq=$((10#$seq))
  [ "$seq" -gt "$MAX_SEQ" ] && MAX_SEQ=$seq
done
SEQ=$(printf "%02d" $((MAX_SEQ + 1)))
NEW_FILE="$HANDOFF_DIR/handoff_${DATE}_${SEQ}_${SUMMARY}.md"
[ -f "$NEW_FILE" ] && { echo "ERROR: $NEW_FILE already exists" >&2; exit 1; }
echo "$NEW_FILE"
'
```

- `<요약>` 자리에 실제 요약어를 채워 실행 (예: `SUMMARY="Junction자동화-dotfiles통합완료"`)
- stdout으로 출력된 경로(예: `handoff/handoff_20260225_01_출력경로변경.md`)를 Write 도구의 대상으로 사용
- **exit 1 시**: 사용자에게 오류 보고 후 중단. 직접 파일명을 결정하거나 기존 파일에 쓰는 것은 절대 금지

### 2-3. handoff 파일 작성

템플릿은 `references/template.md` 참조. 메인 에이전트가 세션 컨텍스트에서 직접 작성한다.

- 각 항목은 실제 내용이 있을 때만 포함하고, 해당 없는 항목은 생략
- §3 피드백 루프는 AI 초안 작성 후 "검토·수정해 주세요" 안내
- §3 레슨 중 이전 handoff에서도 언급된 패턴(2회+)이면 `[규칙 후보]` 태그 추가
- §6 환경 스냅샷은 알려진 이슈가 있을 때만 포함 (플러그인 상태, 알려진 제약, 워크어라운드)

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

## Step 4: 규칙 후보 확인 + 재개 안내

### 4-1. 규칙 후보 확인

handoff의 `[규칙 후보]` 태그가 1개 이상이면:

```
AskUserQuestion(
    question="[규칙 후보] 태그가 있습니다. CLAUDE.md에 규칙으로 반영할까요?",
    options=[
        "글로벌 CLAUDE.md에 추가",
        "프로젝트 CLAUDE.md에 추가",
        "이번은 스킵"
    ]
)
```

### 4-2. 재개 안내 출력

생성된 handoff 경로를 포함한 재개 프롬프트 출력:

```
---
✅ Handoff 저장 완료: <handoff 파일 경로>

다음 세션에서 이어가려면:
  이전 세션에 이어서 작업합니다. /continue
---
```

---

> **주의:** MEMORY.md(auto memory)는 이 워크플로우의 범위가 아니다. auto memory는 작업 중 자연스럽게 갱신되는 별도 기능이다.
