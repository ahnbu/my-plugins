# My Claude Code Plugins

개인용 Claude Code 플러그인 저장소. GitHub에서 관리되며 `/plugin update`로 업데이트.

## 구조

```
my-claude-plugins/
├── CLAUDE.md                     # 개발 가이드 및 git commit 규칙
├── .claude-plugin/
│   └── marketplace.json          # 마켓플레이스 등록 정보
├── my-session-wrap/              # 세션 마무리 통합 워크플로우 플러그인
│   ├── .claude-plugin/
│   │   └── plugin.json
│   ├── agents/
│   │   ├── automation-scout.md
│   │   ├── doc-updater.md
│   │   ├── duplicate-checker.md
│   │   ├── followup-suggester.md
│   │   └── learning-extractor.md
│   ├── commands/
│   │   └── wrap.md
│   └── skills/
│       ├── my-session-wrap/
│       ├── session-analyzer/
│       └── history-insight/
└── my-cowork/                    # 문서 공동 작성 스킬 (doc-coauthoring 포크)
    ├── .claude-plugin/
    │   └── plugin.json
    ├── commands/
    │   └── cowork.md
    └── skills/
        └── cowork/
            └── SKILL.md
```

---

## 플러그인: `my-session-wrap`

세션 마무리 시 실행하는 통합 워크플로우. `/wrap` 커맨드로 실행.

### 목적

1. **컨텍스트 복원** — `handoff/handoff_NN_YYYYMMDD.md` 저장으로 다음 세션에서 즉시 재개
2. **시스템 개선** — CLAUDE.md 업데이트 + git commit으로 지식 반영

### 실행 방법

```
/wrap           # 인터랙티브 세션 마무리 (권장)
/wrap [message] # 빠른 커밋 메시지 지정
```

### 워크플로우

```
Step 1. Git 감지
Step 2. 4개 에이전트 병렬 분석
Step 3. duplicate-checker 검증
Step 4. 결과 통합 + 액션 선택
Step 5. 실행 (handoff 저장 / CLAUDE.md 업데이트 / git commit)
```

### 포함된 에이전트

| 에이전트 | 역할 |
|---------|------|
| `doc-updater` | CLAUDE.md/context.md 업데이트 필요 항목 분석 |
| `automation-scout` | 반복 패턴 → skill/command/agent 자동화 기회 감지 |
| `learning-extractor` | 레슨·실수·발견 추출 (TIL 형식) |
| `followup-suggester` | 미완료 작업·다음 세션 우선순위 제안 |
| `duplicate-checker` | 기존 CLAUDE.md·handoff 파일과 중복 검증 |

### 포함된 스킬

| 스킬 | 설명 | 트리거 |
|------|------|--------|
| `my-session-wrap` | 메인 세션 마무리 스킬 | `wrap`, `마무리`, `세션 정리` |
| `session-analyzer` | SKILL.md 명세 대비 세션 사후 검증 | `analyze session`, `세션 분석` |
| `history-insight` | 세션 히스토리 조회·분석 | `capture session`, `세션 히스토리` |

---

## 플러그인: `my-cowork`

`example-skills:doc-coauthoring`을 포크한 문서 공동 작성 스킬.
원본 대비 **사용자 질문 시 `AskUserQuestion` 도구 의무화** 규칙이 추가됨.

### 변경 사항 (원본 대비)

- 모든 사용자 질문 → `AskUserQuestion` 도구 필수
- 질문 최대 4개로 압축 (핵심 우선)
- 개방형 답변은 "Other" 옵션으로 수용

### 실행 방법

```
/cowork
```

---

## 업데이트 구조

```
로컬 개발                       GitHub                     Claude Code 사용
─────────────────────────────────────────────────────────────────────────
my-claude-plugins/   git push   github repo   /plugin update
(편집 작업 공간)        →              →               ↓
                                       plugins/marketplaces/my-claude-plugins/
                                       (Claude가 실제로 읽는 파일)
```

**규칙:** `plugins/marketplaces/my-claude-plugins/`를 직접 수정하지 말 것.
`/plugin update` 시 GitHub에서 덮어씌워짐.

```bash
# GitHub push 후 실행
/plugin update my-session-wrap
/plugin update my-cowork
```

---

## 관련 설정

- **글로벌 CLAUDE.md**: `~/.claude/CLAUDE.md`
- **커맨드**: `~/.claude/commands/wrap.md`, `~/.claude/commands/cowork.md`

---

## Changelog

| 날짜 | 버전 | 플러그인 | 변경 내용 |
|------|------|----------|-----------|
| 2026-02-21 | my-session-wrap 1.0.3 | my-session-wrap | fix: ensure-commands.js — 플러그인 원본 변경 시 커맨드 자동 갱신 (내용 비교 방식) |
| 2026-02-21 | my-cowork 1.1.2 | my-cowork | fix: ensure-commands.js — 자동 갱신 방식으로 통일 (충돌 경고 제거) |
| 2026-02-21 | my-cowork 1.1.1 | my-cowork | fix: hooks.json에서 once:true 제거 — 매 세션마다 커맨드 존재 여부 재확인 |
| 2026-02-21 | my-session-wrap 1.0.2 | my-session-wrap | fix: hooks.json에서 once:true 제거 |
| 2026-02-21 | my-cowork 1.1.0 | my-cowork | feat: SessionStart hook 추가 — /cowork 미등록 시 자동 등록, 충돌 시 경고 출력 |
| 2026-02-21 | my-cowork 1.0.0 | my-cowork | 신규: doc-coauthoring 포크, AskUserQuestion 의무화 규칙 추가 |
| 2026-02-21 | - | - | CLAUDE.md 추가: git commit 규칙 및 업데이트 워크플로우 문서화 |
