#!/usr/bin/env node
// ensure-commands.js — 플러그인의 commands/*.md를 ~/.claude/commands/에 자동 등록
const fs = require("fs");
const path = require("path");

const PLUGIN_ROOT = path.resolve(__dirname, "..");
const COMMANDS_SRC = path.join(PLUGIN_ROOT, "commands");
const COMMANDS_DEST = path.join(
  process.env.HOME || process.env.USERPROFILE,
  ".claude",
  "commands"
);

if (!fs.existsSync(COMMANDS_SRC)) {
  process.exit(0);
}

fs.mkdirSync(COMMANDS_DEST, { recursive: true });

const created = [];
for (const file of fs.readdirSync(COMMANDS_SRC)) {
  if (!file.endsWith(".md")) continue;
  const src = path.join(COMMANDS_SRC, file);
  const dest = path.join(COMMANDS_DEST, file);
  if (fs.existsSync(dest)) {
    const srcContent = fs.readFileSync(src, "utf8");
    const destContent = fs.readFileSync(dest, "utf8");
    if (srcContent === destContent) continue;
    fs.copyFileSync(src, dest);
    created.push("/" + file.replace(".md", "") + " (updated)");
  } else {
    fs.copyFileSync(src, dest);
    created.push("/" + file.replace(".md", ""));
  }
}

if (created.length > 0) {
  console.log(`[my-session-wrap] 커맨드 자동 등록: ${created.join(", ")}`);
}
