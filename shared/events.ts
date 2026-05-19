import type { DebateInput, DebateStageId, RoleId, RoleOutputs, RoleStatus } from "./debate.js";

export type StageIdWithModerator = DebateStageId | "moderator";

export type AgentEventKind =
  | "status"
  | "reasoning"
  | "message"
  | "tool_call"
  | "tool_result"
  | "stderr"
  | "raw";

export interface CodexHealth {
  available: boolean;
  version?: string;
  message: string;
}

export interface AgentTraceEvent {
  type: "agent_event";
  runId: string;
  roleId: RoleId;
  stageId: StageIdWithModerator;
  stageLabel: string;
  eventKind: AgentEventKind;
  message: string;
  rawType?: string;
  elapsedMs?: number;
}

export type DebateEvent =
  | { type: "server_ready"; codex: CodexHealth }
  | { type: "run_started"; runId: string; input: DebateInput }
  | { type: "agent_started"; runId: string; roleId: RoleId; stageId: StageIdWithModerator; stageLabel: string }
  | AgentTraceEvent
  | {
      type: "agent_output";
      runId: string;
      roleId: RoleId;
      content: string;
      elapsedMs: number;
      stageId: StageIdWithModerator;
      stageLabel: string;
    }
  | { type: "agent_error"; runId: string; roleId: RoleId; stageId: StageIdWithModerator; stageLabel: string; message: string }
  | { type: "run_finished"; runId: string; outputs: RoleOutputs }
  | { type: "run_error"; runId: string; message: string };

export type RunLedgerEvent = Exclude<DebateEvent, { type: "server_ready" }> & {
  sequence: number;
  timestamp: string;
};

export interface RoleRunSummary {
  status: RoleStatus;
  content: string;
  error?: string;
  stageId?: StageIdWithModerator;
  stageLabel?: string;
  elapsedMs?: number;
  latestEvent?: string;
}

export interface RunSummary {
  runId: string;
  input?: DebateInput;
  status: "idle" | "running" | "finished" | "error";
  outputs: RoleOutputs;
  roles: Record<RoleId, RoleRunSummary>;
  eventCount: number;
  latestSequence: number;
}

export interface RunVerificationCheck {
  id: string;
  label: string;
  ok: boolean;
  message: string;
}

export interface RunVerification {
  runId: string;
  ok: boolean;
  checks: RunVerificationCheck[];
}
