import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import express from "express";
import { createServer, type Server } from "node:http";
import { WebSocketServer } from "ws";
import {
  buildBriefExpansionPrompt,
  buildDemoBriefExpansion,
  buildDemoOutput,
  buildDemoStageOutput,
  buildModeratorPrompt,
  buildRoleDebateTranscript,
  buildRoleStagePrompt,
  debateStages,
  debatingRoleIds,
  inferDecisionUse,
  type BriefExpansion,
  type DebatingRoleId,
  type DebateInput,
  type DebateStageId,
  type DebateStageOutputs,
  type ReasoningEffort,
  type RoleId,
  type RoleOutputs
} from "../shared/debate.js";

const CODEX_TIMEOUT_MS = Number(process.env.CODEX_TIMEOUT_MS || 8 * 60 * 1000);
const ROLE_SEQUENCE: RoleId[] = ["bull", "bear", "engineer", "moderator"];

type DebateEvent =
  | { type: "server-ready"; codex: CodexHealth }
  | { type: "run-started"; runId: string; input: DebateInput }
  | { type: "role-started"; runId: string; roleId: RoleId; stageId?: DebateStageId | "moderator"; stageLabel?: string }
  | {
      type: "role-output";
      runId: string;
      roleId: RoleId;
      content: string;
      elapsedMs: number;
      stageId?: DebateStageId | "moderator";
      stageLabel?: string;
    }
  | { type: "role-error"; runId: string; roleId: RoleId; message: string }
  | { type: "run-finished"; runId: string; outputs: RoleOutputs }
  | { type: "run-error"; runId: string; message: string };

interface CodexHealth {
  available: boolean;
  version?: string;
  message: string;
}

interface StartServerOptions {
  host?: string;
  port?: number;
  staticDir?: string;
}

interface StartedServer {
  server: Server;
  url: string;
  close: () => Promise<void>;
}

export async function startDebateServer(options: StartServerOptions = {}): Promise<StartedServer> {
  const host = options.host || "127.0.0.1";
  const port = options.port ?? Number(process.env.PORT || 48731);
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server, path: "/ws" });

  app.use(express.json({ limit: "1mb" }));

  function broadcast(event: DebateEvent): void {
    const payload = JSON.stringify(event);
    for (const client of wss.clients) {
      if (client.readyState === client.OPEN) {
        client.send(payload);
      }
    }
  }

  app.get("/api/health", async (_request, response) => {
    response.json({ codex: await probeCodex() });
  });

  app.post("/api/briefs/expand", async (request, response) => {
    const source = typeof request.body === "object" && request.body !== null ? (request.body as Record<string, unknown>) : {};
    const seed = optionalString(source.seed) || optionalString(source.prompt) || optionalString(source.text) || optionalString(source.topic);
    if (!seed) {
      response.status(400).json({ error: "seed is required" });
      return;
    }

    const current = normalizeInput(source.current);
    const demoMode = Boolean(source.demoMode) || Boolean(current.demoMode);
    try {
      const brief = demoMode
        ? buildDemoBriefExpansion(seed)
        : parseBriefExpansion(
            await runCodex(
              buildBriefExpansionPrompt(seed, current),
              optionalString(source.model) || current.model,
              normalizeEffort(source.reasoningEffort)
            ),
            seed
          );
      response.json({ brief });
    } catch (error) {
      response.status(500).json({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  app.post("/api/debates", (request, response) => {
    const input = normalizeInput(request.body);
    if (!input.topic) {
      response.status(400).json({ error: "topic is required" });
      return;
    }

    const runId = randomUUID();
    response.status(202).json({ runId });
    setTimeout(() => {
      void runDebate(runId, input, broadcast);
    }, 0);
  });

  wss.on("connection", async (socket) => {
    socket.send(JSON.stringify({ type: "server-ready", codex: await probeCodex() } satisfies DebateEvent));
  });

  if (options.staticDir) {
    const indexPath = join(options.staticDir, "index.html");
    app.use(express.static(options.staticDir));
    app.use((request, response, next) => {
      if (request.method !== "GET" || request.path.startsWith("/api") || request.path.startsWith("/ws")) {
        next();
        return;
      }
      response.sendFile(indexPath);
    });
  }

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve());
  });

  const address = server.address();
  const actualPort = typeof address === "object" && address ? address.port : port;
  return {
    server,
    url: `http://${host}:${actualPort}`,
    close: () =>
      new Promise((resolve, reject) => {
        wss.close();
        server.close((error) => {
          if (error) {
            reject(error);
          } else {
            resolve();
          }
        });
      })
  };
}

async function runDebate(
  runId: string,
  input: DebateInput,
  broadcast: (event: DebateEvent) => void
): Promise<void> {
  const outputs: RoleOutputs = {};
  const stageOutputs: DebateStageOutputs = {};
  broadcast({ type: "run-started", runId, input });

  try {
    for (const stage of debateStages) {
      const stageBucket = stageOutputs[stage.id] ?? {};
      stageOutputs[stage.id] = stageBucket;
      for (const roleId of debatingRoleIds) {
        broadcast({ type: "role-started", runId, roleId, stageId: stage.id, stageLabel: stage.label });
        const startedAt = Date.now();
        try {
          const content = input.demoMode
            ? await sleepThenDemoStage(roleId, stage.id, input)
            : await runCodex(buildRoleStagePrompt(roleId, stage.id, input, stageOutputs), input.model, input.reasoningEffort);
          stageBucket[roleId] = content;
          outputs[roleId] = buildRoleDebateTranscript(roleId, stageOutputs);
          broadcast({
            type: "role-output",
            runId,
            roleId,
            content: outputs[roleId] || content,
            elapsedMs: Date.now() - startedAt,
            stageId: stage.id,
            stageLabel: stage.label
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          broadcast({ type: "role-error", runId, roleId, message });
          throw error;
        }
      }
    }

    broadcast({ type: "role-started", runId, roleId: "moderator", stageId: "moderator", stageLabel: "最终裁决" });
    const startedAt = Date.now();
    try {
      const content = input.demoMode
        ? await sleepThenDemo("moderator", input)
        : await runCodex(buildModeratorPrompt(input, outputs), input.model, input.reasoningEffort);
      outputs.moderator = content;
      broadcast({
        type: "role-output",
        runId,
        roleId: "moderator",
        content,
        elapsedMs: Date.now() - startedAt,
        stageId: "moderator",
        stageLabel: "最终裁决"
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      broadcast({ type: "role-error", runId, roleId: "moderator", message });
      throw error;
    }
    broadcast({ type: "run-finished", runId, outputs });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    broadcast({ type: "run-error", runId, message });
  }
}

function probeCodex(): Promise<CodexHealth> {
  return new Promise((resolve) => {
    const child = spawn("codex", ["--version"], {
      env: { ...process.env, NO_COLOR: "1" },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", (error) => {
      resolve({ available: false, message: error.message });
    });
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ available: true, version: stdout.trim(), message: "Codex CLI 可用，认证沿用本机 OAuth 会话。" });
      } else {
        resolve({ available: false, message: stderr.trim() || `codex --version exited with ${code}` });
      }
    });
  });
}

async function runCodex(prompt: string, model?: string, effort?: ReasoningEffort): Promise<string> {
  const outputPath = join(tmpdir(), `adversarial-pixel-${Date.now()}-${randomUUID()}.txt`);
  const args = [
    "exec",
    "--ephemeral",
    "--skip-git-repo-check",
    "--sandbox",
    "read-only",
    "--color",
    "never",
    "-o",
    outputPath
  ];

  if (model?.trim()) {
    args.push("--model", model.trim());
  }
  if (effort && effort !== "default") {
    args.push("-c", `model_reasoning_effort="${effort}"`);
  }
  args.push("-");

  const result = await new Promise<{ code: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    const child = spawn("codex", args, {
      cwd: process.env.HOME || process.cwd(),
      env: { ...process.env, NO_COLOR: "1" },
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Codex role timed out after ${Math.round(CODEX_TIMEOUT_MS / 1000)}s`));
    }, CODEX_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      stdout = appendLimited(stdout, String(chunk));
    });
    child.stderr.on("data", (chunk) => {
      stderr = appendLimited(stderr, String(chunk));
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });

    child.stdin.end(prompt);
  });

  if (result.code !== 0) {
    throw new Error(`Codex exec failed with code ${result.code}: ${result.stderr || result.stdout}`);
  }

  const fileContent = existsSync(outputPath) ? await readFile(outputPath, "utf8") : "";
  await unlink(outputPath).catch(() => undefined);
  const content = fileContent.trim() || result.stdout.trim();
  if (!content) {
    throw new Error("Codex exec completed but returned empty output.");
  }
  return content;
}

function appendLimited(current: string, next: string, maxLength = 12000): string {
  const merged = current + next;
  if (merged.length <= maxLength) {
    return merged;
  }
  return merged.slice(merged.length - maxLength);
}

function parseBriefExpansion(raw: string, fallbackSeed: string): BriefExpansion {
  const parsed = parseJsonObject(raw);
  return normalizeBriefExpansion(parsed, fallbackSeed);
}

function parseJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(fenced);
  } catch {
    const start = fenced.indexOf("{");
    const end = fenced.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(fenced.slice(start, end + 1));
    }
    throw new Error("Brief builder did not return valid JSON.");
  }
}

function normalizeBriefExpansion(value: unknown, fallbackSeed: string): BriefExpansion {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const topic = optionalString(source.topic) || fallbackSeed.trim();
  const decisionUse = normalizeDecisionUse(optionalString(source.decisionUse), topic);
  return {
    topic,
    background:
      optionalString(source.background) ||
      `用户提出了一个待评估想法：${topic}。当前只有一句话需求，尚未补充真实数据。`,
    goal: optionalString(source.goal) || "判断该决策是否值得继续推进，并形成可执行验证清单。",
    constraints: optionalString(source.constraints) || "本地优先；先验证关键假设；避免复制闭源应用代码和素材。",
    dataNotes: optionalString(source.dataNotes) || "当前未提供真实数据，需要后续补充/核查。",
    timeframe: optionalString(source.timeframe) || "未来 7-14 天完成最小验证。",
    decisionUse
  };
}

function normalizeDecisionUse(value: string | undefined, topic: string): string {
  const allowed = new Set(["产品", "投资", "创业", "战略", "职业", "技术路线", "其他"]);
  if (value && allowed.has(value)) {
    return value;
  }
  return inferDecisionUse(topic);
}

function normalizeInput(value: unknown): DebateInput {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    topic: String(source.topic || "").trim(),
    background: optionalString(source.background),
    goal: optionalString(source.goal),
    constraints: optionalString(source.constraints),
    dataNotes: optionalString(source.dataNotes),
    timeframe: optionalString(source.timeframe),
    decisionUse: optionalString(source.decisionUse) || "其他",
    model: optionalString(source.model),
    reasoningEffort: normalizeEffort(source.reasoningEffort),
    demoMode: Boolean(source.demoMode)
  };
}

function optionalString(value: unknown): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
}

function normalizeEffort(value: unknown): ReasoningEffort {
  if (value === "low" || value === "medium" || value === "high" || value === "xhigh") {
    return value;
  }
  return "default";
}

async function sleepThenDemo(roleId: RoleId, input: DebateInput): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 500 + ROLE_SEQUENCE.indexOf(roleId) * 250));
  return buildDemoOutput(roleId, input);
}

async function sleepThenDemoStage(roleId: DebatingRoleId, stageId: DebateStageId, input: DebateInput): Promise<string> {
  const stageIndex = debateStages.findIndex((stage) => stage.id === stageId);
  const roleIndex = debatingRoleIds.indexOf(roleId);
  await new Promise((resolve) => setTimeout(resolve, 350 + stageIndex * 220 + roleIndex * 160));
  return buildDemoStageOutput(roleId, stageId, input);
}
