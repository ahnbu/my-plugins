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

━━━ 플러그인 업데이트 순서 (A. 기존 플러그인) ━━━
1. git push (개발 레포)
2. cd ~/.claude/plugins/marketplaces/my-claude-plugins && git pull
3. cp -r <marketplace>/<plugin>/. <cache>/<plugin>/<version>/
4. installed_plugins.json → version, installPath, gitCommitSha 업데이트
5. diff로 검증

━━━ 신규 플러그인 설치 순서 (B) ━━━
1. marketplace git pull
2. cache 디렉토리 생성 + cp -r (숨김폴더 포함, /* 아닌 /. 사용)
3. installed_plugins.json 항목 추가
4. settings.json → enabledPlugins 추가
5. diff로 검증

⚠️  순서 위반 금지. 임의 판단으로 단계 스킵 금지.
    `);
  } catch (_) {}
});
