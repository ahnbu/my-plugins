---
description: 직전 응답을 md 파일로 저장
allowed-tools: Write, Bash(ls), Glob, AskUserQuestion
plugin: my-session-wrap
---

# Save Response (/save)

직전 Claude 응답을 마크다운 파일로 저장합니다.

## Usage

- `/save` — 직전 응답을 현재 디렉토리에 저장 (파일명 자동 생성)
- `/save [제목]` — 지정 제목으로 저장
- `/save [제목] [경로]` — 지정 제목으로 지정 경로에 저장

## Execution Steps

### Step 1: 저장 내용 결정

직전 assistant 응답의 텍스트 내용을 저장 대상으로 삼는다.
- 도구 호출 결과는 제외하고, 사용자에게 보여준 텍스트만 포함
- 코드 블록은 그대로 유지

### Step 2: 파일명 생성

사용자가 제목을 지정한 경우: `{제목}_YYYYMMDD.md`

지정하지 않은 경우:
- 응답 내용의 핵심 주제를 한국어 2~4단어로 요약
- `{요약}_YYYYMMDD.md` 형식

### Step 3: 저장 경로

- 경로가 지정된 경우: 해당 경로 사용
- 미지정: 현재 작업 디렉토리 (cwd)

### Step 4: 파일 저장

Write 도구로 파일 생성. 동일 파일명이 존재하면:
- 기존 파일을 `_v1`로 리네임
- 새 파일을 `_v2_YYYYMMDD.md`로 저장

### Step 5: 결과 출력

```
✓ 저장됨: {파일경로}
  ({줄수}줄, {바이트}bytes)
```
