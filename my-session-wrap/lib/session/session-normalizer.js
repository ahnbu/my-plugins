"use strict";

const {
  normalizeEntries,
} = require("../../../shared/session-parser.js");

function normalizeSessionBundle(bundle, options = {}) {
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
