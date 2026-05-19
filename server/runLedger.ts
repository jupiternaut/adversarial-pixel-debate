import { mkdir, readFile, appendFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { roleDefinitions, type RoleId, type RoleOutputs } from "../shared/debate.js";
import type {
  DebateEvent,
  RoleRunSummary,
  RunLedgerEvent,
  RunSummary,
  RunVerification,
  RunVerificationCheck
} from "../shared/events.js";

type LedgerWritableEvent = Exclude<DebateEvent, { type: "server_ready" }>;

export class RunLedger {
  private readonly runDir: string;
  private readonly nextSequences = new Map<string, number>();

  constructor(runDir = getDefaultRunDir()) {
    this.runDir = runDir;
  }

  get directory(): string {
    return this.runDir;
  }

  async append(event: LedgerWritableEvent): Promise<RunLedgerEvent> {
    await mkdir(this.runDir, { recursive: true });
    const sequence = await this.nextSequence(event.runId);
    const ledgerEvent = {
      ...event,
      sequence,
      timestamp: new Date().toISOString()
    } as RunLedgerEvent;
    await appendFile(this.pathFor(event.runId), `${JSON.stringify(ledgerEvent)}\n`, "utf8");
    return ledgerEvent;
  }

  async read(runId: string): Promise<RunLedgerEvent[]> {
    const path = this.pathFor(runId);
    if (!existsSync(path)) {
      return [];
    }
    const content = await readFile(path, "utf8");
    return content
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line) as RunLedgerEvent);
  }

  async tail(runId: string, cursor = 0, limit = 100): Promise<{ cursor: number; events: RunLedgerEvent[] }> {
    const events = (await this.read(runId)).filter((event) => event.sequence > cursor).slice(0, limit);
    const nextCursor = events.length ? events[events.length - 1].sequence : cursor;
    return { cursor: nextCursor, events };
  }

  async summarize(runId: string): Promise<RunSummary> {
    return summarizeRun(runId, await this.read(runId));
  }

  pathFor(runId: string): string {
    return join(this.runDir, `${runId}.jsonl`);
  }

  private async nextSequence(runId: string): Promise<number> {
    const cached = this.nextSequences.get(runId);
    if (cached !== undefined) {
      const next = cached + 1;
      this.nextSequences.set(runId, next);
      return next;
    }
    const events = await this.read(runId);
    const next = events.length ? events[events.length - 1].sequence + 1 : 1;
    this.nextSequences.set(runId, next);
    return next;
  }
}

export function getDefaultRunDir(): string {
  return process.env.ADSS_RUN_DIR || join(process.cwd(), ".adss", "runs");
}

export function summarizeRun(runId: string, events: RunLedgerEvent[]): RunSummary {
  const roles = Object.fromEntries(
    roleDefinitions.map((role) => [
      role.id,
      {
        status: "idle",
        content: ""
      }
    ])
  ) as Record<RoleId, RoleRunSummary>;
  const outputs: RoleOutputs = {};
  let status: RunSummary["status"] = events.length ? "running" : "idle";
  let input: RunSummary["input"];

  for (const event of events) {
    if (event.type === "run_started") {
      status = "running";
      input = event.input;
    }
    if (event.type === "agent_started") {
      roles[event.roleId] = {
        ...roles[event.roleId],
        status: "speaking",
        stageId: event.stageId,
        stageLabel: event.stageLabel
      };
    }
    if (event.type === "agent_event") {
      roles[event.roleId] = {
        ...roles[event.roleId],
        latestEvent: event.message,
        stageId: event.stageId,
        stageLabel: event.stageLabel
      };
    }
    if (event.type === "agent_output") {
      outputs[event.roleId] = event.content;
      roles[event.roleId] = {
        ...roles[event.roleId],
        status: "done",
        content: event.content,
        elapsedMs: event.elapsedMs,
        stageId: event.stageId,
        stageLabel: event.stageLabel,
        latestEvent: event.content.slice(0, 180)
      };
    }
    if (event.type === "agent_error") {
      status = "error";
      roles[event.roleId] = {
        ...roles[event.roleId],
        status: "error",
        error: event.message,
        stageId: event.stageId,
        stageLabel: event.stageLabel,
        latestEvent: event.message
      };
    }
    if (event.type === "run_finished") {
      status = "finished";
      Object.assign(outputs, event.outputs);
    }
    if (event.type === "run_error") {
      status = "error";
    }
  }

  return {
    runId,
    input,
    status,
    outputs,
    roles,
    eventCount: events.length,
    latestSequence: events.length ? events[events.length - 1].sequence : 0
  };
}

export function exportRunMarkdown(summary: RunSummary): string {
  const title = summary.input?.topic || summary.runId;
  const sections = roleDefinitions
    .map((role) => `# ${role.label} / ${role.zhName}\n\n${summary.roles[role.id].content || summary.roles[role.id].error || ""}`)
    .join("\n\n---\n\n");
  return [`# ADSS War Room Run ${summary.runId}`, "", `**Topic:** ${title}`, "", sections].join("\n");
}

export function verifyRun(runId: string, events: RunLedgerEvent[]): RunVerification {
  const hasOutput = (roleId: RoleId, stageId: string) =>
    events.some((event) => event.type === "agent_output" && event.roleId === roleId && event.stageId === stageId && event.content.trim());
  const contentFor = (roleId: RoleId, stageId: string) =>
    events
      .filter((event): event is Extract<RunLedgerEvent, { type: "agent_output" }> => {
        return event.type === "agent_output" && event.roleId === roleId && event.stageId === stageId;
      })
      .map((event) => event.content)
      .join("\n");
  const debatingRoles = roleDefinitions.filter((role) => role.id !== "moderator").map((role) => role.id);
  const checks: RunVerificationCheck[] = [
    {
      id: "opening",
      label: "Stage 1 opening outputs",
      ok: debatingRoles.every((roleId) => hasOutput(roleId, "opening")),
      message: "Bull/Bear/Engineer must each produce an opening statement."
    },
    {
      id: "red_team",
      label: "Stage 2 red-team outputs",
      ok: debatingRoles.every((roleId) => /交叉红队|攻击|attack|red[- ]?team/i.test(contentFor(roleId, "redTeam"))),
      message: "Every debating role must produce explicit red-team attacks."
    },
    {
      id: "consensus",
      label: "Stage 3 consensus outputs",
      ok: debatingRoles.every((roleId) => /阶段共识|已达成共识|consensus/i.test(contentFor(roleId, "consensus"))),
      message: "Every debating role must produce a stage consensus."
    },
    {
      id: "moderator",
      label: "Moderator conclusion",
      ok: /结论|判断|decision|conclusion/i.test(contentFor("moderator", "moderator")),
      message: "Moderator must produce a final decision-oriented conclusion."
    },
    {
      id: "finished",
      label: "Run finished cleanly",
      ok: events.some((event) => event.type === "run_finished"),
      message: "Run must reach run_finished."
    }
  ];
  return {
    runId,
    ok: checks.every((check) => check.ok),
    checks
  };
}
