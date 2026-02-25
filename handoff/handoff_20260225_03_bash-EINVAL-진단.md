# Bash 도구 EINVAL 에러 진단

**날짜**: 2026-02-25
**상태**: ✅ 완전 해결 — v2.1.55 공식 수정 확인, workaround 환경변수 제거 완료

## 배경

- **환경**: Windows (MSYS_NT-10.0-26200), Claude Code CLI, bash shell
- **발생 시점**: 2026-02-25, 이전 세션에서 `/wrap` 실행 중 git status bash 오류 발생
- **증상**: Bash 도구 실행 시 `EINVAL: invalid argument, open` 에러 발생
- **에러 경로**: `C:\Users\ahnbu\AppData\Local\Temp\claude\C--Users-ahnbu--claude-my-claude-plugins\tasks\<random-id>.output`
- **영향**: Bash 도구 완전 불능. Glob, Read, Grep 등 다른 도구는 정상

## 가설-테스트-결과

### 가설 1: 임시 디렉토리 손상/부재 — ❌ 실패
- **테스트**: PowerShell에서 `Remove-Item -Recurse -Force "$env:TEMP\claude"` 후 Claude Code 재시작
- **결과**: 동일 에러 지속

### 가설 2: tasks 하위 디렉토리 미생성 — ❌ 실패
- **테스트**: `New-Item -ItemType Directory -Path "$env:TEMP\claude\C--Users-ahnbu--claude-my-claude-plugins\tasks" -Force`
- **결과**: 디렉토리 생성 후에도 동일 에러

### 가설 3: 파일 시스템 권한 문제 — ❌ 배제
- **테스트**: PowerShell에서 해당 경로에 test.output 파일 생성/읽기/삭제 모두 성공
- **결과**: 파일 시스템 자체는 정상

### 가설 4: Claude Code 내부 MSYS bash 경로 변환 문제 — ❌ 실패
- **가설**: Claude Code가 Windows 경로를 MSYS bash에 전달할 때 경로 변환 오류. 세션 상태 오염 가능성
- **테스트**: Claude Code 완전 종료(Ctrl+C) 후 재시작하여 `echo "bash test ok" && pwd` 실행
- **결과**: 동일 EINVAL 에러 재현. 세션 상태 오염이 아닌 환경 수준 문제 확인

### 가설 5: Claude Code 버전/설치 문제 — ⏭️ 스킵
- **가설**: Claude Code 자체 버그 또는 설치 파일 손상
- **결과**: Workaround(환경변수 설정)로 해결되어 테스트 불필요

## 기존 이슈 조사 결과

### 동일 이슈

- **[#28348](https://github.com/anthropics/claude-code/issues/28348)** — "Bash tool EINVAL on Windows". 동일 증상, Windows + MSYS bash 환경. 비ASCII 사용자명(일본어)이 포함된 환경이었으나 TEMP 경로를 ASCII로 변경해도 미해결.

### 관련 이슈 (Windows/MSYS Bash tool 문제 계열)

| Issue | 핵심 |
|-------|------|
| [#9883](https://github.com/anthropics/claude-code/issues/9883) | MSYS에서 `cygpath` 미발견으로 Bash tool 실패 |
| [#26505](https://github.com/anthropics/claude-code/issues/26505) | WSL bash + Git Bash PATH 공존 시 조용히 실패 |
| [#18748](https://github.com/anthropics/claude-code/issues/18748) | MINGW64에서 Bash tool 출력이 빈 값 |
| [#15832](https://github.com/anthropics/claude-code/issues/15832) | Atomic write 시 임시 settings 파일에서 EINVAL |
| [#18665](https://github.com/anthropics/claude-code/issues/18665) | `.claude` 디렉토리 watching 시 EINVAL |

### 알려진 Workaround

| 방법 | 설명 | 효과 |
|------|------|------|
| 환경변수 설정 | `CLAUDE_CODE_GIT_BASH_PATH=C:\Program Files\git\bin\bash.exe` | 일부 해결 보고 |
| `preferredShell` 설정 | Claude Code 설정에서 shell 경로 명시 | 동일 |
| WSL2 전환 | Git Bash 대신 WSL2에서 실행 | 근본적 우회 |
| 버전 변경 | v1.0.72가 안정적이라는 보고 | 2.1.53에서의 회귀 가능성 |

### 근본 원인 추정

Node.js `fs.open()`이 MSYS 환경에서 Windows temp 경로의 `.output` 파일을 생성할 때 경로/플래그 호환 문제 발생. Bash tool 전용 경로이므로 다른 도구(Glob, Read 등)는 영향 없음.

## 해결

### Workaround 적용 (2026-02-25)

`CLAUDE_CODE_GIT_BASH_PATH=C:\Program Files\git\bin\bash.exe` 환경변수 설정으로 임시 해결.

### 공식 수정 확인 (2026-02-25)

- **v2.1.55**에서 Anthropic이 공식 수정 ([#28348 코멘트](https://github.com/anthropics/claude-code/issues/28348#issuecomment-3956537387))
- 근본 원인: v2.1.53 회귀 버그. Windows 전체에 영향 (비ASCII 사용자명과 무관)
- workaround 환경변수 제거 후 검증:
  - `echo "EINVAL test ok"` → 정상 출력
  - `git status` → 정상 출력
- **결론**: v2.1.55 이상에서는 `CLAUDE_CODE_GIT_BASH_PATH` 환경변수 불필요. 제거 완료.
