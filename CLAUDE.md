# My Claude Plugins — 개발 가이드

이 저장소는 개인용 Claude Code 플러그인을 관리하는 GitHub 저장소입니다.

## 플러그인 업데이트 워크플로우

플러그인 파일을 직접 수정하지 말고 아래 순서를 따르세요.

```
1. 로컬에서 파일 수정
2. CHANGELOG 업데이트 (README.md)
3. git commit & push
4. /plugin update <플러그인명>
```

## Git Commit 규칙

### 커밋 메시지 형식

```
<타입>(<플러그인명>): <한 줄 요약>

<본문 — 필요 시>
```

### 타입 목록

| 타입 | 언제 사용 |
|------|-----------|
| `feat` | 새 플러그인·스킬·커맨드·에이전트 추가 |
| `fix` | 버그 수정, 잘못된 동작 교정 |
| `refactor` | 기능 변화 없이 구조·내용 정리 |
| `docs` | README.md, CLAUDE.md 등 문서만 변경 |
| `chore` | 메타데이터(plugin.json, marketplace.json) 수정 |

### 커밋 예시

```
feat(my-cowork): doc-coauthoring 포크 — AskUserQuestion 의무화

- example-skills:doc-coauthoring SKILL.md 포크
- 사용자 질문 시 AskUserQuestion 도구 필수 규칙 추가
- 질문 최대 4개로 압축, 개방형은 Other로 수용
```

```
fix(my-session-wrap): duplicate-checker 중복 감지 조건 수정
```

```
docs: README.md changelog 섹션 추가
```

### 규칙

- 커밋 메시지는 **한국어**로 작성 (타입·플러그인명은 영어 유지)
- 한 커밋에 하나의 플러그인만 수정 (여러 플러그인 동시 수정 금지)
- 플러그인 기능 변경 시 반드시 README.md changelog도 함께 업데이트
- 직접 파일 수정 후 Claude에게 커밋 요청 시, Claude가 자동으로 위 규칙을 따름

## 플러그인 버전 관리

- `plugin.json`의 `version` 필드를 Semantic Versioning으로 관리
  - `feat` → minor 버전 증가 (1.0.0 → 1.1.0)
  - `fix` → patch 버전 증가 (1.0.0 → 1.0.1)
  - 하위 호환 불가 변경 → major 버전 증가 (1.0.0 → 2.0.0)
