import express from "express";
import { createServer, type Server } from "node:http";
import { join } from "node:path";
import { WebSocketServer } from "ws";
import { buildBriefExpansionPrompt, buildDemoBriefExpansion } from "../shared/debate.js";
import type { DebateEvent } from "../shared/events.js";
import { runCodex, probeCodex } from "./codexAgent.js";
import { normalizeEffort, normalizeInput, optionalString, parseBriefExpansion } from "./input.js";
import { createRunId, startDebateRun } from "./orchestrator.js";
import { exportRunMarkdown, RunLedger, verifyRun } from "./runLedger.js";

interface StartServerOptions {
  host?: string;
  port?: number;
  staticDir?: string;
  runDir?: string;
}

interface StartedServer {
  server: Server;
  url: string;
  close: () => Promise<void>;
}

export async function startDebateServer(options: StartServerOptions = {}): Promise<StartedServer> {
  const host = options.host || "127.0.0.1";
  const port = options.port ?? Number(process.env.PORT || 48731);
  const ledger = new RunLedger(options.runDir);
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
    response.json({ codex: await probeCodex(), runDir: ledger.directory });
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

    const runId = createRunId();
    response.status(202).json({ runId });
    setTimeout(() => {
      void startDebateRun(input, { runId, ledger, emit: broadcast }).catch(() => undefined);
    }, 0);
  });

  app.get("/api/runs/:runId", async (request, response) => {
    response.json(await ledger.summarize(request.params.runId));
  });

  app.get("/api/runs/:runId/events", async (request, response) => {
    const cursor = Number(request.query.cursor || 0);
    const limit = Number(request.query.limit || 100);
    response.json(await ledger.tail(request.params.runId, cursor, limit));
  });

  app.get("/api/runs/:runId/export", async (request, response) => {
    const summary = await ledger.summarize(request.params.runId);
    if (request.query.format === "json") {
      response.json(summary);
      return;
    }
    response.type("text/markdown").send(exportRunMarkdown(summary));
  });

  app.get("/api/runs/:runId/verify", async (request, response) => {
    response.json(verifyRun(request.params.runId, await ledger.read(request.params.runId)));
  });

  wss.on("connection", async (socket) => {
    socket.send(JSON.stringify({ type: "server_ready", codex: await probeCodex() } satisfies DebateEvent));
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
