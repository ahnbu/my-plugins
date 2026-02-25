# Handoff: ensure-commands.js 중복 문제 조사 및 테스트 계획

**날짜**: 2026-02-22
**세션 목적**: 플러그인별 커맨드 등록 훅 중복 문제 분석 및 개선 방안 수립

## 조사 결과

### 문제 현황

Claude Code 플러그인 시스템이 `commands/` 디렉토리를 **네이티브로 자동 인식**하면서,
`ensure-commands.js`가 `~/.claude/commands/`에 복사하는 파일과 **중복**이 발생하고 있음.

현재 세션에서 확인된 중복:

| 네이티브 (플러그인 자동) | ensure-commands 복사본 | 수동 실험 잔재 |
|---|---|---|
| `my-session-wrap:wrap` | `/wrap` | `/wrap1` |
| `my-cowork:cowork` | `/cowork` | `/cowork1` |
| `my-session-dashboard:ss` | `/ss` | - |

### 핵심 발견

1. **`ensure-commands.js` 도입 배경**: 과거 플러그인 네이티브 커맨드(`/wrap`)가 인식되지 않아 도입.
   정규화된 이름(`my-session-wrap:wrap`)은 인식됐으나 축약명(`/wrap`)은 미작동.
2. **현재 상태**: 네이티브 + ensure-commands 양쪽 모두 커맨드를 등록 → 중복 발생.
3. **도입 히스토리**: README/CLAUDE.md에 동작 방식만 기록, 도입 배경(왜 필요했는지)은 미기록.
4. **`team-attention-plugins/session-wrap`**: 별도 마켓플레이스에도 `wrap.md` 존재 (hooks 없음, 마커 없음). `my-session-wrap`과 기능 중복.

### ensure-commands.js 구조 (3개 플러그인 동일)

- `PLUGIN_NAME`만 다르고 로직 완전 동일
- 충돌 감지: frontmatter `plugin:` 마커 기반
- 소유권 판정 → 자동 갱신/스킵/신규 설치

## 테스트 계획

### 목적
`~/.claude/commands/`의 복사본 없이 네이티브 플러그인 커맨드(`/wrap` 축약명)가 작동하는지 확인.

### 단계

```bash
# 1. 백업 (현재 세션 또는 별도 터미널에서)
mv ~/.claude/commands/wrap.md    ~/.claude/commands/wrap.md.bak
mv ~/.claude/commands/wrap1.md   ~/.claude/commands/wrap1.md.bak
mv ~/.claude/commands/cowork.md  ~/.claude/commands/cowork.md.bak
mv ~/.claude/commands/cowork1.md ~/.claude/commands/cowork1.md.bak
mv ~/.claude/commands/ss.md      ~/.claude/commands/ss.md.bak

# 2. 새 세션 시작 (resume 아님 — 커맨드는 SessionStart 시 로드)
# claude 새 세션 열기

# 3. 확인
# - /wrap 입력 시 자동완성 나오는지
# - /wrap 실행 가능한지
# - my-session-wrap:wrap 으로는 작동하는지

# 4. 결과에 따라
# 작동 → ensure-commands.js 제거 진행
# 미작동 → 원복:
#   for f in ~/.claude/commands/*.bak; do mv "$f" "${f%.bak}"; done
```

### 주의사항
- **resume으로는 테스트 불가** — 커맨드 목록은 SessionStart 시 고정됨
- 반드시 **새 세션**에서 테스트해야 함
- `ensure-commands.js`의 SessionStart 훅도 실행되므로, 정확한 테스트를 위해 `.bak` 처리 후 **즉시** 새 세션 시작

## 테스트 후 진행 방향

### /wrap 축약명이 작동하는 경우
1. 3개 플러그인에서 `hooks/` 디렉토리 제거 (hooks.json + ensure-commands.js)
2. `~/.claude/commands/` 잔재 정리 (`.bak` 파일 삭제)
3. CLAUDE.md, README.md 업데이트 — 커맨드 자동 등록 섹션 제거/변경
4. `team-attention-plugins/session-wrap` 제거 검토

### /wrap 축약명이 작동하지 않는 경우
1. `.bak` 원복
2. ensure-commands.js 유지 (네이티브 축약명 미지원 확인)
3. 중복 최소화 방안 검토 (예: 단일 공유 ensure-commands 모듈)
4. README에 도입 배경 문서화

## 미완료 작업
- [ ] 백업 + 새 세션 테스트 실행
- [ ] 테스트 결과에 따른 코드 변경
- [ ] CLAUDE.md/README.md 히스토리 기록 업데이트
