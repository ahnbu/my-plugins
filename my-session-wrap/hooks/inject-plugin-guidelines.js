#!/usr/bin/env node
// inject-plugin-guidelines.js — my-claude-plugins 폴더에서 세션 시작 시
// CLAUDE.md 핵심 절차를 강조 주입하여 준수 유도
let input = "";
process.stdin.on("data", (chunk) => { input += chunk; });

process.stdin.on("end", () => {
  if (!input) return;
  try {
    const data = JSON.parse(input);
    const { cwd } = data;
    if (!cwd) return;
    if (!cwd.replace(/\\/g, "/").includes("my-claude-plugins")) return;

    console.log(`
⚠️  [플러그인 개발 폴더 감지] 작업 전 아래 절차를 반드시 확인하라.

━━━ 배포 절차 (정식) ━━━
1. git push
2. /plugin update  ← Claude Code가 marketplace pull + cache 반영 자동 처리

━━━ EEXIST 버그 활성 중이면 ━━━
정식 절차 대신 CLAUDE.md의 "EEXIST 버그 워크어라운드" 절차(A/B)를 따를 것.
버그 수정 확인 방법: /plugin update 실행 후 정상 동작 여부 확인.

⚠️  순서 위반 금지. 임의 판단으로 단계 스킵 금지.
    `);
  } catch (_) {}
});
