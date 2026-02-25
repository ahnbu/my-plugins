# Handoff — ensure-commands.js 중복 문제 조사 및 테스트 (세션 03)
> 날짜: 2026-02-22
> 상태: 진행중

---

## 1. 현재 상태

### 작업 목표
- 복수 플러그인의 ensure-commands.js 충돌 문제 해결 및 중복 제거

### 배경 (문제의식 흐름)
1. **최초 문제**: ensure-commands.js가 3개 플러그인에 각각 존재 → SessionStart 시 **1개 플러그인의 command만 등록**되는 충돌 버그 발생
2. **AI 제안**: "플러그인 커맨드는 네이티브로 자동 인식됩니다"
3. **사용자 반론**: "내가 할 때는 안 되던데?"
4. **합의**: 네이티브 축약명 작동 여부를 테스트하여 ensure-commands.js 제거 가능성 확인

### 진행 현황
| 단계 | 상태 | 산출물 |
|------|------|--------|
| 테스트 계획 수립 | ✅ 완료 | handoff_02_20260222.md |
| commands/ 파일 백업 (.bak) | ✅ 완료 | - |
| 새 세션에서 /wrap 테스트 | ✅ 완료 | 이번 세션 (세션 03) |
| 테스트 결과 해석 | ✅ 완료 | 아래 기록 |
| ensure-commands.js 근본원인 조사 | ✅ 완료 | 아래 기록 |
| .bak 파일 정리 | ✅ 완료 | 삭제됨 |
| commands/ 복원 (수동 실행) | ✅ 완료 | wrap.md, cowork.md, ss.md |
| 재현 테스트 (새 세션) | ⬜ 미착수 | 다음 세션에서 실행 |
| 최종 결정 및 코드 변경 | ⬜ 미착수 | - |

---

## 2. 테스트 결과

### 테스트 1: 네이티브 축약명 작동 여부

**조건**: `~/.claude/commands/`에서 wrap.md, cowork.md 제거 (.bak), ss.md만 남긴 상태에서 새 세션 시작.

| 테스트 | 결과 | 상세 |
|--------|------|------|
| `/wrap` 입력 | **부분 작동** | 33초 churning 후 `/my-session-wrap:my-session-wrap`으로 퍼지 매칭되어 실행됨 |
| `/ss` 실행 | 정상 | commands/ss.md가 남아있어 즉시 매칭 |
| `/my-session-wrap:my-session-wrap` 직접 호출 | 정상 | 플러그인 스킬 직접 호출은 commands/ 파일과 무관 |
| `/wrap` 안정성 | **불안정** | 가끔 인식 실패 (사용자 보고) |

**결론**: 네이티브 퍼지 매칭만으로는 commands/wrap.md의 즉시·안정적 매칭을 대체 불가. **ensure-commands.js 제거 불가**.

### 테스트 2: ensure-commands.js 수동 순차 실행

**조건**: `~/.claude/commands/`에서 모든 .md 제거 후, 3개 스크립트를 순차 실행.

```
=== 1. my-session-wrap ===
[my-session-wrap] 커맨드 자동 등록: /wrap

=== 2. my-cowork ===
[my-cowork] 커맨드 자동 등록: /cowork

=== 3. my-session-dashboard ===
[my-session-dashboard] 커맨드 자동 등록: /ss
```

**결론**: ensure-commands.js 코드 자체에 버그 없음. **3개 모두 정상 등록**. 문제는 Claude Code의 hooks 실행 환경에 있을 가능성.

---

## 3. 근본원인 분석

### 코드 분석
- 3개 ensure-commands.js는 `PLUGIN_NAME`만 다르고 **로직 100% 동일**
- 각 커맨드 파일명이 다름 (`wrap.md`, `cowork.md`, `ss.md`) → 파일명 충돌 불가
- frontmatter `plugin:` 마커 기반 충돌 감지 로직 정상

### 근본원인 가설 (검증 필요)

| 순위 | 가설 | 검증 방법 |
|------|------|-----------|
| **1** | Claude Code가 복수 플러그인의 SessionStart hooks를 **모두 실행하지 않음** | 다음 세션 시작 시 로그 관찰 |
| 2 | timeout (3000ms) 경쟁 — 동시 실행 시 일부 timeout | timeout 값 증가 후 테스트 |
| 3 | `${CLAUDE_PLUGIN_ROOT}` 환경변수가 마지막 플러그인으로만 설정 | 스크립트에 로깅 추가 |

---

## 4. 해결 방안: 최상위 공통 hooks 통합 (권장)

### 현재 구조 (3개 분산)
```
my-session-wrap/hooks/ensure-commands.js      (PLUGIN_NAME만 다름)
my-cowork/hooks/ensure-commands.js            (동일 로직)
my-session-dashboard/hooks/ensure-commands.js (동일 로직)
```

### ~~제안 구조 A: 최상위 통합~~ (불가)
```
my-claude-plugins/
├── hooks/                  ← ❌ 마켓플레이스 루트는 플러그인이 아님 → hooks 무시됨
│   └── ensure-commands.js
├── my-session-wrap/
...
```
Claude Code는 `.claude-plugin/plugin.json`이 있는 플러그인 디렉토리 내부의 `hooks/hooks.json`만 인식.
마켓플레이스 루트에 놓으면 로드되지 않음.

### 제안 구조 B: 전용 공유 플러그인 (실현 가능)
```
my-claude-plugins/
├── my-shared-hooks/                ← 새 플러그인 (hooks 전담)
│   ├── .claude-plugin/plugin.json
│   ├── hooks/
│   │   ├── hooks.json              ← SessionStart hook 1개
│   │   └── ensure-commands.js      ← 형제 플러그인들의 commands/ 스캔
│   └── commands/                   ← (비어있음)
├── my-session-wrap/                ← hooks/ 제거, commands/wrap.md 유지
├── my-cowork/                      ← hooks/ 제거, commands/cowork.md 유지
└── my-session-dashboard/           ← hooks/ 제거, commands/ss.md 유지
```

### 통합 권장 이유
| 기준 | 3개 분산 | 공유 플러그인 통합 |
|------|----------|-------------------|
| hooks 실행 횟수 | 3회 (문제 원인 가능성) | **1회** |
| 코드 중복 | 동일 로직 3벌 | **0 중복** |
| 플러그인 추가 시 | 새 hooks/ 복붙 | **자동 감지** (형제 디렉토리 스캔) |
| 장애 격리 | 1개 실패해도 나머지 실행 | 1개 실패하면 전체 실패 |

분산이 논리적으로 나은 점(독립성, 장애 격리)이 있으나:
- 어차피 동일 코드이므로 독립적으로 발전할 이유 없음
- hooks 실행 횟수 자체가 문제의 원인일 가능성이 높음
- 마켓플레이스가 단일 레포로 관리됨

---

## 5. 다음 세션 테스트 계획

### 재현 테스트
```bash
# 1. commands/ 파일 삭제
rm ~/.claude/commands/wrap.md ~/.claude/commands/cowork.md ~/.claude/commands/ss.md

# 2. 새 세션 시작
# claude (새 세션)

# 3. 확인
# - SessionStart 로그에서 3개 ensure-commands.js 실행 여부 확인
# - ~/.claude/commands/ 에 3개 파일 모두 생성되었는지 확인
ls ~/.claude/commands/
```

### 결과에 따른 분기
- **3개 모두 등록** → 현상 비재현. 현행 유지하되, 통합은 장기 과제로 보류
- **1개만 등록 (재현)** → 최상위 공통 hooks 통합 진행

---

## 6. 변경 내역 (이번 세션)

| 액션 | 상세 |
|------|------|
| .bak 파일 정리 | `~/.claude/commands/` 내 6개 .bak 파일 삭제 |
| commands/ 복원 | ensure-commands.js 수동 실행으로 wrap.md, cowork.md, ss.md 복원 |
| 잔여 ~/handoff/ 정리 | 홈 디렉토리에 잘못 생성된 handoff 디렉토리+파일 삭제 |

### 현재 ~/.claude/commands/ 상태 (정상)
```
wrap.md    ← plugin: my-session-wrap
cowork.md  ← plugin: my-cowork
ss.md      ← plugin: my-session-dashboard
```

---

## 7. 피드백 루프
> ⚠️ 이 섹션은 AI 초안입니다. 검토·수정해 주세요.

### 잘된 점
- 테스트 계획을 handoff에 명확히 기록한 덕분에 새 세션에서도 맥락 복원 가능
- 사용자가 "원래 문제의식"을 환기시켜 테스트 해석이 정확해짐
- 수동 순차 실행으로 코드 레벨 버그 없음을 확인 → 문제 범위 축소

### 문제·병목
- 테스트가 원래 문제(ensure-commands 간 충돌)와 다른 질문(제거 가능성)에 답하고 있었음 — 초기 문제 정의가 shift됨
- next-handoff.sh가 CWD 기준 동작 → 홈 디렉토리에서 실행 시 엉뚱한 위치에 파일 생성
- 세션 CWD가 `~`로 고정되어 있어 my-claude-plugins 작업 시 절대경로 필요

### 레슨
- "테스트 계획 시 원래 문제의식을 명시적으로 기록"해야 테스트 방향이 빗나가지 않음
- next-handoff.sh 호출 시 절대경로 전달 필요 (CWD ≠ 프로젝트 디렉토리일 수 있음)

### 개선 액션
- [ ] next-handoff.sh 절대경로 지원 또는 프로젝트 루트 자동 감지 개선 검토
- [ ] handoff 문서에 "원래 문제의식" 섹션을 항상 포함 → 템플릿 반영 검토
