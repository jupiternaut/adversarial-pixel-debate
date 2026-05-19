#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { normalizeInput } from "./input.js";
import { createRunId, startDebateRun } from "./orchestrator.js";
import { exportRunMarkdown, RunLedger, verifyRun } from "./runLedger.js";

const ledger = new RunLedger();
const server = new McpServer({
  name: "adss-war-room",
  version: "0.1.0"
});

server.registerTool(
  "start_debate",
  {
    title: "Start ADSS debate",
    description: "Start a local ADSS War Room debate run and return a runId.",
    inputSchema: {
      topic: z.string(),
      background: z.string().optional(),
      goal: z.string().optional(),
      constraints: z.string().optional(),
      dataNotes: z.string().optional(),
      timeframe: z.string().optional(),
      decisionUse: z.string().optional(),
      model: z.string().optional(),
      reasoningEffort: z.enum(["default", "low", "medium", "high", "xhigh"]).optional(),
      demoMode: z.boolean().optional()
    }
  },
  async (input) => {
    const runId = createRunId();
    void startDebateRun(normalizeInput(input), { runId, ledger }).catch(() => undefined);
    return jsonContent({ runId, started: true });
  }
);

server.registerTool(
  "get_run_state",
  {
    title: "Get ADSS run state",
    description: "Read the current state for an ADSS run from the local JSONL ledger.",
    inputSchema: { runId: z.string() }
  },
  async ({ runId }) => jsonContent(await ledger.summarize(runId))
);

server.registerTool(
  "watch_run",
  {
    title: "Watch ADSS run events",
    description: "Read recent ADSS run events after a cursor.",
    inputSchema: {
      runId: z.string(),
      cursor: z.number().optional(),
      limit: z.number().optional()
    }
  },
  async ({ runId, cursor = 0, limit = 100 }) => jsonContent(await ledger.tail(runId, cursor, limit))
);

server.registerTool(
  "export_run",
  {
    title: "Export ADSS run",
    description: "Export an ADSS run as Markdown or JSON.",
    inputSchema: {
      runId: z.string(),
      format: z.enum(["md", "json"]).optional()
    }
  },
  async ({ runId, format = "md" }) => {
    const summary = await ledger.summarize(runId);
    if (format === "json") {
      return jsonContent(summary);
    }
    return { content: [{ type: "text", text: exportRunMarkdown(summary) }] };
  }
);

server.registerTool(
  "verify_run",
  {
    title: "Verify ADSS run",
    description: "Validate that a run contains staged debate, red-team attacks, consensus, and a moderator conclusion.",
    inputSchema: { runId: z.string() }
  },
  async ({ runId }) => jsonContent(verifyRun(runId, await ledger.read(runId)))
);

await server.connect(new StdioServerTransport());

function jsonContent(value: unknown) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(value, null, 2)
      }
    ]
  };
}
