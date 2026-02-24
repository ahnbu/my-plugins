#!/usr/bin/env node
// capture-session-id.js — UserPromptSubmit hook에서 session_id를 캡처하여 파일로 저장
// Claude Code는 모든 hook에 JSON을 stdin으로 전달하며, session_id 필드를 포함한다.
// cwd/.claude/.current-session-id에 기록하면 wrap 스킬에서 읽어서 handoff에 포함 가능.
const fs = require("fs");
const path = require("path");

let input = "";
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", () => {
  try {
    const data = JSON.parse(input);
    const sessionId = data.session_id;
    const cwd = data.cwd;
    if (sessionId && cwd) {
      const dir = path.join(cwd, ".claude");
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, ".current-session-id"), sessionId);
    }
  } catch (e) {
    // hook 실패가 세션에 영향 주지 않도록 무시
  }
});
