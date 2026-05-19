import { randomUUID } from "node:crypto";
import {
  buildDemoOutput,
  buildDemoStageOutput,
  buildModeratorPrompt,
  buildRoleDebateTranscript,
  buildRoleStagePrompt,
  debateStages,
  debatingRoleIds,
  type DebatingRoleId,
  type DebateInput,
  type DebateStageId,
  type DebateStageOutputs,
  type RoleId,
  type RoleOutputs
} from "../shared/debate.js";
import type { DebateEvent, StageIdWithModerator } from "../shared/events.js";
import { runCodexAgent } from "./codexAgent.js";
import { RunLedger } from "./runLedger.js";

const ROLE_SEQUENCE: RoleId[] = ["bull", "bear", "engineer", "moderator"];

export interface DebateRunOptions {
  runId?: string;
  ledger?: RunLedger;
  emit?: (event: DebateEvent) => void | Promise<void>;
}

export interface DebateRunResult {
  runId: string;
  outputs: RoleOutputs;
}

export function createRunId(): string {
  return randomUUID();
}

export async function startDebateRun(input: DebateInput, options: DebateRunOptions = {}): Promise<DebateRunResult> {
  const runId = options.runId || createRunId();
  const ledger = options.ledger || new RunLedger();
  const outputs: RoleOutputs = {};
  const stageOutputs: DebateStageOutputs = {};

  const emit = async (event: Exclude<DebateEvent, { type: "server_ready" }>) => {
    const ledgerEvent = await ledger.append(event);
    await options.emit?.(ledgerEvent);
  };

  await emit({ type: "run_started", runId, input });

  try {
    for (const stage of debateStages) {
      const stageBucket = stageOutputs[stage.id] ?? {};
      stageOutputs[stage.id] = stageBucket;
      for (const roleId of debatingRoleIds) {
        const content = await runDebatingAgent({
          runId,
          roleId,
          stageId: stage.id,
          stageLabel: stage.label,
          input,
          stageOutputs,
          emit
        });
        stageBucket[roleId] = content;
        outputs[roleId] = buildRoleDebateTranscript(roleId, stageOutputs);
      }
    }

    outputs.moderator = await runModeratorAgent({ runId, input, outputs, emit });
    await emit({ type: "run_finished", runId, outputs });
    return { runId, outputs };
  } catch (error) {
    await emit({ type: "run_error", runId, message: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

async function runDebatingAgent(args: {
  runId: string;
  roleId: DebatingRoleId;
  stageId: DebateStageId;
  stageLabel: string;
  input: DebateInput;
  stageOutputs: DebateStageOutputs;
  emit: (event: Exclude<DebateEvent, { type: "server_ready" }>) => Promise<void>;
}): Promise<string> {
  const startedAt = Date.now();
  await args.emit({
    type: "agent_started",
    runId: args.runId,
    roleId: args.roleId,
    stageId: args.stageId,
    stageLabel: args.stageLabel
  });

  try {
    const content = args.input.demoMode
      ? await sleepThenDemoStage(args.runId, args.roleId, args.stageId, args.stageLabel, args.input, args.emit)
      : await runCodexAgent({
          runId: args.runId,
          roleId: args.roleId,
          stageId: args.stageId,
          stageLabel: args.stageLabel,
          prompt: buildRoleStagePrompt(args.roleId, args.stageId, args.input, args.stageOutputs),
          model: args.input.model,
          effort: args.input.reasoningEffort,
          onEvent: args.emit
        });
    await args.emit({
      type: "agent_output",
      runId: args.runId,
      roleId: args.roleId,
      content,
      elapsedMs: Date.now() - startedAt,
      stageId: args.stageId,
      stageLabel: args.stageLabel
    });
    return content;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await args.emit({
      type: "agent_error",
      runId: args.runId,
      roleId: args.roleId,
      stageId: args.stageId,
      stageLabel: args.stageLabel,
      message
    });
    throw error;
  }
}

async function runModeratorAgent(args: {
  runId: string;
  input: DebateInput;
  outputs: RoleOutputs;
  emit: (event: Exclude<DebateEvent, { type: "server_ready" }>) => Promise<void>;
}): Promise<string> {
  const stageId: StageIdWithModerator = "moderator";
  const stageLabel = "最终裁决";
  const startedAt = Date.now();
  await args.emit({ type: "agent_started", runId: args.runId, roleId: "moderator", stageId, stageLabel });

  try {
    const content = args.input.demoMode
      ? await sleepThenDemo(args.runId, "moderator", stageId, stageLabel, args.input, args.emit)
      : await runCodexAgent({
          runId: args.runId,
          roleId: "moderator",
          stageId,
          stageLabel,
          prompt: buildModeratorPrompt(args.input, args.outputs),
          model: args.input.model,
          effort: args.input.reasoningEffort,
          onEvent: args.emit
        });
    await args.emit({
      type: "agent_output",
      runId: args.runId,
      roleId: "moderator",
      content,
      elapsedMs: Date.now() - startedAt,
      stageId,
      stageLabel
    });
    return content;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await args.emit({ type: "agent_error", runId: args.runId, roleId: "moderator", stageId, stageLabel, message });
    throw error;
  }
}

async function sleepThenDemoStage(
  runId: string,
  roleId: DebatingRoleId,
  stageId: DebateStageId,
  stageLabel: string,
  input: DebateInput,
  emit: (event: Exclude<DebateEvent, { type: "server_ready" }>) => Promise<void>
): Promise<string> {
  const stageIndex = debateStages.findIndex((stage) => stage.id === stageId);
  const roleIndex = debatingRoleIds.indexOf(roleId);
  await emit({
    type: "agent_event",
    runId,
    roleId,
    stageId,
    stageLabel,
    eventKind: "status",
    message: "Demo agent is producing a staged debate artifact."
  });
  await new Promise((resolve) => setTimeout(resolve, 350 + stageIndex * 220 + roleIndex * 160));
  return buildDemoStageOutput(roleId, stageId, input);
}

async function sleepThenDemo(
  runId: string,
  roleId: RoleId,
  stageId: StageIdWithModerator,
  stageLabel: string,
  input: DebateInput,
  emit: (event: Exclude<DebateEvent, { type: "server_ready" }>) => Promise<void>
): Promise<string> {
  await emit({
    type: "agent_event",
    runId,
    roleId,
    stageId,
    stageLabel,
    eventKind: "status",
    message: "Demo moderator is producing the final decision artifact."
  });
  await new Promise((resolve) => setTimeout(resolve, 500 + ROLE_SEQUENCE.indexOf(roleId) * 250));
  return buildDemoOutput(roleId, input);
}
