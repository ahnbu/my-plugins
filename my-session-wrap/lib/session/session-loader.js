"use strict";

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

// DB 우선 파일 경로 조회 — DFS 생략 최적화
const DEFAULT_DB_PATH = path.join(
  __dirname, "..", "..", "..", "output", "session-dashboard", "sessions.db"
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

/**
 * DB에서 정규화된 이벤트까지 읽기 (SessionDB.syncSingleSession + getEvents)
 * @returns {{ events, dbSubagents } | null}
 */
function _loadEventsFromDb(sessionId, dbPath) {
  try {
    const { SessionDB } = require(path.join(__dirname, "../../../shared/session-db.js"));
    const db = new SessionDB(dbPath);
    db.syncSingleSession(sessionId, { force: true });
    const allEvents = db.getEvents(sessionId);
    db.close();

    if (allEvents.length === 0) return null;

    const events = allEvents.filter((e) => e.source === "main" || !e.source);
    const subagentMap = new Map();
    for (const e of allEvents) {
      if (e.source === "subagent" && e.agentId) {
        if (!subagentMap.has(e.agentId)) subagentMap.set(e.agentId, []);
        subagentMap.get(e.agentId).push(e);
      }
    }
    const dbSubagents = Array.from(subagentMap.entries()).map(([agentId, agentEvents]) => ({
      agentId,
      events: agentEvents,
      filePath: "",
      firstTimestampMs: agentEvents[0]?.timestampMs ?? null,
      lastTimestampMs: agentEvents[agentEvents.length - 1]?.timestampMs ?? null,
    }));

    return { events, dbSubagents };
  } catch {
    return null;
  }
}

function loadSessionBundle(sessionId, options = {}) {
  if (!sessionId) {
    throw new Error("sessionId is required");
  }

  const claudeProjectsDir = resolveProjectsDir(options);

  // DB 우선 조회 — events까지 직접 읽기 (syncSingleSession + getEvents)
  // options.dbPath === false 로 명시적 비활성화 가능
  if (options.dbPath !== false) {
    const dbPath = options.dbPath || (fs.existsSync(DEFAULT_DB_PATH) ? DEFAULT_DB_PATH : null);
    if (dbPath) {
      const dbResult = _loadEventsFromDb(sessionId, dbPath);
      if (dbResult) {
        const mainFilePath = _getFilePathFromDb(sessionId, dbPath) || "";
        return {
          claudeProjectsDir,
          mainEntries: [],
          mainFilePath,
          sessionId,
          subagentFiles: [],
          subagents: [],
          fromDb: true,
          events: dbResult.events,
          dbSubagents: dbResult.dbSubagents,
        };
      }
    }
  }

  // JSONL 폴백 — DB 없거나 이벤트 조회 실패 시
  let mainFilePath = "";
  if (!fs.existsSync(claudeProjectsDir)) {
    throw new Error(`Claude projects directory not found: ${claudeProjectsDir}`);
  }
  mainFilePath = findSessionFile(sessionId, claudeProjectsDir);

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
