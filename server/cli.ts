#!/usr/bin/env node
import { setTimeout as delay } from "node:timers/promises";
import { probeCodex } from "./codexAgent.js";
import { normalizeInput } from "./input.js";
import { startDebateRun } from "./orchestrator.js";
import { exportRunMarkdown, RunLedger, verifyRun } from "./runLedger.js";

interface ParsedArgs {
  command: string;
  positional: string[];
  flags: Record<string, string | boolean>;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const ledger = new RunLedger(stringFlag(args, "run-dir"));

  if (!args.command || args.command === "help" || args.flags.help) {
    printHelp();
    return;
  }

  if (args.command === "health") {
    const codex = await probeCodex();
    const server = await probeServer(stringFlag(args, "server") || "http://127.0.0.1:48731");
    printJson(args, { codex, server, runDir: ledger.directory });
    return;
  }

  if (args.command === "run") {
    const input = normalizeInput({
      topic: stringFlag(args, "topic") || args.positional.join(" "),
      background: stringFlag(args, "background"),
      goal: stringFlag(args, "goal"),
      constraints: stringFlag(args, "constraints"),
      dataNotes: stringFlag(args, "data-notes"),
      timeframe: stringFlag(args, "timeframe"),
      decisionUse: stringFlag(args, "decision-use"),
      model: stringFlag(args, "model"),
      reasoningEffort: stringFlag(args, "reasoning-effort"),
      demoMode: Boolean(args.flags.demo)
    });
    if (!input.topic) {
      throw new Error("adss run requires --topic or a positional topic.");
    }
    const result = await startDebateRun(input, { ledger });
    const summary = await ledger.summarize(result.runId);
    printJson(args, { runId: result.runId, summary });
    return;
  }

  if (args.command === "inspect") {
    const runId = requireRunId(args);
    printJson(args, await ledger.summarize(runId));
    return;
  }

  if (args.command === "watch") {
    const runId = requireRunId(args);
    await watchRun(ledger, runId, Boolean(args.flags.once));
    return;
  }

  if (args.command === "export") {
    const runId = requireRunId(args);
    const summary = await ledger.summarize(runId);
    if ((stringFlag(args, "format") || "md") === "json") {
      console.log(JSON.stringify(summary, null, 2));
      return;
    }
    console.log(exportRunMarkdown(summary));
    return;
  }

  if (args.command === "verify") {
    const runId = requireRunId(args);
    const result = verifyRun(runId, await ledger.read(runId));
    console.log(JSON.stringify(result, null, 2));
    process.exitCode = result.ok ? 0 : 1;
    return;
  }

  throw new Error(`Unknown command: ${args.command}`);
}

function parseArgs(argv: string[]): ParsedArgs {
  const [command = "", ...rest] = argv;
  const positional: string[] = [];
  const flags: Record<string, string | boolean> = {};
  for (let index = 0; index < rest.length; index += 1) {
    const item = rest[index];
    if (!item.startsWith("--")) {
      positional.push(item);
      continue;
    }
    const key = item.slice(2);
    const next = rest[index + 1];
    if (!next || next.startsWith("--")) {
      flags[key] = true;
      continue;
    }
    flags[key] = next;
    index += 1;
  }
  return { command, positional, flags };
}

function stringFlag(args: ParsedArgs, name: string): string | undefined {
  const value = args.flags[name];
  return typeof value === "string" ? value : undefined;
}

function requireRunId(args: ParsedArgs): string {
  const runId = args.positional[0] || stringFlag(args, "run-id");
  if (!runId) {
    throw new Error(`adss ${args.command} requires a runId.`);
  }
  return runId;
}

function printJson(args: ParsedArgs, value: unknown): void {
  if (args.flags.json || args.command !== "run") {
    console.log(JSON.stringify(value, null, 2));
    return;
  }
  const payload = value as { runId?: string };
  console.log(payload.runId || JSON.stringify(value));
}

async function probeServer(baseUrl: string): Promise<{ available: boolean; message: string }> {
  try {
    const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/health`);
    if (!response.ok) {
      return { available: false, message: `HTTP ${response.status}` };
    }
    return { available: true, message: "ADSS server reachable." };
  } catch (error) {
    return { available: false, message: error instanceof Error ? error.message : String(error) };
  }
}

async function watchRun(ledger: RunLedger, runId: string, once: boolean): Promise<void> {
  let cursor = 0;
  while (true) {
    const result = await ledger.tail(runId, cursor, 50);
    cursor = result.cursor;
    for (const event of result.events) {
      console.log(JSON.stringify(event));
    }
    if (once || result.events.some((event) => event.type === "run_finished" || event.type === "run_error")) {
      return;
    }
    await delay(500);
  }
}

function printHelp(): void {
  console.log(`ADSS War Room CLI

Usage:
  adss health [--json]
  adss run --topic "..." [--demo] [--json]
  adss inspect <runId>
  adss watch <runId> [--once]
  adss export <runId> [--format md|json]
  adss verify <runId>

Common:
  --run-dir <path>  Override .adss/runs
`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
