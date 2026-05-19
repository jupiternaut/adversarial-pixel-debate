# Adversarial Pixel Debate

原创多智能体辩论桌面 App。它保留“可视化 AI 工作状态”这个产品概念，但默认舞台已经重构为 Three.js 轻 3D 的 AI 战情室，不复制 PixelHQ 的闭源代码、资源、签名或 UI 资产。

当前界面方向参考的是桌面 Agent 工具的工作台模型：左侧是决策 brief 和本地运行状态，中间是实时战情室舞台，右侧是可复制的辩论日志和 Markdown artifact。

## 能力

- 四个角色：Bull / Bear / Engineer / Moderator。
- 前端：Three.js AI 战情室、角色状态灯效、小人对话气泡、完整日志。
- 后端：通过本机 `codex exec --json` 调用 Codex CLI，沿用已登录的 Codex OAuth。
- 可观测性：桌面 UI、CLI、MCP 共用本地 JSONL run ledger。
- 自动化：提供 `adss` CLI 和 stdio MCP server，方便 Codex/Claude Code 等本地 agent 工具启动、观察、导出和验证辩论。
- 安全边界：不读取 `~/.codex/auth.json`，不要求 `OPENAI_API_KEY`。
- 演示模式：不调用 Codex，用于调 UI 和流程。

## 运行

```bash
cd /Users/gengrf/Code/adversarial-pixel-debate
npm install
npm run dev
```

打开：

```text
http://127.0.0.1:5177
```

桌面模式：

```bash
npm run desktop
```

macOS app 打包：

```bash
npm run dist:mac
```

## CLI / MCP / Run Ledger

每次辩论都会写入 append-only JSONL 账本。默认目录是：

```text
.adss/runs
```

也可以用 `ADSS_RUN_DIR` 覆盖，例如让桌面 App、CLI 和 MCP 读同一份账本。

构建并链接本地 CLI：

```bash
npm run build
npm link
adss health --json
```

常用命令：

```bash
adss run --topic "是否应该推进这个产品" --demo --json
adss inspect <runId>
adss watch <runId>
adss export <runId> --format md
adss verify <runId>
```

MCP stdio server：

```bash
npm run mcp
# 或构建后：
adss-mcp
```

MCP 暴露工具：

- `start_debate(input)`
- `get_run_state(runId)`
- `watch_run(runId, cursor, limit)`
- `export_run(runId, format)`
- `verify_run(runId)`

结构化事件类型包括 `run_started`、`agent_started`、`agent_event`、`agent_output`、`agent_error`、`run_finished` 和 `run_error`。桌面右侧 `Agent Trace` 面板会实时显示每个角色、阶段和子进程事件。

## 资源系统

项目使用生成式资源管线，而不是临时拼图：

- `npm run assets` 生成 `war-room-atlas.svg`、`agent-status-atlas.svg` 和 `asset-manifest.json`。
- `src/war-room/assets.ts` 读取 manifest、atlas URL 和角色状态帧。
- `src/war-room/sceneState.ts` 把 Codex 角色状态变成统一的 Three 场景状态。
- `src/war-room/createWarRoomScene.ts` 创建镜头、灯光、几何体、材质和状态同步。
- `src/components/WarRoomStage.tsx` 用 React 包装 WebGL canvas。

`npm run dev`、`npm run build` 和 `npm run dist:mac` 都会先执行 `npm run assets`。

美术方向见 `docs/art-direction.md`。

## 开源边界

本仓库可以公开到 GitHub，但发布前请跑：

```bash
npm test
npm run build
npm run dist:mac
```

开源清单见 `docs/open-source-release.md`。贡献规则见 `CONTRIBUTING.md`，安全边界见 `SECURITY.md`。

## 验证 Codex OAuth

```bash
codex --version
codex exec --ephemeral --skip-git-repo-check --sandbox read-only '请只输出：OK'
```

如果上面命令能返回，App 就会使用同一套本机 Codex OAuth 会话。

## 版本迭代控制

本项目现在使用三层控制：

- OpenSpec：定义每次非平凡改动的 proposal / design / spec / tasks。
- ChatDev-style roles：把 Product Lead / Architect / Designer / Programmer / Tester / Reviewer 作为工程交接角色。
- OpenEvolve sandbox：只评估候选迭代方案，默认不直接修改生产源码。

常用命令：

```bash
npm run iterate:scan
npm run iterate:score
npm run iterate:gate
npm run iterate:evolve:eval
```

接受一个版本时追加账本：

```bash
npm run iterate:record -- \
  --id baseline-pixel-office-v0.1 \
  --status accepted \
  --summary "Baseline after pixel-office redesign" \
  --change upgrade-pixel-office-ui \
  --evidence /tmp/adversarial-pixel-debate-redesign-done-2.png
```

完整说明见 `iteration/README.md`。
