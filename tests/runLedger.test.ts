import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { RunLedger, summarizeRun, verifyRun } from "../server/runLedger";
import type { DebateEvent, RunLedgerEvent } from "../shared/events";

type LedgerInputEvent = Exclude<DebateEvent, { type: "server_ready" }>;

const tempDirs: string[] = [];

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((path) => rm(path, { recursive: true, force: true })));
});

describe("RunLedger", () => {
  it("appends, reads, tails, and summarizes JSONL run events", async () => {
    const runDir = await mkdtemp(join(tmpdir(), "adss-ledger-"));
    tempDirs.push(runDir);
    const ledger = new RunLedger(runDir);
    const runId = "run_test";

    await ledger.append({
      type: "run_started",
      runId,
      input: { topic: "是否构建 MCP agent 可视化", demoMode: true }
    });
    await ledger.append({
      type: "agent_started",
      runId,
      roleId: "bull",
      stageId: "opening",
      stageLabel: "开场立论"
    });
    await ledger.append({
      type: "agent_event",
      runId,
      roleId: "bull",
      stageId: "opening",
      stageLabel: "开场立论",
      eventKind: "reasoning",
      message: "梳理正面价值"
    });
    await ledger.append({
      type: "agent_output",
      runId,
      roleId: "bull",
      stageId: "opening",
      stageLabel: "开场立论",
      content: "Bull opening",
      elapsedMs: 12
    });

    const events = await ledger.read(runId);
    expect(events.map((event) => event.sequence)).toEqual([1, 2, 3, 4]);

    const tail = await ledger.tail(runId, 2);
    expect(tail.cursor).toBe(4);
    expect(tail.events.map((event) => event.type)).toEqual(["agent_event", "agent_output"]);

    const summary = await ledger.summarize(runId);
    expect(summary.status).toBe("running");
    expect(summary.input?.topic).toContain("MCP");
    expect(summary.roles.bull.status).toBe("done");
    expect(summary.roles.bull.latestEvent).toBe("Bull opening");
  });
});

describe("verifyRun", () => {
  it("accepts a complete staged debate and rejects a missing red-team run", () => {
    const complete = buildVerificationEvents("complete", true);
    const missingRedTeam = buildVerificationEvents("missing", false);

    expect(verifyRun("complete", complete).ok).toBe(true);

    const failed = verifyRun("missing", missingRedTeam);
    expect(failed.ok).toBe(false);
    expect(failed.checks.find((check) => check.id === "red_team")?.ok).toBe(false);
  });

  it("summarizes finished runs from final outputs", () => {
    const events = buildVerificationEvents("summary", true);
    const summary = summarizeRun("summary", events);

    expect(summary.status).toBe("finished");
    expect(summary.outputs.moderator).toContain("结论");
    expect(summary.roles.engineer.status).toBe("done");
  });
});

function buildVerificationEvents(runId: string, includeRedTeamAttack: boolean): RunLedgerEvent[] {
  const events: LedgerInputEvent[] = [
    {
      type: "run_started",
      runId,
      input: { topic: "是否构建 MCP agent 可视化", demoMode: true }
    }
  ];
  for (const roleId of ["bull", "bear", "engineer"] as const) {
    events.push(output(runId, roleId, "opening", "开场立论", `${roleId} opening`));
    events.push(
      output(
        runId,
        roleId,
        "redTeam",
        "交叉红队",
        includeRedTeamAttack ? `${roleId} 交叉红队 attack` : `${roleId} response`
      )
    );
    events.push(output(runId, roleId, "consensus", "阶段共识", `${roleId} 阶段共识 consensus`));
  }
  events.push(output(runId, "moderator", "moderator", "Moderator", "最终结论 decision"));
  events.push({
    type: "run_finished",
    runId,
    outputs: {
      bull: "bull final",
      bear: "bear final",
      engineer: "engineer final",
      moderator: "最终结论 decision"
    }
  });
  return events.map((event, index) => ({
    ...event,
    sequence: index + 1,
    timestamp: "2026-05-20T00:00:00.000Z"
  }));
}

function output(
  runId: string,
  roleId: "bull" | "bear" | "engineer" | "moderator",
  stageId: "opening" | "redTeam" | "consensus" | "moderator",
  stageLabel: string,
  content: string
): Extract<DebateEvent, { type: "agent_output" }> {
  return {
    type: "agent_output",
    runId,
    roleId,
    stageId,
    stageLabel,
    content,
    elapsedMs: 1
  };
}
