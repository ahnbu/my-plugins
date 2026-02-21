#!/usr/bin/env node
// ensure-commands.js — my-cowork 플러그인 커맨드 자동 등록 (충돌 감지 포함)
const fs = require("fs");
const path = require("path");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
const COMMANDS_SRC = path.join(PLUGIN_ROOT, "commands");
const COMMANDS_DEST = path.join(
  process.env.HOME || process.env.USERPROFILE,
  ".claude",
  "commands"
);

// my-cowork 플러그인이 등록한 커맨드임을 식별하는 마커
const PLUGIN_MARKER = "my-cowork:cowork";

if (!fs.existsSync(COMMANDS_SRC)) {
  process.exit(0);
}

fs.mkdirSync(COMMANDS_DEST, { recursive: true });

const created = [];
const conflicts = [];

for (const file of fs.readdirSync(COMMANDS_SRC)) {
  if (!file.endsWith(".md")) continue;

  const dest = path.join(COMMANDS_DEST, file);
  const commandName = "/" + file.replace(".md", "");

  if (!fs.existsSync(dest)) {
    // 미등록 → 자동 등록
    fs.copyFileSync(path.join(COMMANDS_SRC, file), dest);
    created.push(commandName);
  } else {
    // 이미 존재 → 내용 확인
    const existing = fs.readFileSync(dest, "utf8");

    if (existing.includes(PLUGIN_MARKER)) {
      // 이미 my-cowork 버전 → 스킵
      continue;
    } else {
      // 다른 내용 → 충돌 경고
      conflicts.push({ commandName, dest, existing });
    }
  }
}

if (created.length > 0) {
  console.log(`[my-cowork] 커맨드 자동 등록: ${created.join(", ")}`);
}

if (conflicts.length > 0) {
  console.log("");
  console.log("⚠️  [my-cowork] 커맨드 충돌 감지 — 수동 확인 필요");
  console.log("─".repeat(60));
  for (const { commandName, dest } of conflicts) {
    console.log(`충돌 커맨드: ${commandName}`);
    console.log(`파일 경로:   ${dest}`);
    console.log("");
    console.log("조치 방법:");
    console.log(
      `  1. 덮어쓰기: 파일을 삭제 후 Claude Code를 재시작하면 my-cowork 버전으로 자동 등록`
    );
    console.log(`  2. 유지:     현재 파일 내용을 그대로 사용`);
    console.log(
      `  3. 병합:     파일을 직접 편집하여 "my-cowork:cowork" 참조로 변경`
    );
  }
  console.log("─".repeat(60));
}
