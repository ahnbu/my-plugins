---
description: 경량 commit-push — 변경사항 분석 → 커밋 → 푸쉬
allowed-tools: Bash(git *), Read, Edit, Glob
plugin: my-session-wrap
---

# Commit & Push (/cp)

변경사항을 분석하여 커밋 메시지를 자동 생성하고 commit + push를 수행하는 경량 커맨드.

## Usage

- `/cp` — 변경사항 분석 후 자동 커밋메시지 생성, commit + push
- `/cp [message]` — 지정된 메시지로 commit + push

## Execution Steps

### Step 1: 상태 확인

```bash
git status
git diff --stat
git diff --cached --stat
```

변경사항이 없으면 "커밋할 내용이 없습니다." 출력 후 종료.

### Step 2: Staging

- 이미 staged된 파일이 있으면 그대로 사용
- staged 파일이 없으면: untracked + modified 파일 목록을 보여주고, 민감파일(.env, credentials 등)을 제외한 나머지를 `git add`
- **주의**: `git add -A` 사용 금지. 파일명을 명시하여 add

### Step 3: 커밋 메시지 생성

사용자가 메시지를 제공한 경우 그대로 사용.

제공하지 않은 경우 자동 생성:
- `git diff --cached`를 분석하여 변경 내용 파악
- 프로젝트 CLAUDE.md의 커밋 규칙을 따름: `type(scope): 한 줄 요약`
- type: feat|fix|refactor|docs|chore
- scope: 플러그인명 또는 변경 영역
- 요약은 한국어

### Step 4: CHANGELOG 업데이트

프로젝트 루트에 `CHANGELOG.md`가 존재하면:
- 이력 테이블 최상단에 새 행 추가
- 형식: `| 날짜 | 타입 | 버전 | 변경 내용 |`
- 버전 열: plugin.json 버전이 변경된 경우만 기재, 아니면 `-`
- CHANGELOG 변경도 같은 커밋에 포함

### Step 5: Commit + Push

```bash
git commit -m "$(cat <<'EOF'
type(scope): 요약

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
EOF
)"
git push
```

push 실패 시 에러 메시지를 사용자에게 보여주고 중단.

### Step 6: 결과 출력

```
✓ [커밋 해시] type(scope): 요약
✓ pushed to origin/[branch]
```
