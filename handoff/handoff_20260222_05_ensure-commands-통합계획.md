# Handoff — ensure-commands.js 공유 플러그인 통합 (세션 04)
> 날짜: 2026-02-22
> 상태: 계획 완료, 구현 미착수

---

## 1. 현재 상태

### 작업 목표
- 복수 플러그인의 ensure-commands.js 충돌 문제를 **전용 공유 플러그인(my-shared-hooks)**으로 해결

### 이전 세션(03)에서 넘겨받은 과제
- "재현 테스트 (새 세션)" — commands/ 파일 삭제 후 새 세션에서 3개 모두 등록되는지 확인
- 결과에 따라 통합 진행 여부 결정

---

## 2. 이번 세션에서 수행한 작업

### 2-1. 재현 테스트 결과

**조건**: 이전 세션에서 수동 복원한 wrap.md, cowork.md, ss.md가 `~/.claude/commands/`에 있는 상태에서 새 세션 2회 시작.

| 시도 | SessionStart 로그 | 생성된 파일 |
|------|-------------------|------------|
| 1차 새 세션 | `[my-session-dashboard] 커맨드 자동 등록: /ss` 만 출력 | ss.md만 |
| 2차 새 세션 | 동일 | ss.md만 |

**결론**: **재현 확인. 3개 중 1개만 등록됨.**

### 2-2. 테스트 유효성 검증

사용자 질문: "로컬에서만 테스트했는데, `/plugin update` 후 설치 경로에서 테스트해야 하는 거 아닌가?"

**검증 결과**:
```
설치 경로: ~/.claude/plugins/marketplaces/my-claude-plugins/
로컬 경로: ~/.claude/my-claude-plugins/

두 경로의 git commit: 1977743 (동일)
```
- 설치된 디렉토리에 3개 플러그인의 hooks.json + ensure-commands.js **모두 존재**
- 그럼에도 SessionStart에서 **1개 플러그인의 hook만 실행**
- **결론: 테스트 유효. Claude Code의 복수 플러그인 SessionStart hooks 실행 제한이 확인된 버그**

### 2-3. capture-session-id.sh 발견

사용자: "capture-session-id.sh는 /wrap 실행 때만 동작하는 hook이다"

**실제 확인**: `my-session-wrap/hooks/hooks.json` 분석 결과, capture-session-id.sh는 **SessionStart hook** (startup + resume 매처). 매 세션마다 실행됨.
→ my-session-wrap에 남기면 my-shared-hooks와 같은 복수 플러그인 hooks 버그에 걸림
→ **capture-session-id.sh도 my-shared-hooks로 이전 결정**

### 2-4. 계획 수립 완료

계획 문서 저장 위치:
- `docs/ensure-commands-통합-계획.md` (영구 보관)

---

## 3. 확정된 계획: 전용 공유 플러그인 통합

### 변경 후 구조

```
my-claude-plugins/
├── my-shared-hooks/                    ← 새 플러그인 (hooks 전담)
│   ├── .claude-plugin/plugin.json
│   └── hooks/
│       ├── hooks.json                  ← 모든 SessionStart hooks 통합
│       ├── ensure-commands.js          ← 형제 플러그인들의 commands/ 자동 스캔
│       └── capture-session-id.sh       ← 세션 ID 캡처 (my-session-wrap에서 이전)
├── my-session-wrap/                    ← hooks/ 디렉토리 전체 제거
│   ├── commands/wrap.md
│   ├── agents/
│   ├── skills/
│   └── ...
├── my-cowork/                          ← hooks/ 디렉토리 전체 제거
│   ├── commands/cowork.md
│   └── ...
└── my-session-dashboard/               ← hooks/ 디렉토리 전체 제거
    ├── commands/ss.md
    └── ...
```

### hooks.json 내용

```json
{
  "hooks": {
    "SessionStart": [
      {
        "matcher": "startup",
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PLUGIN_ROOT}/hooks/ensure-commands.js\"",
            "timeout": 5000
          },
          {
            "type": "command",
            "command": "bash \"${CLAUDE_PLUGIN_ROOT}/hooks/capture-session-id.sh\"",
            "timeout": 3000
          }
        ]
      },
      {
        "matcher": "resume",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"${CLAUDE_PLUGIN_ROOT}/hooks/capture-session-id.sh\"",
            "timeout": 3000
          }
        ]
      }
    ]
  }
}
```

### 통합 ensure-commands.js 핵심 로직

기존 개별 스크립트와 달리, **형제 플러그인 디렉토리를 자동 스캔**:

```javascript
const marketplaceRoot = path.resolve(__dirname, "..", "..");
// 형제 디렉토리 중 commands/ 폴더가 있는 것만 선택
// 각 형제의 .claude-plugin/plugin.json에서 name을 읽어 PLUGIN_NAME 결정
// 기존 frontmatter plugin: 마커 기반 충돌 감지 로직 그대로 유지
```

---

## 4. TODO 리스트

### 구현 (순서대로)
- [ ] `my-shared-hooks/.claude-plugin/plugin.json` 생성
- [ ] `my-shared-hooks/hooks/hooks.json` 생성 (위 내용)
- [ ] `my-shared-hooks/hooks/ensure-commands.js` 작성 (형제 플러그인 스캔 통합 버전)
- [ ] `my-shared-hooks/hooks/capture-session-id.sh` 이전 (my-session-wrap에서 복사)
- [ ] `my-session-wrap/hooks/` 디렉토리 전체 삭제
- [ ] `my-cowork/hooks/` 디렉토리 전체 삭제
- [ ] `my-session-dashboard/hooks/` 디렉토리 전체 삭제
- [ ] `.claude-plugin/marketplace.json`에 my-shared-hooks 항목 추가
- [ ] `CLAUDE.md` 업데이트 (플러그인 테이블 + 아키텍처)
- [ ] `README.md` changelog 업데이트

### 검증
- [ ] 1차: `node my-shared-hooks/hooks/ensure-commands.js` 수동 실행 → 3개 커맨드 등록 확인
- [ ] 2차: `git push` + `/plugin update my-claude-plugins` 실행
- [ ] 3차: `~/.claude/commands/`에서 wrap.md, cowork.md, ss.md 삭제 → 새 세션 시작
- [ ] 3개 커맨드 모두 등록되는지 확인
- [ ] `/wrap`, `/cowork`, `/ss` 정상 작동 확인
- [ ] capture-session-id.sh 실행 여부 확인 (CLAUDE_SESSION_ID 환경변수)

### 후속 (선택)
- [ ] Claude Code GitHub에 복수 플러그인 hooks 미실행 버그 리포트 검토

---

## 5. 참조 파일 경로

| 파일 | 역할 |
|------|------|
| `docs/ensure-commands-통합-계획.md` | 상세 계획서 |
| `handoff/handoff_03_20260222.md` | 이전 세션 핸드오프 (근본원인 분석) |
| `my-session-dashboard/hooks/ensure-commands.js` | 기존 스크립트 (참조용, 삭제 예정) |
| `my-session-wrap/hooks/capture-session-id.sh` | 이전 대상 스크립트 |
| `my-session-wrap/hooks/hooks.json` | 기존 hooks 구성 (참조용, 삭제 예정) |

---

## 6. 주의사항

1. **`/plugin update` 필수**: 로컬 변경만으로는 Claude Code에 반영 안 됨. `git push` → `/plugin update` 순서.
2. **ensure-commands.js 경로 해석**: 통합 스크립트에서 `__dirname` → `my-shared-hooks/hooks/` → 부모의 부모가 마켓플레이스 루트. 설치 경로(`~/.claude/plugins/marketplaces/my-claude-plugins/`)에서도 동일 구조인지 확인 필요.
3. **capture-session-id.sh의 `${CLAUDE_PLUGIN_ROOT}`**: 이전 후 my-shared-hooks 기준으로 설정됨. 스크립트 내부에서 플러그인 경로를 참조하지 않으므로 문제없음 (stdin에서 session_id 읽기만 함).

---

## 7. 대화 흐름 요약

1. 사용자: handoff_03 기반 새 세션 시작 → ss.md만 생성됨 (재현 확인)
2. AI: 3개 ensure-commands.js + hooks.json 코드 확인, 구조 B 계획 수립
3. 사용자: "테스트 유효한가? `/plugin update` 안 했잖아"
4. AI: 설치 경로와 로컬의 git commit 동일(1977743) 확인 → 테스트 유효
5. 사용자: "capture-session-id는 /wrap 때만 동작하는 hook"
6. AI: hooks.json 확인 → SessionStart hook임. 분리 시 같은 버그 위험 → 통합 결정
7. 계획 문서 완성 → docs/ 저장
