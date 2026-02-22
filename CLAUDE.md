# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 저장소 개요

개인용 Claude Code 플러그인 마켓플레이스. 각 플러그인은 독립 디렉토리로 관리되며 GitHub을 통해 배포.

## 아키텍처

### 플러그인 구조

```
<plugin-name>/
├── .claude-plugin/plugin.json    # 메타정보 (name, version, description)
├── hooks/
│   ├── hooks.json                # SessionStart 훅 정의
│   └── ensure-commands.js        # 커맨드 자동 등록 스크립트
├── commands/*.md                 # 슬래시 커맨드 정의
├── agents/*.md                   # 서브에이전트 정의
└── skills/<skill-name>/SKILL.md  # 스킬 정의
```

### 마켓플레이스 등록

`.claude-plugin/marketplace.json`이 마스터 메타파일. 각 플러그인의 `source` (상대경로)와 `version`을 기록.

### 커맨드 자동 등록 (ensure-commands.js)

SessionStart 훅으로 매 세션 실행. 플러그인의 `commands/` 파일을 `~/.claude/commands/`에 복사.

**충돌 감지**: 커맨드 파일 frontmatter의 `plugin: <name>` 마커로 소유권 판정.
- 마커 없거나 다른 플러그인 → 경고 출력 후 스킵 (기존 보호)
- 같은 플러그인 마커 → 내용 비교 후 변경 시 자동 갱신
- 파일 없음 → 자동 설치

### Frontmatter 규칙

**Commands**: `plugin: <name>` 마커 필수 (충돌 감지용)
**Agents**: `tools`, `model`, `color` 지정
**Skills**: `description`은 한 줄 (멀티라인 불가)

## 현재 플러그인

| 플러그인 | 설명 | 커맨드 |
|----------|------|--------|
| `my-session-wrap` | 세션 마무리 워크플로우 (5개 에이전트 병렬분석 → 검증 → handoff/CLAUDE.md/commit) | `/wrap` |
| `my-cowork` | doc-coauthoring 포크 (AskUserQuestion 의무화) | `/cowork` |

## 배포 워크플로우

```
로컬 수정 → git commit & push → /plugin update <플러그인명>
```

`plugins/marketplaces/my-claude-plugins/` (Claude가 읽는 경로)를 직접 수정하지 말 것.

## Git Commit 규칙

### 형식

```
<타입>(<플러그인명>): <한 줄 요약>
```

### 타입

| 타입 | 사용 | 버전 영향 |
|------|------|-----------|
| `feat` | 새 기능 추가 | minor ↑ |
| `fix` | 버그 수정 | patch ↑ |
| `refactor` | 구조 정리 (기능 불변) | - |
| `docs` | 문서만 변경 | - |
| `chore` | 메타데이터 수정 | - |

### 규칙

- 커밋 메시지는 한국어 (타입·플러그인명은 영어)
- 한 커밋에 하나의 플러그인만 수정
- 기능 변경 시 README.md changelog도 함께 업데이트
- `plugin.json`의 `version`을 Semantic Versioning으로 관리
