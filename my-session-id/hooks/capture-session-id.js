#!/usr/bin/env node
// capture-session-id.js — 훅 이벤트별 세션 ID를 별도 파일에 저장
const fs = require("fs");
const path = require("path");

const EVENT = process.argv[2] || "unknown";

const FILE_MAP = {
  SessionStart: ".session-id-start",
  UserPromptSubmit: ".session-id-prompt",
  Stop: ".session-id-stop",
};

const fileName = FILE_MAP[EVENT];
if (!fileName) {
  process.exit(1);
}

let input = "";
process.stdin.on("data", (chunk) => { input += chunk; });

process.stdin.on("end", () => {
  if (!input) return;

  try {
    const data = JSON.parse(input);
    const sessionId = data.session_id;
    const cwd = data.cwd;

    if (!sessionId || !cwd) return;

    const dest = path.join(cwd, ".claude", fileName);
    fs.mkdirSync(path.dirname(dest), { recursive: true });

    const payload = JSON.stringify({
      session_id: sessionId,
      event: EVENT,
      timestamp: new Date().toISOString(),
    }, null, 2);

    fs.writeFileSync(dest, payload);
  } catch (_) {
    // 훅이 세션을 방해하면 안 되므로 조용히 실패
  }
});
