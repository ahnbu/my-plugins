---
name: session-id
description: This skill should be used when the user asks to check, show, or verify the current session ID, hook firing status, or session isolation. Trigger phrases include "session id", "세션 ID 확인", "세션 아이디", "세션 ID 출력", "훅 상태 확인", "현재 세션 확인", "hook 동작 확인", "세션 격리 확인". Reads 3 hook-captured files and outputs a comparison table with a verdict on session integrity.
---

# Session ID Checker

Read 3 hook-captured session ID files and output a comparison table to verify the current session's identity and hook firing status.

## File Locations

Each hook event writes a JSON file under the project's `.claude/` directory:

| Hook Event | File |
|------------|------|
| SessionStart | `.claude/.session-id-start` |
| UserPromptSubmit | `.claude/.session-id-prompt` |
| Stop | `.claude/.session-id-stop` |

Each file contains:
```json
{
  "session_id": "uuid-string",
  "event": "SessionStart",
  "timestamp": "2026-02-24T10:00:00.000Z"
}
```

## Procedure

### 1. Read All Files

Read all 3 files in parallel using the Read tool. Missing files are expected — Stop only fires at session end.

### 2. Build Comparison Table

Output the following table:

```
## 세션 ID 비교

| 훅 이벤트 | 세션 ID | 타임스탬프 | 상태 |
|-----------|---------|-----------|------|
| SessionStart | abc-123... | 2026-02-24T10:00:00Z | ✅ OK |
| UserPromptSubmit | abc-123... | 2026-02-24T10:01:00Z | ✅ OK |
| Stop | (파일 없음) | - | ⏳ 미발동 |
```

### 3. Verdict

Apply these rules:

- **All IDs match** → "정상 — 동일 세션에서 캡처됨"
- **ID mismatch detected** → "경고 — 크로스세션 오염 가능성" + highlight mismatched rows
- **File missing** → "미발동" (Stop missing during active session is normal)
- **All files missing** → "훅 미설치 — plugin update 필요"

### 4. Notes

- Stop hook fires only at session end; missing `.session-id-stop` during an active session is expected.
- UserPromptSubmit overwrites on every prompt, so its timestamp is always the most recent.
- Files are stored per-project (`cwd` from hook stdin), ensuring multi-session isolation.
