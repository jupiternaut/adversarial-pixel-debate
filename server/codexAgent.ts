import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import type { DebateInput, ReasoningEffort, RoleId } from "../shared/debate.js";
import type { AgentTraceEvent, CodexHealth, StageIdWithModerator } from "../shared/events.js";

const CODEX_TIMEOUT_MS = Number(process.env.CODEX_TIMEOUT_MS || 8 * 60 * 1000);

export interface CodexAgentOptions {
  runId: string;
  roleId: RoleId;
  stageId: StageIdWithModerator;
  stageLabel: string;
  prompt: string;
  model?: string;
  effort?: ReasoningEffort;
  onEvent?: (event: AgentTraceEvent) => void | Promise<void>;
}

export interface ParsedCodexEvent {
  eventKind: AgentTraceEvent["eventKind"];
  message: string;
  rawType?: string;
}

export function probeCodex(): Promise<CodexHealth> {
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

export async function runCodex(prompt: string, model?: string, effort?: ReasoningEffort): Promise<string> {
  const outputPath = join(tmpdir(), `adss-codex-${Date.now()}-${randomUUID()}.txt`);
  const args = buildCodexExecArgs(outputPath, model, effort, false);
  const result = await spawnCodex(args, prompt);
  if (result.code !== 0) {
    throw new Error(`Codex exec failed with code ${result.code}: ${result.stderr || result.stdout}`);
  }
  const content = await readFinalOutput(outputPath, result.stdout);
  if (!content) {
    throw new Error("Codex exec completed but returned empty output.");
  }
  return content;
}

export async function runCodexAgent(options: CodexAgentOptions): Promise<string> {
  const outputPath = join(tmpdir(), `adss-agent-${options.runId}-${options.roleId}-${Date.now()}-${randomUUID()}.txt`);
  const args = buildCodexExecArgs(outputPath, options.model, options.effort, true);
  const startedAt = Date.now();
  await emit(options, "status", "Codex agent process started.");

  const result = await spawnCodex(args, options.prompt, async (line) => {
    const parsed = parseCodexJsonEvent(line);
    if (parsed) {
      await emit(options, parsed.eventKind, parsed.message, parsed.rawType, Date.now() - startedAt);
    }
  });

  if (result.stderr.trim()) {
    await emit(options, "stderr", result.stderr.trim().slice(-1200), undefined, Date.now() - startedAt);
  }
  if (result.code !== 0) {
    throw new Error(`Codex exec failed with code ${result.code}: ${result.stderr || result.stdout}`);
  }
  const content = await readFinalOutput(outputPath, result.stdout);
  if (!content) {
    throw new Error("Codex exec completed but returned empty output.");
  }
  await emit(options, "message", "Codex agent final answer captured.", "final", Date.now() - startedAt);
  return content;
}

export function parseCodexJsonEvent(line: string): ParsedCodexEvent | null {
  const trimmed = line.trim();
  if (!trimmed) {
    return null;
  }
  let value: unknown;
  try {
    value = JSON.parse(trimmed);
  } catch {
    return { eventKind: "raw", message: trimmed.slice(0, 600) };
  }
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const rawType = stringValue(source.type) || stringValue(source.event) || "json";
  const text = extractText(source);
  if (!text) {
    return null;
  }
  return {
    rawType,
    eventKind: classifyCodexEvent(rawType, source),
    message: text.slice(0, 1000)
  };
}

function buildCodexExecArgs(outputPath: string, model: string | undefined, effort: ReasoningEffort | undefined, json: boolean): string[] {
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
  if (json) {
    args.push("--json");
  }
  if (model?.trim()) {
    args.push("--model", model.trim());
  }
  if (effort && effort !== "default") {
    args.push("-c", `model_reasoning_effort="${effort}"`);
  }
  args.push("-");
  return args;
}

function spawnCodex(
  args: string[],
  prompt: string,
  onStdoutLine?: (line: string) => void | Promise<void>
): Promise<{ code: number | null; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn("codex", args, {
      cwd: process.env.HOME || process.cwd(),
      env: { ...process.env, NO_COLOR: "1" },
      stdio: ["pipe", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let buffer = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Codex role timed out after ${Math.round(CODEX_TIMEOUT_MS / 1000)}s`));
    }, CODEX_TIMEOUT_MS);

    child.stdout.on("data", (chunk) => {
      const text = String(chunk);
      stdout = appendLimited(stdout, text);
      if (!onStdoutLine) {
        return;
      }
      buffer += text;
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || "";
      for (const line of lines) {
        void onStdoutLine(line);
      }
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
      if (buffer.trim() && onStdoutLine) {
        void onStdoutLine(buffer);
      }
      resolve({ code, stdout, stderr });
    });

    child.stdin.end(prompt);
  });
}

async function readFinalOutput(outputPath: string, fallback: string): Promise<string> {
  const fileContent = existsSync(outputPath) ? await readFile(outputPath, "utf8") : "";
  await unlink(outputPath).catch(() => undefined);
  return (fileContent.trim() || fallback.trim()).trim();
}

async function emit(
  options: CodexAgentOptions,
  eventKind: AgentTraceEvent["eventKind"],
  message: string,
  rawType?: string,
  elapsedMs?: number
): Promise<void> {
  if (!options.onEvent || !message.trim()) {
    return;
  }
  await options.onEvent({
    type: "agent_event",
    runId: options.runId,
    roleId: options.roleId,
    stageId: options.stageId,
    stageLabel: options.stageLabel,
    eventKind,
    message: message.trim(),
    rawType,
    elapsedMs
  });
}

function classifyCodexEvent(rawType: string, source: Record<string, unknown>): AgentTraceEvent["eventKind"] {
  const value = rawType.toLowerCase();
  if (value.includes("reason") || value.includes("thinking")) {
    return "reasoning";
  }
  if (value.includes("tool_result") || value.includes("tool_output") || value.includes("exec_command_end")) {
    return "tool_result";
  }
  if (value.includes("tool_call") || value.includes("function_call") || value.includes("exec") || "tool" in source) {
    return "tool_call";
  }
  if (value.includes("message") || value.includes("final") || value.includes("answer")) {
    return "message";
  }
  return "raw";
}

function extractText(source: Record<string, unknown>): string {
  const direct = [
    source.message,
    source.text,
    source.summary,
    source.delta,
    source.output,
    source.content,
    source.command,
    source.name,
    source.status,
    source.stderr
  ]
    .map((value) => textFromUnknown(value))
    .find(Boolean);
  if (direct) {
    return direct;
  }
  const nested = [source.item, source.event, source.data, source.response]
    .map((value) => (typeof value === "object" && value !== null ? extractText(value as Record<string, unknown>) : ""))
    .find(Boolean);
  return nested || "";
}

function textFromUnknown(value: unknown): string {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(textFromUnknown).filter(Boolean).join(" ");
  }
  if (typeof value === "object" && value !== null) {
    const source = value as Record<string, unknown>;
    return textFromUnknown(
      source.text ||
        source.content ||
        source.message ||
        source.value ||
        source.command ||
        source.name ||
        source.status ||
        source.output ||
        source.stderr
    );
  }
  return "";
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function appendLimited(current: string, next: string, maxLength = 12000): string {
  const merged = current + next;
  if (merged.length <= maxLength) {
    return merged;
  }
  return merged.slice(merged.length - maxLength);
}

export function inputFromCliSource(source: Record<string, unknown>): DebateInput {
  return {
    topic: String(source.topic || "").trim(),
    background: stringValue(source.background),
    goal: stringValue(source.goal),
    constraints: stringValue(source.constraints),
    dataNotes: stringValue(source.dataNotes),
    timeframe: stringValue(source.timeframe),
    decisionUse: stringValue(source.decisionUse),
    model: stringValue(source.model),
    reasoningEffort: source.reasoningEffort as DebateInput["reasoningEffort"],
    demoMode: Boolean(source.demoMode)
  };
}
