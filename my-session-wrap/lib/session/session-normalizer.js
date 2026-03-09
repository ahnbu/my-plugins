"use strict";

const {
  normalizeEntries,
} = require("../../../shared/session-parser.js");

function normalizeSessionBundle(bundle, options = {}) {
  // DB 경로: events가 이미 정규화됨 — normalizeEntries 스킵
  if (bundle.fromDb) {
    const mainEvents = bundle.events;
    return {
      events: mainEvents,
      mainFilePath: bundle.mainFilePath,
      sessionId: bundle.sessionId,
      subagents: bundle.dbSubagents,
      toolUseLookup: Object.fromEntries(
        mainEvents
          .filter((event) => event.kind === "tool_use")
          .map((event) => [event.toolUseId, event.toolName])
      ),
    };
  }

  // JSONL 경로: raw entries를 정규화
  const mainEvents = normalizeEntries(bundle.mainEntries, "main", "");
  const subagents = bundle.subagents.map((subagent) => {
    const events = normalizeEntries(subagent.entries, "subagent", subagent.agentId);
    return {
      agentId: subagent.agentId,
      events,
      filePath: subagent.filePath,
      firstTimestampMs: events[0]?.timestampMs ?? null,
      lastTimestampMs: events[events.length - 1]?.timestampMs ?? null,
    };
  });

  return {
    events: mainEvents,
    mainFilePath: bundle.mainFilePath,
    sessionId: bundle.sessionId,
    subagents,
    toolUseLookup: Object.fromEntries(
      mainEvents
        .filter((event) => event.kind === "tool_use")
        .map((event) => [event.toolUseId, event.toolName])
    ),
  };
}

module.exports = {
  normalizeSessionBundle,
};
