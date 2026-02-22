# Session Dashboard 개선 핸드오프

- **세션 ID**: `be03d67b-ed6a-4202-9418-7d82205a02a9`
- **프로젝트**: `C:\Users\ahnbu\.claude\my-claude-plugins`
- **날짜**: 2026-02-22

## 완료된 작업 (커밋 필요)

### 수정 파일
- `my-session-dashboard/build.js` — 6건 수정
- `my-session-dashboard/index.html` — 4건 수정

### 변경 내용
1. **시스템 태그 제거** — `<command-message>`, `<local-command-caveat>` 등 제목/키워드/미리보기에서 제거
2. **NaN 날짜 세션 필터링** — 잘못된 timestamp 세션 제외
3. **빈 세션 필터링** — 0 messages 세션 제외
4. **프로젝트 경로 대소문자 정규화** — Windows 드라이브 레터 대문자 통일
5. **self-contained HTML** — fetch 제거, 데이터 인라인 (file:// 동작)
6. **`</script>` 이스케이프** — JSON 내 `</` → `<\/` 변환
7. **한국어 인터페이스** — 모든 UI 라벨 한국어화
8. **증분 빌드** — `.build-cache.json`으로 mtime 기반 캐시, 변경된 세션만 재처리
9. **키워드 폴백** — user→assistant→도구명 순서로 키워드 추출 시도
10. **필터 헤더 이동** — 사이드바에서 헤더 2번째 줄(grid-column: 1/-1)로 이동

## 다음 세션 TODO

1. `git add my-session-dashboard/build.js my-session-dashboard/index.html`
2. `git commit` — 타입: `feat(my-session-dashboard)`
3. CLAUDE.md 업데이트 불필요 (프로젝트 CLAUDE.md에 이미 플러그인 설명 있음)
4. README.md changelog 업데이트
5. `plugin.json` version bump (minor)
6. `/plugin update my-claude-plugins`로 설치 경로 동기화

## 전역 CLAUDE.md 변경 (이미 반영됨)
- Chrome MCP 연결 실패 시 5초 대기 후 2회 재시도 규칙 추가
- 재발방지책 저장 시 AskUserQuestion으로 저장 위치 확인 규칙 추가
