# Plan: my-session-id 플러그인 생성

## Context
현재 세션 ID를 출력하되, 동시에 떠 있는 다른 세션과 혼동되지 않아야 한다. SessionStart, UserPromptSubmit, Stop 3개 훅 이벤트를 활용해 각각 세션 ID를 별도 파일에 저장하고, 스킬에서 비교 출력한다. skill-creator 스킬을 활용하여 SKILL.md를 작성한다.

## 디렉토리 구조

```
my-session-id/
├── .claude-plugin/plugin.json
├── hooks/
│   ├── hooks.json
│   └── capture-session-id.js
└── skills/
    └── session-id/SKILL.md
```

## 구현 파일

### 1. `.claude-plugin/plugin.json`
```json
{
  "name": "my-session-id",
  "version": "1.0.0",
  "description": "세션 ID 캡처 및 훅 이벤트별 비교 플러그인",
  "author": { "name": "personal" },
  "license": "MIT"
}
```

### 2. `hooks/hooks.json`
- SessionStart, UserPromptSubmit, Stop 3개 이벤트 등록
- 모두 `node "${CLAUDE_PLUGIN_ROOT}/hooks/capture-session-id.js" <EventName>` 호출
- SessionStart에 `matcher` 없음 (기존 my-session-wrap 패턴과 동일)

### 3. `hooks/capture-session-id.js`
- stdin JSON에서 `session_id`, `cwd` 파싱
- 이벤트별 파일명 매핑:
  - SessionStart → `$cwd/.claude/.session-id-start`
  - UserPromptSubmit → `$cwd/.claude/.session-id-prompt`
  - Stop → `$cwd/.claude/.session-id-stop`
- 저장 형식: `{ session_id, event, timestamp }` JSON
- `cwd` 기반 저장으로 프로젝트별 격리 (멀티세션 안전)
- 에러 시 조용히 실패 (세션 방해 금지)

### 4. `skills/session-id/SKILL.md`
- skill-creator 스킬로 작성
- 3개 파일을 읽어 비교 테이블 출력
- 판정: 전체 일치 → 정상, 불일치 → 경고, 파일 없음 → 미발동
- Stop은 세션 종료 시에만 발동하므로 진행 중 미발동은 정상

### 5. `marketplace.json` 업데이트
- `C:\Users\ahnbu\.claude\my-claude-plugins\.claude-plugin\marketplace.json`의 plugins 배열에 추가

## 참조 파일 (재사용)
- `my-session-wrap/hooks/capture-session-id.js` — Node.js stdin 파싱 패턴
- `my-session-wrap/hooks/hooks.json` — hooks.json 구조

## 검증
1. `plugin update` 후 새 세션 시작 → `.claude/.session-id-start` 생성 확인
2. 프롬프트 입력 → `.claude/.session-id-prompt` 생성 확인
3. 스킬 호출하여 비교 테이블 정상 출력 확인
4. Stop은 세션 종료 시 별도 확인 필요
