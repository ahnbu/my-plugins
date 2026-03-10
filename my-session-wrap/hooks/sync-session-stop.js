#!/usr/bin/env node
// sync-session-stop.js — Stop 훅: 현재 세션 events DB upsert (Hybrid C)
// mtime 변경 없으면 force sync, 수십ms 완료 후 return

"use strict";

const path = require("node:path");
const fs = require("node:fs");

const DB_PATH = path.join(
  __dirname, "..", "..", "output", "session-dashboard", "sessions.db"
);

let input = "";
process.stdin.on("data", (chunk) => { input += chunk; });

process.stdin.on("end", () => {
  if (!input) return;
  try {
    const data = JSON.parse(input);
    const sessionId = data.session_id;
    if (!sessionId) return;

    if (!fs.existsSync(DB_PATH)) return;

    const { SessionDB } = require(path.join(__dirname, "../../shared/session-db.js"));
    const db = new SessionDB(DB_PATH);
    db.syncSingleSession(sessionId, { force: true });
    db.close();
  } catch (_) {}
});
