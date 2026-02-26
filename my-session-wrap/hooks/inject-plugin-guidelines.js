#!/usr/bin/env node
// inject-plugin-guidelines.js — my-claude-plugins 폴더에서 세션 시작 시
// CLAUDE.md 핵심 절차를 강조 주입하여 준수 유도.
// EEXIST 버그 워크어라운드 섹션 존재 여부에 따라 안내 내용을 동적으로 결정.
const fs = require("fs");
const path = require("path");

let input = "";
process.stdin.on("data", (chunk) => { input += chunk; });

process.stdin.on("end", () => {
  if (!input) return;
  try {
    const data = JSON.parse(input);
    const { cwd } = data;
    if (!cwd) return;
    if (!cwd.replace(/\\/g, "/").includes("my-claude-plugins")) return;

    const claudeMdPath = path.join(cwd, "CLAUDE.md");
    let hasEexistSection = false;
    if (fs.existsSync(claudeMdPath)) {
      const content = fs.readFileSync(claudeMdPath, "utf8");
      hasEexistSection = content.includes("EEXIST 버그 워크어라운드");
    }

    if (hasEexistSection) {
      console.log(`
⚠️  [플러그인 개발 폴더 감지] 작업 전 아래 절차를 반드시 확인하라.

━━━ 배포 절차 (정식) ━━━
1. git push
2. /plugin update  ← Claude Code가 자동 처리

━━━ 현재 EEXIST 버그 활성 중 — 정식 절차 대신 아래 워크어라운드 사용 ━━━

[A. 기존 플러그인 업데이트]
1. git push  (개발 레포)
2. cd ~/.claude/plugins/marketplaces/my-claude-plugins && git pull
3. cp -r ~/.claude/plugins/marketplaces/my-claude-plugins/<plugin>/. \\
         ~/.claude/plugins/cache/my-claude-plugins/<plugin>/<version>/
   ※ /* 아닌 /. 사용 — .claude-plugin/ 숨김 디렉토리 포함
4. installed_plugins.json → version, installPath, gitCommitSha 업데이트  ← 전체 SHA 사용
5. diff -r <marketplace>/<plugin>/ <cache>/<plugin>/<version>/  로 검증

[B. 신규 플러그인 설치]
1. cd ~/.claude/plugins/marketplaces/my-claude-plugins && git pull
2. VERSION=$(python3 -c "import sys,json; print(json.load(open('<cache>/<plugin>/.claude-plugin/plugin.json'))['version'])")
   mkdir -p ~/.claude/plugins/cache/my-claude-plugins/<plugin>/$VERSION
   cp -r ~/.claude/plugins/marketplaces/my-claude-plugins/<plugin>/. \\
         ~/.claude/plugins/cache/my-claude-plugins/<plugin>/$VERSION/
3. installed_plugins.json에 항목 추가  (키: "<plugin>@my-claude-plugins")
4. settings.json → enabledPlugins에 추가
5. diff로 검증

수정 파일: installed_plugins.json / settings.json(enabledPlugins)
반영 시점: 새 세션에서만 적용

⚠️  순서 위반 금지. 임의 판단으로 단계 스킵 금지.
      `);
    } else {
      console.log(`
⚠️  [플러그인 개발 폴더 감지] 작업 전 아래 절차를 반드시 확인하라.

━━━ 배포 절차 ━━━
1. git push
2. /plugin update  ← Claude Code가 marketplace pull + cache 반영 자동 처리

⚠️  순서 위반 금지. 임의 판단으로 단계 스킵 금지.

💡 inject-plugin-guidelines.js 정리 권장: EEXIST 워크어라운드 섹션이 CLAUDE.md에서 삭제됨.
   이 메시지가 계속 표시되면 훅에서 EEXIST 관련 코드를 제거하세요.
      `);
    }
  } catch (_) {}
});
