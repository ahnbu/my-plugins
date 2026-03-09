"use strict";

const {
  cleanToolResultText,
  extractPaths,
  extractPersistedOutputPath,
  formatClock,
  getToolContext,
  shortenToolName,
  summarizeToolResult,
} = require("./shared.js");

function isMeaningfulToolResult(text) {
  if (!text) return false;
  if (extractPersistedOutputPath(text)) return true;
  if (extractPaths(text).length > 0) return true;

  const compact = text.trim();
  if (!compact) return false;
  if (compact.length > 120) return false;
  if (/Preview \(first/i.test(compact)) return false;
  if (/^\d+[→|]/.test(compact)) return false;
  if (/^Line \d+\s*\|/i.test(compact)) return false;
  if ((compact.match(/\n/g) || []).length > 2) return false;
  return true;
}

function shouldIncludeToolResult(event, policy, toolName) {
  switch (policy) {
    case "none":
      return false;
    case "errors":
      return event.isError;
    case "paths":
      return Boolean(
        toolName &&
          (extractPersistedOutputPath(event.rawText) ||
            extractPaths(event.rawText).length > 0)
      );
    case "all":
      return true;
    case "meaningful":
    default:
      if (event.isError) return true;
      if (!toolName) return false;
      return isMeaningfulToolResult(event.rawText);
  }
}

function buildTranscript(normalized, options = {}) {
  const format = options.format || "markdown";
  const includeTools = !options.noTools;
  const includeThinking = Boolean(options.includeThinking);
  const toolResultsPolicy = options.toolResults || "meaningful";
  const originMs = normalized.events[0]?.timestampMs ?? null;
  const planTimestamps = new Set(
    normalized.events
      .filter((event) => event.kind === "plan_content")
      .map((event) => event.timestamp)
  );

  const entries = [];
  for (const event of normalized.events) {
    if (event.kind === "user_text") {
      const text =
        planTimestamps.has(event.timestamp) &&
        /Implement the following plan:/i.test(event.text)
          ? "Implement the following plan:"
          : event.text;
      entries.push({
        kind: "user_text",
        text,
        timestamp: event.timestamp,
        timeLabel: formatClock(event.timestampMs, originMs),
      });
      continue;
    }

    if (event.kind === "plan_content") {
      entries.push({
        kind: "plan_content",
        text: event.text,
        timestamp: event.timestamp,
        timeLabel: formatClock(event.timestampMs, originMs),
      });
      continue;
    }

    if (event.kind === "assistant_text") {
      entries.push({
        kind: "assistant_text",
        text: event.text,
        timestamp: event.timestamp,
        timeLabel: formatClock(event.timestampMs, originMs),
      });
      continue;
    }

    if (event.kind === "assistant_thinking" && includeThinking) {
      entries.push({
        kind: "assistant_thinking",
        text: event.text,
        timestamp: event.timestamp,
        timeLabel: formatClock(event.timestampMs, originMs),
      });
      continue;
    }

    if (!includeTools) {
      continue;
    }

    if (event.kind === "tool_use") {
      entries.push({
        input: event.input,
        kind: "tool_use",
        text: JSON.stringify(event.input || {}),
        timeLabel: formatClock(event.timestampMs, originMs),
        timestamp: event.timestamp,
        toolName: event.toolName,
        toolUseId: event.toolUseId,
      });
      continue;
    }

    if (event.kind === "tool_result") {
      const toolName = normalized.toolUseLookup[event.toolUseId] || "";
      if (!shouldIncludeToolResult(event, toolResultsPolicy, toolName)) {
        continue;
      }

      entries.push({
        isError: event.isError,
        kind: "tool_result",
        text: summarizeToolResult(event.rawText),
        timeLabel: formatClock(event.timestampMs, originMs),
        timestamp: event.timestamp,
        toolName: toolName || "unknown",
        toolUseId: event.toolUseId,
      });
    }
  }

  if (format === "json") {
    return {
      entries,
      sessionId: normalized.sessionId,
    };
  }

  const lines = [
    "# Session Transcript",
    "",
    `- Session ID: ${normalized.sessionId}`,
    "",
  ];

  const planEntries = entries.filter((entry) => entry.kind === "plan_content");
  if (planEntries.length > 0) {
    lines.push("## Plan", "");
    for (const entry of planEntries) {
      lines.push(entry.text, "");
    }
  }

  lines.push("## Conversation", "");
  let prevKind = null;
  for (const entry of entries) {
    if (entry.kind === "plan_content") continue;

    if (entry.kind === "user_text") {
      if (prevKind !== null) lines.push("---", "");
      lines.push(`**[${entry.timeLabel}] 사용자**`, "", entry.text, "");
      prevKind = entry.kind;
      continue;
    }

    if (entry.kind === "assistant_text") {
      if (prevKind !== null && prevKind !== "tool_use" && prevKind !== "tool_result") {
        lines.push("---", "");
      }
      lines.push(`**[${entry.timeLabel}] 어시스턴트**`, "", entry.text, "");
      prevKind = entry.kind;
      continue;
    }

    if (entry.kind === "assistant_thinking") {
      if (prevKind !== null) lines.push("---", "");
      lines.push(`**[${entry.timeLabel}] 내부 사고**`, "", entry.text, "");
      prevKind = entry.kind;
      continue;
    }

    if (entry.kind === "tool_use") {
      const shortName = shortenToolName(entry.toolName);
      const context = getToolContext(entry.input);
      const contextStr = context ? ` — ${context}` : "";
      lines.push(
        `> **도구** \`${shortName}\`${contextStr}`,
        "> ```json",
        `> ${JSON.stringify(entry.input || {})}`,
        "> ```",
        ""
      );
      prevKind = entry.kind;
      continue;
    }

    if (entry.kind === "tool_result") {
      const shortName = shortenToolName(entry.toolName);
      const cleaned = cleanToolResultText(entry.text);
      const label = entry.isError ? "**에러**" : "결과";
      const resultLines = cleaned.split("\n").map((l) => `> ${l}`).join("\n");
      lines.push(`> ${label} \`${shortName}\``, resultLines, "");
      prevKind = entry.kind;
    }
  }

  return lines.join("\n");
}

module.exports = {
  buildTranscript,
};
