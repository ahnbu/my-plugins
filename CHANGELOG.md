# Changelog

| 날짜 | 버전 | 변경 내용 |
|------|------|-----------|
| 2026-02-25 | - | feat: pre-commit hook으로 marketplace/plugin 버전 동기화 검증 + 릴리스 워크플로우 문서화 |
| 2026-02-25 | my-session-wrap 2.0.0 | feat: handoff 파일명에 당일 순번(NN) 자동 부여 (`handoff_YYYYMMDD_NN_한줄요약.md`) |
| 2026-02-25 | my-session-wrap 2.0.0 | feat: handoff 파일명을 YYYYMMDD_한줄요약 형식으로 변경 (순번 로직 제거 → 요약 기반) |
| 2026-02-25 | my-session-dashboard 1.1.0 | feat: plans 폴더 검색·조회 기능 추가 |
| 2026-02-25 | my-session-dashboard 1.1.0 | feat: 빌드 출력 경로를 레포 최상위 output/으로 변경 |
| 2026-02-24 | my-session-wrap 2.0.0 | fix: 디버그 코드 제거 → 프로덕션 전환 (SessionStart만 유지) |
| 2026-02-24 | my-session-id 1.0.0 | feat: 세션 ID 캡처 및 훅 이벤트별 비교 플러그인 추가 |
| 2026-02-24 | my-session-wrap 2.0.0 | fix: capture-session-id를 bash→Node.js로 전환 (Windows 호환) |
| 2026-02-24 | my-session-wrap 2.0.0 | feat: UserPromptSubmit hook으로 세션 ID 파일 기반 캡처 |
| 2026-02-22 | my-session-dashboard 1.1.0 | feat: 시스템 태그 제거, NaN/빈 세션 필터링, self-contained HTML, 증분 빌드, 한국어 UI, 키워드 폴백, 필터 헤더 이동 |
| 2026-02-22 | my-session-wrap 1.1.0 | feat: handoff 문서에 세션 ID 필수 기록 — SessionStart hook으로 $CLAUDE_SESSION_ID 자동 캡처 |
| 2026-02-22 | my-session-dashboard 1.0.0 | 신규: 세션 대시보드 플러그인 — JSONL 전처리 + 브라우저 뷰어, /ss 커맨드 |
| 2026-02-21 | my-session-wrap 1.0.3 | fix: ensure-commands.js — 플러그인 원본 변경 시 커맨드 자동 갱신 (내용 비교 방식) |
| 2026-02-21 | my-cowork 1.1.3 | feat: 플러그인 마커 기반 충돌 감지 — 내 파일은 자동 갱신, 타 플러그인 파일은 경고 후 스킵 |
| 2026-02-21 | my-session-wrap 1.0.4 | feat: 플러그인 마커 기반 충돌 감지 — 내 파일은 자동 갱신, 타 플러그인 파일은 경고 후 스킵 |
| 2026-02-21 | my-cowork 1.1.2 | fix: ensure-commands.js — 자동 갱신 방식으로 통일 (충돌 경고 제거) |
| 2026-02-21 | my-cowork 1.1.1 | fix: hooks.json에서 once:true 제거 — 매 세션마다 커맨드 존재 여부 재확인 |
| 2026-02-21 | my-session-wrap 1.0.2 | fix: hooks.json에서 once:true 제거 |
| 2026-02-21 | my-cowork 1.1.0 | feat: SessionStart hook 추가 — /cowork 미등록 시 자동 등록, 충돌 시 경고 출력 |
| 2026-02-21 | my-cowork 1.0.0 | 신규: doc-coauthoring 포크, AskUserQuestion 의무화 규칙 추가 |
| 2026-02-21 | - | CLAUDE.md 추가: git commit 규칙 및 업데이트 워크플로우 문서화 |
