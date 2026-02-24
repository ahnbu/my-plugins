# my-session-wrap 심층 분석 리포트 및 리팩토링 옵션

> 날짜: 2026-02-24
> 목적: /wrap 경량화를 위한 현황 분석 및 방향 제안

---

## 1. 현재 아키텍처 전체 맵

```
my-session-wrap/ (플러그인)
│
├── commands/wrap.md                    ← /wrap 슬래시 커맨드 (진입점)
│
├── agents/ (5개 — /wrap에서만 호출)
│   ├── doc-updater.md          [sonnet] CLAUDE.md/context.md 업데이트 분석
│   ├── automation-scout.md     [sonnet] 반복 패턴 → Skill/Command/Agent 제안
│   ├── learning-extractor.md   [sonnet] 레슨·실수·발견 → TIL 형식 추출
│   ├── followup-suggester.md   [sonnet] 미완료 작업 → P0-P3 우선순위
│   └── duplicate-checker.md    [haiku]  Phase 1 결과 중복 검증
│
├── skills/
│   ├── my-session-wrap/                ← 메인 워크플로우 (오케스트레이터)
│   │   ├── SKILL.md
│   │   ├── scripts/next-handoff.sh
│   │   └── references/
│   │       ├── template.md
│   │       └── multi-agent-patterns.md
│   │
│   ├── session-analyzer/               ← 독립 스킬: 세션 동작 검증
│   │   ├── SKILL.md
│   │   ├── scripts/ (find-session-files, extract-subagent-calls, extract-hook-events)
│   │   └── references/ (analysis-patterns, common-issues)
│   │
│   └── history-insight/                ← 독립 스킬: 세션 JSONL 분석
│       ├── SKILL.md
│       ├── scripts/extract-session.sh
│       └── references/session-file-format.md
│
└── hooks/
    ├── hooks.json                      ← SessionStart hook 정의
    ├── ensure-commands.js              ← 커맨드 자동 등록 (→ ~/.claude/commands/)
    └── capture-session-id.sh           ← 세션 ID → $CLAUDE_SESSION_ID 환경변수
```

---

## 2. /wrap 실행 흐름 상세

```
/wrap 실행
│
├─ Step 1: git status --short (Git 감지)
│
├─ Step 2: Phase 1 — 4개 에이전트 병렬 (★ 무거운 구간)
│   ├─ Task(my-session-wrap:doc-updater)      ← sonnet 1회
│   ├─ Task(my-session-wrap:automation-scout)  ← sonnet 1회
│   ├─ Task(my-session-wrap:learning-extractor)← sonnet 1회
│   └─ Task(my-session-wrap:followup-suggester)← sonnet 1회
│
├─ Step 3: Phase 2 — duplicate-checker 순차 (★ 무거운 구간)
│   └─ Task(my-session-wrap:duplicate-checker) ← haiku 1회
│       Input: doc-updater + automation-scout 결과
│       Output: Approved / Merge / Skip 분류
│
├─ Step 4: AskUserQuestion (다중선택)
│   ☐ handoff 파일 저장
│   ☐ CLAUDE.md 업데이트
│   ☐ git commit
│   ☐ 자동화 제안 실행
│   ☐ skip
│
└─ Step 5: 선택 항목 실행
    ├─ bash next-handoff.sh → Write (handoff_NN_YYYYMMDD.md)
    ├─ Edit (CLAUDE.md, duplicate-checker 승인 항목만)
    └─ Bash (git add -p → git commit)
```

### 비용 분석

| 구간 | 에이전트 호출 | 모델 | 목적 |
|------|-------------|------|------|
| Phase 1 | 4회 병렬 | sonnet x4 | 분석·제안 생성 |
| Phase 2 | 1회 순차 | haiku x1 | 중복 검증 |
| **합계** | **5회** | **sonnet 4 + haiku 1** | |

**handoff 저장과 git commit 자체는 에이전트 호출 0회** — Write/Edit/Bash만 사용.

---

## 3. 에이전트별 역할과 출력의 흐름

### 3.1 각 에이전트 상세

| 에이전트 | 모델 | 도구 | 입력 | 출력 | 후속 소비자 |
|---------|------|------|------|------|------------|
| doc-updater | sonnet | Read, Glob, Grep | 세션 요약 | CLAUDE.md/context.md 업데이트 제안 | duplicate-checker → CLAUDE.md Edit |
| automation-scout | sonnet | Read, Glob, Grep | 세션 요약 | Skill/Command/Agent 자동화 제안 | duplicate-checker → 자동화 실행 |
| learning-extractor | sonnet | Read, Glob, Grep | 세션 요약 | TIL 형식 학습 요약 | **(없음 — 사용자 참고용)** |
| followup-suggester | sonnet | Read, Glob, Grep | 세션 요약 | P0-P3 우선순위 작업 목록 | **(없음 — 사용자 참고용)** |
| duplicate-checker | haiku | Read, Glob, Grep | doc-updater + automation-scout 결과 | Approved/Merge/Skip 분류 | CLAUDE.md 업데이트 실행 |

### 3.2 출력 흐름도

```
doc-updater 결과 ──→ duplicate-checker ──→ CLAUDE.md 업데이트 (선택적)
automation-scout 결과 ──→ duplicate-checker ──→ 자동화 제안 실행 (선택적)
learning-extractor 결과 ──→ (직접 사용 안 됨, 사용자 참고용 출력만)
followup-suggester 결과 ──→ (직접 사용 안 됨, 사용자 참고용 출력만)
```

### 3.3 핵심 발견

1. **learning-extractor와 followup-suggester의 출력은 어떤 후속 처리에도 쓰이지 않음**
2. duplicate-checker에 전달되는 것은 doc-updater + automation-scout 결과만
3. **4개 중 2개는 순수 "참고용 출력"에 불과**
4. **5개 에이전트 중 handoff 작성에 기여하는 에이전트는 0개** — handoff는 메인 에이전트가 세션 컨텍스트에서 직접 작성

### 3.4 handoff 문서와 에이전트 결과의 관계

handoff 템플릿 구조:
```
§1 현재 상태 (목표, 진행현황, 의사결정, 다음 시작점)
§2 변경 내역
§3 피드백 루프 (잘된 점, 문제, 레슨, 개선 액션)
```

| handoff 섹션 | 에이전트 결과 사용? | 실제 데이터 소스 |
|---|---|---|
| §1 현재 상태 | ❌ | 메인 에이전트가 세션 컨텍스트에서 직접 작성 |
| §2 변경 내역 | ❌ | git diff + 세션 컨텍스트 |
| §3 피드백 루프 | ❌ | 메인 에이전트가 직접 작성 (AI 초안) |

---

## 4. 3개 스킬의 독립성 확인

| | my-session-wrap | session-analyzer | history-insight |
|--|---|---|---|
| **트리거** | /wrap, "마무리" | "세션 분석", sessionId 제공 | "세션 히스토리", "capture session" |
| **5개 에이전트 사용** | ✅ 전부 | ❌ | ❌ |
| **다른 스킬 호출** | ❌ | ❌ | ❌ |
| **상호 참조** | ❌ | ❌ | ❌ |
| **공유 스크립트** | next-handoff.sh | find-session-files.sh 등 3개 | extract-session.sh |
| **스크립트 겹침** | ❌ 없음 — 모든 스크립트가 각자 독립 | | |

**결론: session-analyzer, history-insight는 /wrap과 코드·데이터·실행 흐름 어디에서도 겹치지 않음.**
물리적으로 같은 플러그인 디렉토리에 있을 뿐, 완전히 독립된 도구.

---

## 5. hooks 인프라 현황

### SessionStart hook 실행 구조
```
SessionStart (startup) → ensure-commands.js + capture-session-id.sh
SessionStart (resume)  → capture-session-id.sh만
```

### 알려진 버그
Claude Code가 복수 플러그인의 SessionStart hooks를 모두 실행하지 않음 → 3개 플러그인 중 1개만 hooks 실행됨.

### 미착수 계획 (handoff_05 기준)
`my-shared-hooks` 플러그인으로 hooks 통합 예정. /wrap 경량화와 독립적이지만,
hooks/ 디렉토리가 my-session-wrap에서 제거될 예정이므로 경량화와 동시에 진행 가능.

---

## 6. 리팩토링 옵션

### Option A: "코어만 남기기" — 에이전트 완전 제거

**변경 내용:**
- `agents/` 디렉토리 전체 삭제 (5개 에이전트 모두)
- `references/multi-agent-patterns.md` 삭제
- SKILL.md 재작성: Step 2-3 (에이전트 분석) 완전 제거
- 새 실행 흐름: git 감지 → handoff 저장 → git commit

**변경 후 /wrap 흐름:**
```
/wrap 실행
├─ Step 1: git status (Git 감지)
├─ Step 2: bash next-handoff.sh → handoff 파일 경로 생성
├─ Step 3: $CLAUDE_SESSION_ID 획득
├─ Step 4: Write (handoff_NN_YYYYMMDD.md)
│   └─ 메인 에이전트가 세션 컨텍스트에서 직접 작성 (템플릿 기반)
├─ Step 5: AskUserQuestion — git commit 할지 선택
└─ Step 6: (선택 시) git add → git commit
```

**장점:**
- 에이전트 호출 0회 → 가장 빠르고 가벼움
- CLAUDE.md 업데이트는 필요 시 사용자가 직접 요청 가능
- 코드 대폭 축소 (agents/ 5파일 + SKILL.md 절반 삭제)

**단점:**
- CLAUDE.md 자동 업데이트 제안 기능 상실
- 자동화 기회 탐지 기능 상실
- 레슨 추출, 후속 작업 제안 기능 상실

**삭제 대상:**
```
agents/doc-updater.md           (삭제)
agents/automation-scout.md      (삭제)
agents/learning-extractor.md    (삭제)
agents/followup-suggester.md    (삭제)
agents/duplicate-checker.md     (삭제)
skills/my-session-wrap/references/multi-agent-patterns.md (삭제)
```

**수정 대상:**
```
skills/my-session-wrap/SKILL.md (재작성)
commands/wrap.md                (description 업데이트)
.claude-plugin/plugin.json      (description, version 업데이트)
```

---

### Option B: "2단계 분리" — 별도 커맨드로 분리

**변경 내용:**
- `/wrap` = 코어만 (handoff + git commit)
- `/wrap-analyze` = 새 커맨드, 5개 에이전트 분석 실행
- 에이전트 코드는 유지하되 /wrap에서 분리

**변경 후 구조:**
```
my-session-wrap/
├── commands/
│   ├── wrap.md              ← 경량 (handoff + git commit)
│   └── wrap-analyze.md      ← 새 커맨드 (5개 에이전트 분석)
├── agents/ (유지)
├── skills/
│   ├── my-session-wrap/     ← SKILL.md 재작성 (코어만)
│   └── session-analysis/    ← 새 스킬 (분석 워크플로우)
```

**장점:**
- /wrap은 빠름, 필요 시 /wrap-analyze로 풀 분석
- 기존 에이전트 코드 재활용
- 점진적 전환 가능

**단점:**
- 커맨드가 2개로 늘어남 → 복잡도 증가
- 스킬 1개 추가 작성 필요
- "언제 /wrap-analyze를 쓸까?" 판단 부담

---

### Option C: "handoff 강화 + 에이전트 축소" — 절충안

**변경 내용:**
- 5개 에이전트 전부 삭제 (Option A와 동일)
- duplicate-checker 제거 (CLAUDE.md 자동 업데이트 기능 자체를 제거)
- handoff 템플릿에 "다음 작업", "레슨" 섹션 강화
- 메인 에이전트가 세션 컨텍스트에서 직접 작성 (별도 에이전트 불필요)

**핵심 아이디어:** 에이전트가 하던 분석을 handoff 템플릿의 섹션으로 흡수.

**변경 후 handoff 템플릿:**
```markdown
# Handoff — [작업명] (세션 NN)
> 날짜 / 세션 ID / 상태

## 1. 현재 상태 (기존 유지)
## 2. 변경 내역 (기존 유지)
## 3. 피드백 루프 (기존 유지)
## 4. 다음 세션 작업 (← followup-suggester 역할 흡수)
## 5. 레슨 & 발견 (← learning-extractor 역할 흡수)
```

**장점:**
- 에이전트 0회 호출 (Option A와 동일한 속도)
- 에이전트가 하던 유용한 정보가 handoff에 포함됨
- handoff 하나로 인수인계 + 회고 모두 해결

**단점:**
- handoff 문서가 길어질 수 있음
- 메인 에이전트의 분석 품질이 전문 에이전트보다 떨어질 수 있음
- CLAUDE.md 자동 업데이트, 자동화 제안 기능은 여전히 상실

---

## 7. 옵션 비교 총괄

| | Option A: 완전 제거 | Option B: 커맨드 분리 | Option C: handoff 흡수 |
|--|---|---|---|
| **/wrap 속도** | ★★★ 최고 | ★★★ 최고 | ★★★ 최고 |
| **코드 변경량** | 중간 (삭제 위주) | 큼 (새 스킬+커맨드 작성) | 중간 (삭제 + 템플릿 수정) |
| **분석 기능 유지** | ❌ 없음 | ✅ /wrap-analyze로 유지 | ⚠️ handoff에 간접 포함 |
| **복잡도** | 가장 단순 | 커맨드 2개 관리 | 단순 (handoff 하나) |
| **유지보수** | 최소 | 에이전트 코드 유지 필요 | 최소 |
| **정보 손실** | 높음 | 없음 | 낮음 |
