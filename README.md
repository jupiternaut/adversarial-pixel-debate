# Adversarial Pixel Debate

## What it is

Adversarial Pixel Debate is a local multi-agent debate workspace. It turns a decision brief into a staged debate between Bull, Bear, Engineer, and Moderator, then records the run as a local JSONL ledger and exportable Markdown.

The visual surface is an original Three.js war-room scene. It does not copy PixelHQ code, private assets, signatures, or UI files.

## Current state

- Frontend: React 19, Vite 7, TypeScript, Three.js, and lucide-react.
- Local server: Express, WebSocket, and TypeScript.
- Desktop shell: Electron.
- CLI: `adss`.
- MCP server: `adss-mcp`.
- Agent backend: local `codex exec --json`, using the machine's existing Codex login.
- Demo mode: runs without calling Codex.
- Run ledger: append-only JSONL under `.adss/runs`, or `ADSS_RUN_DIR` when set.

## Run it

```bash
npm install
npm run dev
```

Open `http://127.0.0.1:5177`.

Desktop build:

```bash
npm run desktop
```

macOS app directory:

```bash
npm run dist:mac
```

Build and link the CLI:

```bash
npm run build
npm link
adss health --json
```

Run a demo debate:

```bash
adss run --topic "Should we ship this product?" --demo --json
```

Run the MCP stdio server:

```bash
npm run mcp
```

## Project layout

```text
src/                         React app and Three.js war-room UI
src/war-room/                Scene assets, state mapping, and Three.js scene creation
server/                      Express app, Codex agent runner, CLI, MCP, and run ledger
shared/                      Debate roles, inputs, and event contracts
electron/                    Desktop shell
scripts/                     Asset generation and iteration helper scripts
iteration/                   OpenSpec, role, score, and version-ledger notes
openevolve/adversarial-pixel-debate/ Optional OpenEvolve sandbox
docs/                        Art direction and release notes
```

## Assets

`npm run assets` generates the war-room atlas, agent status atlas, and `src/assets/generated/asset-manifest.json`. The generated assets are part of the current visual runtime.

The OpenEvolve helper command in `package.json` references a maintainer-local checkout for real search. Treat that path as optional and local-only. The safe evaluator command works from this repository:

```bash
npm run iterate:evolve:eval
```

## Limitations

- Real Codex-backed debate requires the local `codex` CLI to be installed and logged in.
- The app does not read `~/.codex/auth.json` and does not require `OPENAI_API_KEY`.
- The desktop app and browser app share the same local server model.
- OpenEvolve outputs are proposals only. Production changes still go through OpenSpec and the iteration gate.

## Maintainer

Before public release, run:

```bash
npm test
npm run build
npm run dist:mac
```

Keep `README.md`, `package.json`, `iteration/README.md`, and `docs/open-source-release.md` aligned. Fable5 should treat this repository as a local agent-debate app with an optional OpenEvolve sandbox, not as a remote service or a PixelHQ asset port.
