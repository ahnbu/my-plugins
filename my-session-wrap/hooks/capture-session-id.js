#!/usr/bin/env node
// capture-session-id.js — 세션 ID를 .claude/.current-session-id에 기록
const fs = require("fs");
const path = require("path");

let input = "";
process.stdin.on("data", (chunk) => { input += chunk; });

process.stdin.on("end", () => {
  if (!input) return;
  try {
    const data = JSON.parse(input);
    const { session_id, cwd } = data;
    if (session_id && cwd) {
      const dest = path.join(cwd, ".claude", ".current-session-id");
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, session_id);
    }
  } catch (_) {}
});
