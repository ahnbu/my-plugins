#!/usr/bin/env node
// build.js — Claude Code JSONL 세션을 대시보드용 JSON으로 변환
const fs = require("fs");
const path = require("path");

const CLAUDE_DIR = path.join(
  process.env.HOME || process.env.USERPROFILE,
  ".claude"
);
const PROJECTS_DIR = path.join(CLAUDE_DIR, "projects");
const DIST_DIR = path.join(CLAUDE_DIR, "session-dashboard");
const SESSIONS_DIR = path.join(DIST_DIR, "sessions");

// 한국어 불용어 (조사, 접속사, 대명사 등)
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
]);

function extractKeywords(text, count = 3) {
  if (!text) return [];

  // 특수문자 제거, 공백으로 분리
  const words = text
    .replace(/[^\w\sㄱ-ㅎㅏ-ㅣ가-힣-]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim().toLowerCase())
    .filter((w) => {
      if (w.length <= 1) return false;
      if (STOPWORDS.has(w)) return false;
      if (/^\d+$/.test(w)) return false;
      return true;
    });

  // 중복 제거하면서 순서 유지
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

function getFirstUserMessage(entries) {
  for (const entry of entries) {
    if (entry.type === "user" && entry.message?.content) {
      const content = entry.message.content;
      if (typeof content === "string") return content;
      // content가 배열인 경우
      if (Array.isArray(content)) {
        const textBlock = content.find((b) => b.type === "text");
        if (textBlock) return textBlock.text;
      }
    }
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
      // 파싱 실패한 줄은 스킵
    }
  }
  return entries;
}

function formatTimestamp(isoStr) {
  const d = new Date(isoStr);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${yyyy}${mm}${dd}_${hh}${min}`;
}

function processSession(filePath) {
  const entries = parseJSONL(filePath);
  if (entries.length === 0) return null;

  const sessionId = path.basename(filePath, ".jsonl");
  const firstEntry = entries[0];
  const lastEntry = entries[entries.length - 1];

  // 첫 번째 사용자 메시지에서 키워드 추출
  const firstUserMsg = getFirstUserMessage(entries);
  const keywords = extractKeywords(firstUserMsg);
  const timeStr = formatTimestamp(firstEntry.timestamp);
  const title = [timeStr, ...keywords].join("_");

  // 통계 계산
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let messageCount = 0;
  let toolUseCount = 0;
  const models = new Set();
  const toolNames = {};

  // 대화 내용 구성
  const messages = [];

  for (const entry of entries) {
    if (entry.type === "user") {
      messageCount++;
      messages.push({
        role: "user",
        text: getTextFromMessage(entry.message),
        timestamp: entry.timestamp,
      });
    } else if (entry.type === "assistant" && entry.message) {
      const msg = entry.message;
      if (msg.model) models.add(msg.model);

      // 토큰 사용량
      if (msg.usage) {
        totalInputTokens +=
          (msg.usage.input_tokens || 0) +
          (msg.usage.cache_creation_input_tokens || 0) +
          (msg.usage.cache_read_input_tokens || 0);
        totalOutputTokens += msg.usage.output_tokens || 0;
      }

      // 내용 분석
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
            tools.push({
              name,
              input: block.input,
            });
          } else if (block.type === "thinking" && block.thinking) {
            // thinking은 별도로 저장
            textParts.push(`[thinking] ${block.thinking}`);
          }
        }

        if (textParts.length > 0 || tools.length > 0) {
          const msgObj = {
            role: "assistant",
            timestamp: entry.timestamp,
          };
          if (textParts.length > 0) msgObj.text = textParts.join("\n");
          if (tools.length > 0) msgObj.tools = tools;
          messages.push(msgObj);
        }
      }
    } else if (entry.type === "tool_result" || entry.type === "progress") {
      // tool_result는 별도로 처리하지 않음 (tool_use에서 이미 캡처)
    }
  }

  // 중복 assistant 메시지 병합 (같은 requestId에서 온 스트리밍 청크들)
  const mergedMessages = [];
  for (const msg of messages) {
    const prev = mergedMessages[mergedMessages.length - 1];
    if (
      prev &&
      prev.role === "assistant" &&
      msg.role === "assistant" &&
      prev.timestamp === msg.timestamp
    ) {
      // 같은 타임스탬프의 assistant 메시지 병합
      if (msg.text) {
        prev.text = prev.text ? prev.text + "\n" + msg.text : msg.text;
      }
      if (msg.tools) {
        prev.tools = prev.tools
          ? [...prev.tools, ...msg.tools]
          : msg.tools;
      }
    } else {
      mergedMessages.push({ ...msg });
    }
  }

  const metadata = {
    sessionId,
    title,
    keywords,
    timestamp: firstEntry.timestamp,
    lastTimestamp: lastEntry.timestamp,
    project: findCwd(entries),
    gitBranch: entries.find((e) => e.gitBranch)?.gitBranch || "",
    models: [...models],
    messageCount,
    toolUseCount,
    totalInputTokens,
    totalOutputTokens,
    toolNames,
    firstMessage: firstUserMsg.substring(0, 200),
  };

  return { metadata, messages: mergedMessages };
}

function findCwd(entries) {
  for (const entry of entries) {
    if (entry.cwd) return entry.cwd;
  }
  return "";
}

function main() {
  console.log("Claude Session Dashboard — 빌드 시작\n");

  if (!fs.existsSync(PROJECTS_DIR)) {
    console.error(`❌ Claude 프로젝트 디렉토리를 찾을 수 없습니다: ${PROJECTS_DIR}`);
    process.exit(1);
  }

  // 출력 디렉토리 생성
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });

  // HTML 템플릿 복사
  const htmlSrc = path.join(__dirname, "index.html");
  const htmlDest = path.join(DIST_DIR, "index.html");
  if (fs.existsSync(htmlSrc)) {
    fs.copyFileSync(htmlSrc, htmlDest);
  }

  const allSessions = [];
  const projects = fs.readdirSync(PROJECTS_DIR);

  for (const projectDir of projects) {
    const projectPath = path.join(PROJECTS_DIR, projectDir);
    if (!fs.statSync(projectPath).isDirectory()) continue;

    const files = fs.readdirSync(projectPath);

    for (const file of files) {
      if (!file.endsWith(".jsonl")) continue;

      const filePath = path.join(projectPath, file);
      try {
        const result = processSession(filePath);
        if (!result) continue;

        result.metadata.projectDisplay = result.metadata.project;
        allSessions.push(result.metadata);

        // 개별 세션 대화 저장
        const sessionFile = path.join(
          SESSIONS_DIR,
          `${result.metadata.sessionId}.json`
        );
        fs.writeFileSync(
          sessionFile,
          JSON.stringify(result.messages, null, 2)
        );
      } catch (err) {
        console.warn(`⚠️  세션 파싱 실패: ${file} — ${err.message}`);
      }
    }
  }

  // 최신순 정렬
  allSessions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // 메타데이터 저장
  fs.writeFileSync(
    path.join(DIST_DIR, "sessions.json"),
    JSON.stringify(allSessions, null, 2)
  );

  console.log(`✅ ${allSessions.length}개 세션 처리 완료`);
  console.log(`📁 출력: ${DIST_DIR}/`);
  console.log(`   - sessions.json (메타데이터)`);
  console.log(`   - sessions/*.json (대화 내용)`);
  console.log(`\n🌐 브라우저에서 열기: ${path.join(DIST_DIR, "index.html")}`);
}

main();
