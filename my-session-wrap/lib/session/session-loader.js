"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// DB 우선 파일 경로 조회 — DFS 생략 최적화
const DEFAULT_DB_PATH = path.join(
  os.homedir(), ".claude", "my-claude-plugins", "output", "session-dashboard", "sessions.db"
);

function resolveProjectsDir(options = {}) {
  if (options.claudeProjectsDir) {
    return path.resolve(options.claudeProjectsDir);
  }

  return path.join(os.homedir(), ".claude", "projects");
}

function readJsonl(filePath) {
  return fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function findSessionFile(sessionId, rootDir) {
  const stack = [rootDir];
  const targetFile = `${sessionId}.jsonl`;

  while (stack.length > 0) {
    const currentDir = stack.pop();
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name === targetFile) {
        return fullPath;
      }
    }
  }

  return "";
}

/** DB에서 sessionId의 file_path를 조회 (node:sqlite 직접 사용, 읽기 전용) */
function _getFilePathFromDb(sessionId, dbPath) {
  try {
    const { DatabaseSync } = require("node:sqlite");
    const db = new DatabaseSync(dbPath);
    const row = db.prepare("SELECT file_path FROM sessions WHERE session_id = ?").get(sessionId);
    db.close();
    return row && row.file_path ? row.file_path : null;
  } catch {
    return null;
  }
}

function loadSessionBundle(sessionId, options = {}) {
  if (!sessionId) {
    throw new Error("sessionId is required");
  }

  const claudeProjectsDir = resolveProjectsDir(options);

  // DB 우선 조회 — DB의 file_path로 DFS 생략
  // options.dbPath === false 로 명시적 비활성화 가능
  let mainFilePath = "";
  if (options.dbPath !== false) {
    const dbPath = options.dbPath || (fs.existsSync(DEFAULT_DB_PATH) ? DEFAULT_DB_PATH : null);
    if (dbPath) {
      const fp = _getFilePathFromDb(sessionId, dbPath);
      if (fp && fs.existsSync(fp)) {
        mainFilePath = fp;
      }
    }
  }

  // DFS 폴백
  if (!mainFilePath) {
    if (!fs.existsSync(claudeProjectsDir)) {
      throw new Error(`Claude projects directory not found: ${claudeProjectsDir}`);
    }
    mainFilePath = findSessionFile(sessionId, claudeProjectsDir);
  }

  if (!mainFilePath) {
    throw new Error(`Session file not found for sessionId: ${sessionId}`);
  }

  const mainEntries = readJsonl(mainFilePath);
  const subagentsDir = path.join(path.dirname(mainFilePath), sessionId, "subagents");
  const subagentFiles = fs.existsSync(subagentsDir)
    ? fs
        .readdirSync(subagentsDir)
        .filter((name) => /^agent-.*\.jsonl$/i.test(name))
        .sort()
        .map((name) => path.join(subagentsDir, name))
    : [];

  const subagents = subagentFiles.map((filePath) => ({
    agentId: path.basename(filePath, ".jsonl"),
    filePath,
    entries: readJsonl(filePath),
  }));

  return {
    claudeProjectsDir,
    mainEntries,
    mainFilePath,
    sessionId,
    subagentFiles,
    subagents,
  };
}

module.exports = {
  loadSessionBundle,
  readJsonl,
};
