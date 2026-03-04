# 계획: ensure-commands.js 공유 플러그인 통합

## Context

Claude Code가 복수 플러그인의 SessionStart hooks를 모두 실행하지 않는 버그로 인해, 3개 플러그인(my-session-wrap, my-cowork, my-session-dashboard)의 ensure-commands.js 중 1개만 실행됨. 재현 확인 완료 (ss.md만 생성됨).

수동 순차 실행에서는 3개 모두 정상 → 코드 자체에 버그 없음, Claude Code의 hooks 실행 환경 문제.

### 테스트 유효성 확인

- 설치 경로(`~/.claude/plugins/marketplaces/my-claude-plugins/`)와 로컬 개발 경로의 git 커밋이 동일 (1977743)
- 설치된 디렉토리에 3개 플러그인의 hooks.json + ensure-commands.js 모두 존재
- **결론: 테스트 유효. Claude Code의 복수 플러그인 hooks 실행 제한이 확인된 버그**

### capture-session-id.sh 처리

capture-session-id.sh는 SessionStart hook (startup + resume 매처)으로, 매 세션마다 실행됨.
→ my-session-wrap에 남기면 my-shared-hooks와 같은 복수 플러그인 hooks 버그에 걸릴 위험.
→ **capture-session-id.sh도 my-shared-hooks로 이전하여, 모든 SessionStart hooks를 1개 플러그인에 집중.**

## 해결 방안

핸드오프 문서의 "제안 구조 B: 전용 공유 플러그인"을 구현.

### 변경 후 구조

```
my-claude-plugins/
├── my-shared-hooks/                    ← 새 플러그인
│   ├── .claude-plugin/plugin.json
│   └── hooks/
│       ├── hooks.json                  ← 모든 SessionStart hooks 통합
│       ├── ensure-commands.js          ← 형제 플러그인들의 commands/ 자동 스캔
│       └── capture-session-id.sh       ← 세션 ID 캡처 (my-session-wrap에서 이전)
├── my-session-wrap/                    ← hooks/ 디렉토리 전체 제거
│   ├── commands/wrap.md                ← 유지 (소스)
│   └── ...
├── my-cowork/                          ← hooks/ 디렉토리 전체 제거
│   ├── commands/cowork.md              ← 유지 (소스)
│   └── ...
└── my-session-dashboard/               ← hooks/ 디렉토리 전체 제거
    ├── commands/ss.md                  ← 유지 (소스)
    └── ...
```

## 구현 단계

### 1. `my-shared-hooks` 플러그인 생성

**`my-shared-hooks/.claude-plugin/plugin.json`**
```json
{
  "name": "my-shared-hooks",
  "version": "1.0.0",
  "description": "Shared SessionStart hooks for all local plugins (ensure-commands)",
  "author": { "name": "personal" },
  "license": "MIT"
}
```

**`my-shared-hooks/hooks/hooks.json`** — 통합 hooks:
- startup: ensure-commands.js + capture-session-id.sh
- resume: capture-session-id.sh

**`my-shared-hooks/hooks/ensure-commands.js`** — 통합 버전:
- 형제 플러그인 디렉토리 자동 스캔
- 각 형제의 commands/*.md 동기화
- frontmatter plugin: 마커 기반 충돌 감지 유지

**`my-shared-hooks/hooks/capture-session-id.sh`** — my-session-wrap에서 이전

### 2. 기존 플러그인 hooks/ 제거

- **my-session-wrap**: hooks/ 전체 삭제
- **my-cowork**: hooks/ 전체 삭제
- **my-session-dashboard**: hooks/ 전체 삭제

### 3. marketplace.json에 my-shared-hooks 추가

### 4. CLAUDE.md 업데이트

### 5. README.md changelog 업데이트

## 핵심 파일

| 파일 | 액션 |
|------|------|
| `my-shared-hooks/.claude-plugin/plugin.json` | 새로 생성 |
| `my-shared-hooks/hooks/hooks.json` | 새로 생성 |
| `my-shared-hooks/hooks/ensure-commands.js` | 새로 생성 (통합 버전) |
| `my-shared-hooks/hooks/capture-session-id.sh` | my-session-wrap에서 이전 |
| `my-session-wrap/hooks/` | 디렉토리 전체 삭제 |
| `my-cowork/hooks/` | 디렉토리 전체 삭제 |
| `my-session-dashboard/hooks/` | 디렉토리 전체 삭제 |
| `CLAUDE.md` | 수정 |
| `.claude-plugin/marketplace.json` | 수정 |

## 검증 방법

### 1차: 수동 실행 (push 전)
```bash
node my-shared-hooks/hooks/ensure-commands.js
```

### 2차: git push + /plugin update 후
1. `~/.claude/commands/`에서 wrap.md, cowork.md, ss.md 삭제
2. 새 세션 시작
3. 확인:
   - SessionStart 로그에 3개 커맨드 등록 메시지
   - `~/.claude/commands/`에 wrap.md, cowork.md, ss.md 모두 존재
   - `/wrap`, `/cowork`, `/ss` 모두 정상 작동
