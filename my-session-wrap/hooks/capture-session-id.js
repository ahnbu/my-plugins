#!/usr/bin/env node
// capture-session-id.js — 세션 ID 기록
// 1차: CLAUDE_ENV_FILE (per-session 환경변수, 멀티세션 안전)
// 2차: .claude/.current-session-id 파일 (단일세션 fallback)
const fs = require("fs");
const path = require("path");

let input = "";
process.stdin.on("data", (chunk) => { input += chunk; });

process.stdin.on("end", () => {
  if (!input) return;
  try {
    const data = JSON.parse(input);
    const { session_id, cwd } = data;
    if (!session_id) return;

    // 1차: CLAUDE_ENV_FILE — 세션별 독립 env 파일 → 멀티세션 충돌 없음
    const envFile = process.env.CLAUDE_ENV_FILE;
    if (envFile) {
      fs.appendFileSync(envFile, `export CLAUDE_SESSION_ID=${session_id}\n`);
    }

    // 2차: 파일 기반 fallback
    if (cwd) {
      const dest = path.join(cwd, ".claude", ".current-session-id");
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, session_id);
    }
  } catch (_) {}
});
