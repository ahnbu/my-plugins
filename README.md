# My Claude Code Plugins

개인용 Claude Code 로컬 플러그인 저장소.

## 구조

```
my-plugins/
└── my-session-wrap/          # 세션 마무리 통합 워크플로우 플러그인
    ├── .claude-plugin/
    │   └── plugin.json       # 플러그인 메타데이터
    ├── agents/               # 멀티에이전트 분석기
    │   ├── automation-scout.md
    │   ├── doc-updater.md
    │   ├── duplicate-checker.md
    │   ├── followup-suggester.md
    │   └── learning-extractor.md
    ├── commands/
    │   └── wrap.md           # /wrap 커맨드
    └── skills/
        ├── my-session-wrap/  # 메인 세션 마무리 스킬
        ├── session-analyzer/ # 세션 사후 분석 스킬
        └── history-insight/  # 세션 히스토리 조회 스킬
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

## 설치

CLAUDE.md에서 참조하는 로컬 마켓플레이스 방식으로 설치되어 있음.

```bash
# 마켓플레이스 등록
/plugin marketplace add C:/Users/ahnbu/.claude/my-plugins

# 플러그인 설치
/plugin install my-session-wrap@my-local-plugins
```

설치 후 `~/.claude/skills/`, `~/.claude/commands/` 에 자동 배포됨.

---

## 관련 설정

- **글로벌 CLAUDE.md**: `~/.claude/CLAUDE.md` — `/wrap` 커맨드 등록 및 세션 마무리 규칙
- **커맨드**: `~/.claude/commands/wrap.md`
- **스킬**: `~/.claude/skills/my-session-wrap/`
