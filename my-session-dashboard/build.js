#!/usr/bin/env node
// build.js — Claude Code JSONL 세션을 self-contained 대시보드 HTML로 변환 (증분 빌드)
const fs = require("fs");
const path = require("path");

const CLAUDE_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE,
  ".claude"
);
const PROJECTS_DIR = path.join(CLAUDE_DIR, "projects");
const DIST_DIR = path.join(__dirname, "..", "output", "session-dashboard");
const CACHE_FILE = path.join(DIST_DIR, ".build-cache.json");

const STOPWORDS = new Set([
  // 조사
  "은", "는", "이", "가", "을", "를", "에", "에서", "의", "와", "과",
  "도", "만", "로", "으로", "부터", "까지", "에게", "한테", "께",
  // 대명사/지시어
  "나", "너", "우리", "저", "이것", "그것", "저것", "여기", "거기",
  "이", "그", "저", "것", "거", "뭐", "어떤",
  // 접속/부사
  "그리고", "그래서", "하지만", "그런데", "또", "더", "좀", "잘",
  "매우", "아주", "정말", "진짜", "너무",
  // 동사/형용사 어미
  "하다", "되다", "있다", "없다", "같다",
  // 일반
  "수", "등", "때", "중", "위", "후", "안", "밖",
  // 영어 불용어
  "the", "a", "an", "is", "are", "was", "were", "be", "been",
  "have", "has", "had", "do", "does", "did", "will", "would",
  "could", "should", "may", "might", "can", "shall",
  "i", "you", "he", "she", "it", "we", "they", "me", "my",
  "your", "his", "her", "its", "our", "their",
  "this", "that", "these", "those", "what", "which", "who",
  "in", "on", "at", "to", "for", "of", "with", "by", "from",
  "and", "or", "but", "not", "so", "if", "then",
  "how", "please", "help", "want", "need", "make", "let",
  // 시스템 태그 잔여물
  "command", "message", "name", "args", "local", "caveat",
  "ide", "opened", "file", "user", "system", "reminder",
  "screenshot", "pasted", "image", "png", "jpg", "jpeg",
  // Plan 실행 boilerplate
  "implement", "following", "plan", "context", "resume",
  // 경로 조각
  "users", "claude", "cloudsync", "download",
]);

function stripSystemTags(text) {
  if (!text) return "";
  text = text.replace(
    /<(command-message|command-name|command-args|local-command-caveat|ide_opened_file|system-reminder|user-prompt-submit-hook|antml:\w+)[^>]*>[\s\S]*?<\/\1>/gi,
    ""
  );
  text = text.replace(
    /<\/?(command-message|command-name|command-args|local-command-caveat|ide_opened_file|system-reminder|user-prompt-submit-hook|antml:\w+)[^>]*>/gi,
    ""
  );
  return text.trim();
}

function extractKeywords(text, count = 3) {
  if (!text) return [];

  const words = text
    .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => {
      if (w.length <= 1) return false;
      if (STOPWORDS.has(w)) return false;
      if (/^\d+$/.test(w)) return false;
      if (/^[0-9a-f]{8,}$/.test(w)) return false;
      if (/^\d{4}-?\d{2}-?\d{2}/.test(w)) return false;
      return true;
    });

  const seen = new Set();
  const unique = [];
  for (const w of words) {
    if (!seen.has(w)) {
      seen.add(w);
      unique.push(w);
    }
  }

  return unique.slice(0, count);
}

// 여러 소스에서 키워드 폴백 추출
function extractKeywordsWithFallback(entries) {
  // 1차: 첫 번째 user 메시지
  for (const entry of entries) {
    if (entry.type === "user" && entry.message?.content) {
      const text = stripSystemTags(getTextContent(entry.message.content));
      const kw = extractKeywords(text);
      if (kw.length > 0) return { keywords: kw, firstMessage: text };
    }
  }

  // 2차: 두 번째~세 번째 user 메시지
  let userCount = 0;
  for (const entry of entries) {
    if (entry.type === "user" && entry.message?.content) {
      userCount++;
      if (userCount <= 1) continue;
      if (userCount > 3) break;
      const text = stripSystemTags(getTextContent(entry.message.content));
      const kw = extractKeywords(text);
      if (kw.length > 0) return { keywords: kw, firstMessage: text };
    }
  }

  // 3차: 첫 번째 assistant 텍스트 응답
  for (const entry of entries) {
    if (entry.type === "assistant" && entry.message?.content) {
      if (Array.isArray(entry.message.content)) {
        for (const block of entry.message.content) {
          if (block.type === "text" && block.text) {
            const kw = extractKeywords(block.text);
            if (kw.length > 0) return { keywords: kw, firstMessage: "" };
          }
        }
      }
    }
  }

  // 4차: 도구 이름 + 프로젝트명 폴백
  const toolSet = new Set();
  for (const entry of entries) {
    if (entry.type === "assistant" && entry.message?.content) {
      if (Array.isArray(entry.message.content)) {
        for (const block of entry.message.content) {
          if (block.type === "tool_use" && block.name) {
            toolSet.add(block.name);
          }
        }
      }
    }
  }
  const cwd = findCwd(entries);
  const projectName = cwd ? cwd.split(/[/\\]/).pop() : "";
  const fallback = [];
  if (projectName) fallback.push(projectName);
  for (const t of toolSet) {
    if (fallback.length >= 3) break;
    fallback.push(t);
  }

  return { keywords: fallback.slice(0, 3), firstMessage: "" };
}

function getTextContent(content) {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    const textBlock = content.find((b) => b.type === "text");
    if (textBlock) return textBlock.text;
  }
  return "";
}

function getTextFromMessage(msg) {
  if (!msg?.content) return "";
  if (typeof msg.content === "string") return msg.content;
  if (Array.isArray(msg.content)) {
    return msg.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
  }
  return "";
}

function parseJSONL(filePath) {
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n").filter((l) => l.trim());
  const entries = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      // skip
    }
  }
  return entries;
}

function formatTimestamp(isoStr) {
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}${mm}${dd}_${hh}${min}`;
}

function normalizeProjectPath(p) {
  if (!p) return "";
  return p.replace(/^([a-z]):/, (_, letter) => letter.toUpperCase() + ":");
}

function processSession(filePath) {
  const entries = parseJSONL(filePath);
  if (entries.length === 0) return null;

  const sessionId = path.basename(filePath, ".jsonl");
  const firstEntry = entries[0];
  const lastEntry = entries[entries.length - 1];

  const timestamp = firstEntry.timestamp;
  if (!timestamp || isNaN(new Date(timestamp).getTime())) return null;

  // 키워드 폴백 추출
  const { keywords, firstMessage } = extractKeywordsWithFallback(entries);
  const timeStr = formatTimestamp(timestamp);
  const title = [timeStr, ...keywords].join("_");

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let messageCount = 0;
  let toolUseCount = 0;
  const models = new Set();
  const toolNames = {};
  const messages = [];

  for (const entry of entries) {
    if (entry.type === "user") {
      messageCount++;
      const rawText = getTextFromMessage(entry.message);
      messages.push({
        role: "user",
        text: stripSystemTags(rawText),
        timestamp: entry.timestamp,
      });
    } else if (entry.type === "assistant" && entry.message) {
      const msg = entry.message;
      if (msg.model) models.add(msg.model);
      if (msg.usage) {
        totalInputTokens +=
          (msg.usage.input_tokens || 0) +
          (msg.usage.cache_creation_input_tokens || 0) +
          (msg.usage.cache_read_input_tokens || 0);
        totalOutputTokens += msg.usage.output_tokens || 0;
      }
      if (Array.isArray(msg.content)) {
        const textParts = [];
        const tools = [];
        for (const block of msg.content) {
          if (block.type === "text" && block.text) {
            textParts.push(block.text);
          } else if (block.type === "tool_use") {
            toolUseCount++;
            const name = block.name || "unknown";
            toolNames[name] = (toolNames[name] || 0) + 1;
            tools.push({ name, input: block.input });
          } else if (block.type === "thinking" && block.thinking) {
            textParts.push(`[thinking] ${block.thinking}`);
          }
        }
        if (textParts.length > 0 || tools.length > 0) {
          const msgObj = { role: "assistant", timestamp: entry.timestamp };
          if (textParts.length > 0) msgObj.text = textParts.join("\n");
          if (tools.length > 0) msgObj.tools = tools;
          messages.push(msgObj);
        }
      }
    }
  }

  // Merge streaming chunks
  const mergedMessages = [];
  for (const msg of messages) {
    const prev = mergedMessages[mergedMessages.length - 1];
    if (
      prev &&
      prev.role === "assistant" &&
      msg.role === "assistant" &&
      prev.timestamp === msg.timestamp
    ) {
      if (msg.text) {
        prev.text = prev.text ? prev.text + "\n" + msg.text : msg.text;
      }
      if (msg.tools) {
        prev.tools = prev.tools ? [...prev.tools, ...msg.tools] : msg.tools;
      }
    } else {
      mergedMessages.push({ ...msg });
    }
  }

  const project = normalizeProjectPath(findCwd(entries));

  // firstMessage: 시스템 태그 제거된 첫 user 메시지 (폴백에서 가져옴)
  const displayFirstMsg = firstMessage || stripSystemTags(
    messages.find((m) => m.role === "user")?.text || ""
  );

  const metadata = {
    sessionId,
    title,
    keywords,
    timestamp,
    lastTimestamp: lastEntry.timestamp,
    project,
    gitBranch: entries.find((e) => e.gitBranch)?.gitBranch || "",
    models: [...models],
    messageCount,
    toolUseCount,
    totalInputTokens,
    totalOutputTokens,
    toolNames,
    firstMessage: displayFirstMsg.substring(0, 200),
    projectDisplay: project,
  };

  return { metadata, messages: mergedMessages };
}

function findCwd(entries) {
  for (const entry of entries) {
    if (entry.cwd) return entry.cwd;
  }
  return "";
}

// ── 캐시 관리 ──
function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8"));
    }
  } catch {
    // 캐시 손상 시 무시
  }
  return {};
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache));
}

function main() {
  console.log("Claude Session Dashboard — 빌드 시작\n");

  if (!fs.existsSync(PROJECTS_DIR)) {
    console.error(
      `❌ Claude 프로젝트 디렉토리를 찾을 수 없습니다: ${PROJECTS_DIR}`
    );
    process.exit(1);
  }

  fs.mkdirSync(DIST_DIR, { recursive: true });

  const htmlSrc = path.join(__dirname, "index.html");
  const htmlDest = path.join(DIST_DIR, "index.html");

  const cache = loadCache();
  const newCache = {};
  const allResults = [];
  let newCount = 0;
  let cachedCount = 0;

  const projects = fs.readdirSync(PROJECTS_DIR);

  for (const projectDir of projects) {
    const projectPath = path.join(PROJECTS_DIR, projectDir);
    if (!fs.statSync(projectPath).isDirectory()) continue;

    const files = fs.readdirSync(projectPath);
    for (const file of files) {
      if (!file.endsWith(".jsonl")) continue;
      const filePath = path.join(projectPath, file);
      const sessionId = path.basename(file, ".jsonl");

      try {
        const stat = fs.statSync(filePath);
        const mtime = stat.mtimeMs;

        // 캐시 히트: mtime 동일하면 재사용
        if (cache[sessionId] && cache[sessionId].mtime === mtime) {
          const cached = cache[sessionId];
          if (cached.metadata.messageCount > 0) {
            allResults.push({
              metadata: cached.metadata,
              messages: cached.messages,
            });
            newCache[sessionId] = cached;
            cachedCount++;
          }
          continue;
        }

        // 캐시 미스: 새로 처리
        const result = processSession(filePath);
        if (!result) continue;
        if (result.metadata.messageCount === 0) continue;
        allResults.push(result);
        newCache[sessionId] = {
          mtime,
          metadata: result.metadata,
          messages: result.messages,
        };
        newCount++;
      } catch (err) {
        console.warn(`⚠️  세션 파싱 실패: ${file} — ${err.message}`);
      }
    }
  }

  // Sort newest first
  allResults.sort(
    (a, b) => new Date(b.metadata.timestamp) - new Date(a.metadata.timestamp)
  );

  const allSessions = allResults.map((r) => r.metadata);
  const sessionsData = {};
  for (const r of allResults) {
    sessionsData[r.metadata.sessionId] = r.messages;
  }

  // Build self-contained HTML
  const metaJson = JSON.stringify(allSessions).replace(/<\//g, "<\\/");
  const dataJson = JSON.stringify(sessionsData).replace(/<\//g, "<\\/");
  let html = fs.readFileSync(htmlSrc, "utf8");
  const dataScript = `<script>
window.__SESSIONS_META__ = ${metaJson};
window.__SESSIONS_DATA__ = ${dataJson};
</script>`;
  html = html.replace("<!-- __SESSION_DATA__ -->", dataScript);
  fs.writeFileSync(htmlDest, html);

  // 캐시 저장
  saveCache(newCache);

  console.log(`✅ ${allResults.length}개 세션 (신규 ${newCount}, 캐시 ${cachedCount})`);
  console.log(`📁 출력: ${htmlDest}`);
  console.log(`\n🌐 브라우저에서 열기: ${htmlDest}`);
}

main();
