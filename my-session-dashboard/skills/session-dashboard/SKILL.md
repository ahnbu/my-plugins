---
description: Claude Code 세션 대시보드를 빌드하고 브라우저에서 열기. Triggers: '/ss', 'session dashboard', '세션 대시보드', '세션 목록'
---

# Session Dashboard

Claude Code JSONL 세션 파일을 전처리하여 대시보드 HTML로 변환하고 브라우저에서 엽니다.

## 실행 흐름

### 1. 플러그인 경로 확인

플러그인 설치 경로를 결정합니다:

```
PLUGIN_DIR = ~/.claude/plugins/marketplaces/my-claude-plugins/my-session-dashboard
```

marketplace에서 찾을 수 없으면 로컬 개발 경로를 사용합니다:

```
PLUGIN_DIR = ~/.claude/my-claude-plugins/my-session-dashboard
```

### 2. 빌드 실행

```bash
node "${PLUGIN_DIR}/build.js"
```

- `~/.claude/projects/` 하위 모든 JSONL 세션 파일 스캔
- 첫 user 메시지에서 키워드 3개 추출하여 제목 생성
- 토큰 사용량, 도구 사용 통계 계산
- 출력: `~/.claude/session-dashboard/sessions.json` + `sessions/*.json`

### 3. 브라우저에서 열기

```bash
# Windows
start "" "$HOME/.claude/session-dashboard/index.html"

# Mac
open ~/.claude/session-dashboard/index.html

# Linux
xdg-open ~/.claude/session-dashboard/index.html
```

### 4. 결과 보고

빌드 결과를 사용자에게 요약 보고합니다:
- 처리된 세션 수
- 출력 경로
- 브라우저 열림 확인
