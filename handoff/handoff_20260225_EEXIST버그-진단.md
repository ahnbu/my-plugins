# 진단: Claude Code Plugin EEXIST 버그

> 날짜: 2026-02-25 (최종 업데이트: 2026-02-25)
> Claude Code 버전: v2.1.53 → v2.1.55 (버전 업데이트 후에도 동일 증상)
> 설치 방식: Standalone binary (`C:\Users\ahnbu\.local\bin\claude.exe`, npm 아님)
> 환경: Windows (MSYS_NT-10.0-26200), MSYS2 bash
> **Bash EINVAL 이슈**: ✅ 해결 (`CLAUDE_CODE_GIT_BASH_PATH` 환경변수 설정)
> **EEXIST 이슈**: 🔲 미해결 (GitHub [#27791 코멘트](https://github.com/anthropics/claude-code/issues/27791#issuecomment-3956538753)로 보고 완료)

---

## 1. 증상

### 1-1. 마켓플레이스 추가 실패
```
/plugin > Add Marketplace > https://github.com/anthropics/claude-plugins-official.git
→ EEXIST: file already exists, mkdir 'C:\Users\ahnbu\.claude\plugins\marketplaces'
```

### 1-2. 기존 마켓플레이스 새로고침 실패
```
/plugin > my-claude-plugins > Update marketplace
→ Failed to refresh marketplace 'my-claude-plugins': EEXIST: file already exists, mkdir 'C:\Users\ahnbu\.claude\plugins'
```

### 1-3. 세션 시작 시 autoUpdate 실패 (신규 발견)
```
상태표시줄: Failed to install Anthropic marketplace · Will retry on next startup
```
`known_marketplaces.json`에 `autoUpdate: true`로 수동 등록한 `claude-plugins-official`이 세션 시작 시 자동 업데이트를 시도하나 동일 EEXIST로 실패. 매 세션마다 반복.

**공통점**: `fs.mkdir()`가 이미 존재하는 디렉토리에서 `EEXIST` 에러 발생.

---

## 2. 원인 분석

Claude Code CLI 내부에서 `fs.mkdir()` 호출 시 `{ recursive: true }` 옵션을 사용하지 않음.

- **마켓플레이스 추가** 시: `mkdir('~/.claude/plugins/marketplaces')` — 이미 다른 마켓플레이스가 설치되어 디렉토리 존재
- **마켓플레이스 새로고침** 시: `mkdir('~/.claude/plugins')` — 당연히 존재하는 경로

Node.js `fs.mkdir()`은 기본적으로 디렉토리가 이미 존재하면 `EEXIST` 에러를 throw한다.
`{ recursive: true }` 옵션을 주면 이미 존재해도 에러 없이 통과한다.

### 재현 조건
- 마켓플레이스가 1개 이상 설치된 상태에서 추가 마켓플레이스 등록 시도
- 기존 마켓플레이스의 Update marketplace 실행

### 발견 경위
이전 세션(`389a0f5e`)에서 `/plugin` UI의 `y` 키 입력 버그로 `claude-plugins-official`을 수동 삭제한 후, 재등록 시도 중 발견.

**중요 맥락**: EEXIST 버그는 마켓플레이스 **추가(add)**와 **업데이트(refresh/autoUpdate)** 경로에서 발생한다. 기존에 등록된 마켓플레이스의 조회(Marketplaces 탭, Discover 탭, Browse plugins)는 `fs.mkdir()`을 거치지 않으므로 EEXIST와 무관하게 정상 동작한다. 즉, 이 버그는 "읽기"가 아닌 "쓰기" 작업(디렉토리 생성이 수반되는 경로)에서만 발생하는 문제다.

---

## 3. 현재 파일 시스템 상태

### 3-1. 핵심 설정 파일

| 파일 | 역할 | 현재 상태 |
|------|------|-----------|
| `known_marketplaces.json` | 마켓플레이스 레지스트리 | 5개 등록 (bkit, team-attention, anthropic-agent-skills, my-claude-plugins, claude-plugins-official[autoUpdate:false]) |
| `installed_plugins.json` | 설치된 플러그인 목록 | 6개 (bkit, agent-council, clarify, document-skills, example-skills, my-session-wrap) |
| `config.json` | 저장소 설정 | `"repositories": {}` (비어있음) |
| `blocklist.json` | 차단 플러그인 | 2개 (code-review@claude-plugins-official, fizz@testmkt-marketplace) |
| `install-counts-cache.json` | 설치 수 캐시 | claude-plugins-official 기준 데이터 존재 |

### 3-2. marketplaces 디렉토리

```
~/.claude/plugins/marketplaces/
├── bkit-marketplace/              ← known_marketplaces.json에 등록됨
├── team-attention-plugins/        ← known_marketplaces.json에 등록됨
├── anthropic-agent-skills/        ← known_marketplaces.json에 등록됨 (glob에서 확인)
├── my-claude-plugins/             ← known_marketplaces.json에 등록됨
└── claude-plugins-official/       ← 수동 clone됨 + known_marketplaces.json에 수동 등록 완료 (autoUpdate: false)
```

### 3-3. 문제점
- `claude-plugins-official` 디렉토리는 수동 clone으로 존재하나, `known_marketplaces.json`에 미등록
- `/plugin` UI에서 해당 마켓플레이스가 표시되지 않음
- EEXIST 버그로 정상 등록 경로(`/plugin add`) 사용 불가

---

## 4. 가설-대응-결과 추적

### 4-1. 기존 시도

| # | 가설 | 대응 | 결과 |
|---|------|------|------|
| 1 | 수동 clone하면 Claude Code가 `marketplaces/` 하위 디렉토리를 자동 스캔하여 인식할 것 | `cd ~/.claude/plugins/marketplaces && git clone https://github.com/anthropics/claude-plugins-official.git` | ❌ 실패 — 디렉토리는 생성되었으나 `known_marketplaces.json`에 미등록이라 `/plugin` UI에 미표시 |
| 2 | `/plugin add`로 이미 clone된 마켓플레이스를 정식 등록할 수 있을 것 | `/plugin` > Add Marketplace > URL 입력 | ❌ 실패 — `EEXIST: mkdir 'marketplaces'` 에러 (clone 이전에 디렉토리가 이미 존재) |
| 3 | 기존 마켓플레이스(my-claude-plugins) 새로고침은 정상 동작할 것 | `/plugin` > my-claude-plugins > Update marketplace | ❌ 실패 — `EEXIST: mkdir 'C:\Users\ahnbu\.claude\plugins'` 에러 |

### 4-2. 신규 시도 결과

| # | 가설 | 대응 | 결과 |
|---|------|------|------|
| 4 | `known_marketplaces.json`에 수동 등록하면 `claude-plugins-official`이 Marketplaces 탭에 추가될 것 | `known_marketplaces.json`에 `claude-plugins-official` 엔트리 추가 (기존 항목 패턴 준수) | ✅ 성공 — Marketplaces 탭에 `claude-plugins-official` 표시 (56 available plugins, Browse plugins 접근 가능). 단, Discover 탭·기존 마켓플레이스는 수동 등록 이전에도 정상 동작하고 있었음 (수동 등록의 효과가 아님) |
| 5 | 수동 등록 후 플러그인 설치가 정상 동작할 것 | UI에서 플러그인 선택 → Install | ⚠️ 간접 확인 — plugin-dev가 Installed plugins (1)로 표시. 직접 신규 설치 테스트는 미수행 |
| 6 | Update marketplace는 여전히 EEXIST로 실패할 것 (등록과 새로고침은 별개 코드 경로) | `/plugin` > claude-plugins-official > Update marketplace 실행 | ✅ 확인 — `Failed to refresh marketplace 'claude-plugins-official': EEXIST: file already exists, mkdir 'C:\Users\ahnbu\.claude\plugins'`. 세션 시작 autoUpdate도 동일 실패 (`Failed to install Anthropic marketplace · Will retry on next startup`) |
| 7 | 수동 `git pull`로 마켓플레이스 업데이트를 대체할 수 있을 것 | `cd ~/.claude/plugins/marketplaces/claude-plugins-official && git pull` | 🔲 미실행 |
| 8 | `autoUpdate: false`로 변경하면 세션 시작 시 에러 메시지가 사라질 것 | `known_marketplaces.json`에서 `claude-plugins-official`의 `autoUpdate`를 `false`로 변경 | ❌ 실패 — 에러 메시지 동일 지속. autoUpdate는 refresh만 제어하며, 내부 설치 검증은 별도 경로로 실행되는 것으로 추정 |
| 9 | Google Drive 동기화가 `~/.claude` 폴더 파일 잠금(lock)을 유발하여 EEXIST 발생 | Google Drive 완전 종료 후 새 세션 시작 | ❌ 실패 — 에러 메시지 동일 지속. Drive 동기화는 원인이 아님 |
| 10 | EEXIST가 모든 마켓플레이스의 Update marketplace에서 공통 발생할 것 | `/plugin` > my-claude-plugins > Update marketplace 실행 | ✅ 확인 — `EEXIST: mkdir 'C:\Users\ahnbu\.claude\plugins'`. claude-plugins-official뿐 아니라 my-claude-plugins에서도 동일 에러 |
| 11 | `/plugin` UI에서 claude-plugins-official 플러그인 설치가 가능할 것 | Browse plugins > frontend-design > Install 시도 | ❌ 실패 — EEXIST 에러 없이 조용히 실패. Discover 메뉴에서도 동일 |
| 12 | 플러그인 설치 상태 자체에 문제가 있어 EEXIST를 유발하는 것은 아닌지 | 전체 플러그인 진단 수행 (아래 섹션 4-3 참조) | ❌ 배제 — 설치된 7개 플러그인 모두 정상. 고아 캐시 6개 정리 완료 |

### 4-3. 플러그인 설치 상태 진단 (2026-02-25)

EEXIST 원인이 플러그인 설치 상태에 있는 것은 아닌지 확인하기 위해 전체 진단 수행.

**설치된 플러그인 (7개) — 모두 정상**

| 플러그인 | 버전 | plugin.json | skills | hooks | commands | 상태 |
|----------|------|-------------|--------|-------|----------|------|
| bkit@bkit-marketplace | 1.5.5 | Y | 27 | Y | Y | OK |
| agent-council@team-attention | 1.0.0 | Y | 1 | N | N | OK |
| clarify@team-attention | 2.0.0 | Y | 3 | N | N | OK |
| document-skills@anthropic-agent-skills | 1ed29a03 | N* | 4 | N | N | OK |
| example-skills@anthropic-agent-skills | 1ed29a03 | N* | 12 | N | N | OK |
| my-session-wrap@my-claude-plugins | 2.0.0 | Y | 3 | Y | Y | OK |
| plugin-dev@claude-plugins-official | 99e11d95 | N* | 7 | N | Y | OK |

\* Anthropic/공식 플러그인은 plugin.json 없이 skills/ 폴더를 직접 노출하는 구조 (정상)

**정리된 고아 캐시 (6개)** — installed_plugins.json에 없으나 캐시에 잔존하던 항목 삭제 완료:
- `my-cowork@my-claude-plugins` (v1.0.0, v1.1.3)
- `my-session-dashboard@my-claude-plugins` (v1.0.0, v1.1.0)
- `my-session-id@my-claude-plugins` (v1.0.0)
- `my-session-wrap@my-local-plugins` (v1.0.0) — 마켓 이동 전 잔재
- `session-wrap@team-attention` (v1.0.0) — my-session-wrap로 대체
- `youtube-digest@team-attention` (v0.2.0)

**결론**: 플러그인 설치 상태는 EEXIST 원인과 무관. 버그는 Claude Code 내부 `fs.mkdir()` 호출의 `{ recursive: true }` 누락에 기인.

---

## 5. GitHub 유사 이슈 조사

### 5-1. 직접 관련 이슈

| 이슈 | 관련도 | 요약 |
|------|--------|------|
| [#27791](https://github.com/anthropics/claude-code/issues/27791) — Native Windows binary fails with EEXIST in OAuth token path | ⭐⭐⭐ 동일 근본 원인 | Windows에서 `mkdir '~/.claude'` 호출 시 EEXIST. OAuth 경로에서 발생하지만 **동일한 `{ recursive: true }` 누락** 패턴. 2일 전 등록 |
| [#22310](https://github.com/anthropics/claude-code/issues/22310) — Official plugin marketplace is inaccessible | ⭐⭐ 증상 유사 | `claude-plugins-official` 접근 불가. 3주 전 등록 |

### 5-2. 플러그인 시스템 관련 이슈

| 이슈 | 요약 |
|------|------|
| [#11278](https://github.com/anthropics/claude-code/issues/11278) | `marketplace.json` 파일 경로를 디렉토리 대신 사용하여 경로 해석 실패 |
| [#12457](https://github.com/anthropics/claude-code/issues/12457) | 로컬 마켓플레이스에서 설치 성공 보고 후 `installed_plugins.json`에 미기록 |
| [#17832](https://github.com/anthropics/claude-code/issues/17832) | 디렉토리 마켓플레이스 플러그인이 `settings.json`에 자동 활성화 안 됨 |
| [#13471](https://github.com/anthropics/claude-code/issues/13471) | v2.0.62 업데이트 후 마켓플레이스 discovery 깨짐 |
| [#14815](https://github.com/anthropics/claude-code/issues/14815) | 마켓플레이스에서 "(installed)" 표시되나 Installed 탭에 미표시 |

### 5-3. 이슈 리포트

- **#27791에 코멘트로 보고 완료** ([link](https://github.com/anthropics/claude-code/issues/27791#issuecomment-3956538753))
- marketplace 코드 경로에서도 동일 `mkdir { recursive: true }` 누락 패턴이 발생함을 보고
- #27860(Agent Teams)도 참조하여 codebase-wide 문제임을 명시

---

## 6. 워크어라운드 계획

### Step 1: `known_marketplaces.json`에 수동 등록 (가설 #4)

기존 항목 패턴을 따라 `claude-plugins-official` 엔트리 추가:

```json
"claude-plugins-official": {
  "source": {
    "source": "github",
    "repo": "anthropics/claude-plugins-official"
  },
  "installLocation": "C:\\Users\\ahnbu\\.claude\\plugins\\marketplaces\\claude-plugins-official",
  "lastUpdated": "2026-02-25T...",
  "autoUpdate": true
}
```

### Step 2: 결과 검증 (가설 #4, #5)
- Claude Code 새 세션에서 `/plugin` → Marketplaces 탭에 `claude-plugins-official` 표시 확인
- Browse plugins에서 공식 플러그인 목록 표시 확인
- 플러그인 설치 테스트 (예: `frontend-design`)

### Step 3: 새로고침 테스트 (가설 #6)
- Update marketplace 동작 확인 (EEXIST 에러가 여전히 발생하는지)
- 발생 시 → 수동 `git pull`로 대체 (가설 #7)

### Step 4: GitHub 이슈 리포트
- 검증 결과를 반영하여 이슈 작성
- 관련 이슈 [#27791](https://github.com/anthropics/claude-code/issues/27791) 참조 포함

---

## 7. GitHub 이슈 리포트 계획

### 대상 레포
https://github.com/anthropics/claude-code/issues

### 이슈 제목
`/plugin add` and marketplace refresh fail with EEXIST on Windows when plugins directory already exists

### 이슈 본문 구조

```markdown
## Description

`/plugin add` fails with `EEXIST` error when attempting to add a marketplace
on a system that already has one or more marketplaces installed. Similarly,
"Update marketplace" for existing marketplaces also fails with EEXIST.

This appears to share the same root cause as #27791 (EEXIST in OAuth token path)
— `fs.mkdir()` called without `{ recursive: true }` — but in the plugin
marketplace code path.

## Environment
- Claude Code: v2.1.53
- OS: Windows 10/11 (MSYS2 bash shell)
- Node.js: (version from `node -v`)

## Steps to Reproduce

### Scenario 1: Adding a second marketplace
1. Install any marketplace (e.g., `popup-studio-ai/bkit-claude-code`)
2. Try to add a second marketplace via `/plugin` > Add Marketplace
3. Enter: `https://github.com/anthropics/claude-plugins-official.git`

**Expected**: Marketplace is cloned and registered
**Actual**: `EEXIST: file already exists, mkdir 'C:\Users\...\marketplaces'`

### Scenario 2: Refreshing an existing marketplace
1. With any marketplace installed, go to `/plugin` > select marketplace
2. Click "Update marketplace"

**Expected**: Marketplace is refreshed
**Actual**: `Failed to refresh marketplace: EEXIST: file already exists, mkdir 'C:\Users\...\.claude\plugins'`

### Scenario 3: Auto-update on session start
1. Register a marketplace in `known_marketplaces.json` with `"autoUpdate": true`
2. Start a new Claude Code session

**Expected**: Marketplace updates silently in the background
**Actual**: Status bar shows `Failed to install Anthropic marketplace · Will retry on next startup` (repeats every session)

## Root Cause (Suspected)

`fs.mkdir()` is called without `{ recursive: true }` option in the marketplace
installation and refresh code paths. When the directory already exists, Node.js
throws EEXIST. Same pattern as #27791.

## Suggested Fix

Replace `fs.mkdir(path)` with `fs.mkdir(path, { recursive: true })`
(or `fs.mkdirSync` equivalent) in the relevant code paths.

## Workaround

Manual clone + edit `known_marketplaces.json`:
1. `cd ~/.claude/plugins/marketplaces && git clone <repo-url>`
2. Add entry to `~/.claude/plugins/known_marketplaces.json`
```

---

## 8. 관련 이력

| 날짜 | 세션 | 작업 | 파일 |
|------|------|------|------|
| 2026-02-25 | `389a0f5e` | `/plugin` UI y키 버그로 claude-plugins-official 수동 삭제 | `세션분석_389a0f5e_20260225.md` |
| 2026-02-25 | (현재) | EEXIST 버그 발견, 수동 clone 완료, 진단 수행 | 이 문서 |
| 2026-02-25 | (신규 세션) | Bash EINVAL 해결 확인, GitHub #28348 코멘트 완료, EEXIST 이슈 제출 예정 | 이 문서 |

---

## 9. 다음 단계

### 즉시 실행 가능
1. **수동 git pull 테스트** (가설 #7): `cd ~/.claude/plugins/marketplaces/claude-plugins-official && git pull`로 Update marketplace 대체 가능 여부 확인
2. **Marketplace 에러 메시지 해결**: 세션 시작 시 "Failed to install Anthropic marketplace" 반복 메시지 workaround 탐색

### 확인 완료 항목
- [x] Bash EINVAL: `CLAUDE_CODE_GIT_BASH_PATH` 환경변수로 해결
- [x] GitHub #28348: workaround 코멘트 완료 ([link](https://github.com/anthropics/claude-code/issues/28348#issuecomment-3956510794))
- [x] EEXIST 버그: GitHub #27791에 코멘트로 보고 완료 ([link](https://github.com/anthropics/claude-code/issues/27791#issuecomment-3956538753))
- [ ] 수동 git pull workaround 테스트
- [ ] Marketplace 에러 메시지 해결
