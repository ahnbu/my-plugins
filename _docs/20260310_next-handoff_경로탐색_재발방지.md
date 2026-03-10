# Plan: next-handoff.sh 경로 탐색 실패 재발방지

> 저장일: 2026-03-10 | 원본: (메시지 직접 제공, plan 파일 없음)
> 세션 경로: C:/Users/ahnbu/.claude/projects/C--Users-ahnbu--claude-my-claude-plugins/ffe9a63f-812c-4ffc-8740-19a8c119b062.jsonl

## 개요

`/wrap` 실행 시 `next-handoff.sh` 스크립트를 찾지 못하는 문제가 반복 발생.
근본 원인: SKILL.md의 긴 `ls` 명령을 AI가 그대로 복사하지 않고 경로를 변형함.

## Context

`/wrap` 실행 시 `next-handoff.sh` 스크립트를 찾지 못하는 문제가 반복 발생.
근본 원인: SKILL.md의 긴 `ls` 명령을 AI가 그대로 복사하지 않고 경로를 변형함.

## 원인 분석

SKILL.md 122행의 현재 로직:
```bash
SCRIPT=$(ls "$HOME/.claude/my-claude-plugins/..." "$HOME/.claude/plugins/cache/.../*/..." 2>/dev/null | head -1)
```

### 문제 1: 개발자 로컬 경로가 첫 번째 후보
- `$HOME/.claude/my-claude-plugins/...`는 **이 레포가 해당 위치에 있는 개발자만** 동작
- 다른 사용자가 marketplace로 설치하면 이 경로는 존재하지 않음
- 범용 플러그인이라면 `plugins/cache/` 또는 `plugins/marketplaces/` 경로만 참조해야 함

### 문제 2: AI가 경로를 "올바르게" 변형하려다 실패
- AI가 `marketplaces/` 경로로 바꾼 것은 범용 경로를 추론한 것 (의도는 맞음)
- 하지만 와일드카드 `*/`를 특정 버전 `2.6.0/`으로 교체하여 실패
- 결국 SKILL.md의 명령이 AI-friendly하지 않은 것이 근본 원인

## 수정 방안: `find` 기반으로 교체

### 변경 파일
- `my-session-wrap/skills/my-session-wrap/SKILL.md` (122~124행)

### 변경 내용

기존 `ls` 2개 경로 나열 방식을 `find`로 교체:

```bash
SCRIPT=$(find "$HOME/.claude" -path "*/my-session-wrap/scripts/next-handoff.sh" -print -quit 2>/dev/null)
```

장점:
- 경로가 짧고 단순하여 AI가 변형할 여지가 적음
- `-print -quit`으로 첫 매치에서 즉시 종료 (성능 OK)
- **개발 레포/marketplaces/cache 어디에 있든 자동 탐색** → 개발자 로컬 경로 하드코딩 문제도 해결
- 와일드카드 버전 번호 문제 완전 해소
- 다른 사용자가 marketplace로 설치해도 동일하게 동작 (범용성 확보)

단점:
- `find`가 `ls`보다 약간 느림 (하지만 `~/.claude` 범위이므로 무시할 수준)
- 탐색 우선순위를 명시적으로 제어하기 어려움 (하지만 어느 것이든 동일 스크립트)

### 대안 검토

| 방안 | 장점 | 단점 |
|------|------|------|
| `find` 교체 ✅ | 단순, AI 변형 불가, 범용 | 탐색 순서 비결정적 |
| Node.js wrapper 추가 | 완전 제어 | 오버엔지니어링 |
| 환경변수로 경로 주입 | 정확 | SessionStart 훅 수정 필요, 복잡도 증가 |
| `marketplaces/` 경로로 교체 | 범용성 확보 | 여전히 하드코딩, 구조 변경 시 깨짐 |
| SKILL.md에 강조 주석 추가 | 변경 최소 | AI 지시 준수 보장 불가 |

## 검증계획과 실행결과

| 검증 항목 | 검증 방법 | 결과 | 비고 |
|-----------|-----------|------|------|
| SKILL.md 122행 `find` 명령 반영 | `Read SKILL.md:122` 확인 | ✅ 완료 | `find "$HOME/.claude" -path "*/my-session-wrap/scripts/next-handoff.sh" -print -quit` |
| `plugin.json` 버전 bump | `plugin.json` 확인 | ✅ 완료 | `2.9.0` → `2.9.1` |
| `marketplace.json` 버전 동기화 | `marketplace.json` 확인 | ✅ 완료 | `2.9.1` 반영 |
| CHANGELOG.md 업데이트 | 최상단 항목 확인 | ✅ 완료 | `2026-03-10 fix my-session-wrap 2.9.1` |
| git push | `git push` 실행 | ⏳ 진행 예정 | |
| plugin update | `claude plugin marketplace update` | ⏳ 진행 예정 | |

## 실행 내역

1. `SKILL.md` 122행 수정: `ls` 2경로 나열 → `find "$HOME/.claude" -path "*/my-session-wrap/scripts/next-handoff.sh" -print -quit`
2. `my-session-wrap/.claude-plugin/plugin.json`: `2.9.0` → `2.9.1`
3. `.claude-plugin/marketplace.json`: `my-session-wrap` version `2.9.0` → `2.9.1`
4. `CHANGELOG.md`: `fix | my-session-wrap 2.9.1` 항목 최상단 추가
