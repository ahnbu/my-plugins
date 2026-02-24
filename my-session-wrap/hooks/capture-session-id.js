#!/usr/bin/env node
// capture-session-id.js — 디버그 모드 (3개 이벤트 병렬 테스트)
// CLI 인자로 이벤트명을 받아 로그에 구분 기록
// stdout(→ Claude 응답) + 파일(~/hook-debug.log) 이중 출력
const fs = require("fs");
const path = require("path");
const HOME = process.env.HOME || process.env.USERPROFILE;
const LOG = path.join(HOME, "hook-debug.log");
const EVENT = process.argv[2] || "unknown";
const ts = () => new Date().toISOString();

function log(msg) {
  console.log(msg);
  try { fs.appendFileSync(LOG, msg + "\n"); } catch (_) {}
}

// STEP 1: 훅 발동 확인 — stdin 이벤트와 무관하게 즉시
log(`[${ts()}] STEP1: ${EVENT} fired (pid=${process.pid})`);

let input = "";
process.stdin.on("data", (chunk) => { input += chunk; });

process.stdin.on("end", () => {
  // STEP 2: stdin 수신 확인
  log(`[${ts()}] STEP2(${EVENT}): stdin=${input.length} bytes`);
  log(`  raw: ${input.substring(0, 300)}`);

  if (!input) {
    log(`  => ABORT: stdin empty`);
    return;
  }

  try {
    const data = JSON.parse(input);
    const sessionId = data.session_id;
    const cwd = data.cwd;

    // STEP 3: 필드 존재 확인
    log(`[${ts()}] STEP3(${EVENT}): keys=[${Object.keys(data).join(",")}]`);
    log(`  session_id=${sessionId || "(없음)"}`);
    log(`  cwd=${cwd || "(없음)"}`);

    if (sessionId && cwd) {
      const dest = path.join(cwd, ".claude", ".current-session-id");
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, sessionId);
      log(`  => WRITTEN: ${dest}`);
    } else {
      log(`  => SKIPPED: missing ${!sessionId ? "session_id" : "cwd"}`);
    }
  } catch (e) {
    log(`  => ERROR: ${e.message}`);
  }
});
