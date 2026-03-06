---
description: Claude Code 세션 대시보드를 빌드하고 브라우저에서 열기. Triggers: '/ss', 'session dashboard', '세션 대시보드', '세션 목록'
---

# Session Dashboard

Claude Code JSONL 세션 파일을 전처리하여 대시보드 HTML로 변환하고 브라우저에서 엽니다.

## 실행 흐름

### 1. 플러그인 경로 확인

플러그인 설치 경로 우선순위:
1. `~/.claude/plugins/marketplaces/my-claude-plugins/my-session-dashboard` (marketplace 설치)
2. `~/.claude/my-claude-plugins/my-session-dashboard` (로컬 개발 경로)

경로를 `PLUGIN_DIR` 변수에 저장합니다.

### 2. serve.js 실행

```bash
node "${PLUGIN_DIR}/serve.js"
```

동작:
- 로컬 HTTP 서버를 임의 포트로 시작
- 기존 `output/session-dashboard/index.html`이 있으면 즉시 브라우저에서 열기
- 없으면 "빌드 중..." 로딩 페이지 표시
- 백그라운드에서 `build.js` 실행 (SSE로 진행률 전송)
- 빌드 완료 후 브라우저 자동 리로드
- 리로드 후 5초 뒤 서버 자동 종료

### 3. 결과 보고

- "브라우저에서 세션 대시보드를 열었습니다." 보고
- serve.js가 종료될 때까지 대기하지 않음 (백그라운드 동작)
