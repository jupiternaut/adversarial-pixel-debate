import type { CSSProperties } from "react";
import { ClipboardCheck, Copy, FileText, Radio } from "lucide-react";
import { roleDefinitions, type RoleId, type RoleStatus } from "../../shared/debate";
import type { AgentTraceEvent } from "../../shared/events";

interface RoleState {
  status: RoleStatus;
  content: string;
  latestEvent?: string;
  elapsedMs?: number;
  error?: string;
}

interface TranscriptPanelProps {
  roles: Record<RoleId, RoleState>;
  activeRunId: string | null;
  codexMessage?: string;
  agentTrace: AgentTraceEvent[];
}

export function TranscriptPanel({ roles, activeRunId, codexMessage, agentTrace }: TranscriptPanelProps) {
  const finalText = roleDefinitions
    .map((role) => `# ${role.label} / ${role.zhName}\n\n${roles[role.id].content || roles[role.id].error || ""}`)
    .join("\n\n---\n\n");
  const completedCount = roleDefinitions.filter((role) => roles[role.id].content).length;
  const activeRole = roleDefinitions.find((role) => roles[role.id].status === "speaking");

  return (
    <aside className="transcript-panel" aria-label="辩论输出">
      <header>
        <div>
          <h2>Debate Log</h2>
          <p>{activeRunId ? `run ${activeRunId.slice(0, 8)}` : "尚未开始"}</p>
        </div>
        <button
          className="icon-button"
          title="复制全文"
          onClick={() => navigator.clipboard.writeText(finalText)}
          disabled={!finalText.trim()}
        >
          <Copy size={17} />
        </button>
      </header>

      <div className="codex-note">
        <FileText size={16} />
        <span>{codexMessage || "等待 Codex CLI 状态"}</span>
      </div>

      <div className="transcript-summary">
        <div>
          <ClipboardCheck size={16} />
          <span>Markdown artifact</span>
          <strong>{completedCount}/4</strong>
        </div>
        <div>
          <Radio size={16} />
          <span>Active speaker</span>
          <strong>{activeRole?.label || "Standby"}</strong>
        </div>
      </div>

      <section className="agent-trace-panel" aria-label="Agent Trace">
        <div className="agent-trace-head">
          <strong>Agent Trace</strong>
          <span>{agentTrace.length} events</span>
        </div>
        <div className="agent-trace-list">
          {agentTrace.length ? (
            agentTrace.slice(-16).map((event, index) => (
              <article key={`${event.runId}-${event.roleId}-${event.stageId}-${index}`} className={`agent-trace-item ${event.eventKind}`}>
                <div>
                  <strong>{roleLabel(event.roleId)}</strong>
                  <span>{event.stageLabel}</span>
                  <em>{event.eventKind}</em>
                </div>
                <p>{event.message}</p>
              </article>
            ))
          ) : (
            <p className="agent-trace-empty">等待 agent 子进程事件。</p>
          )}
        </div>
      </section>

      <div className="role-list">
        {roleDefinitions.map((role) => {
          const state = roles[role.id];
          const style = { "--role-color": role.color } as CSSProperties;
          return (
            <article key={role.id} className={`role-card ${state.status}`} style={style}>
              <div className="role-card-head">
                <div className="role-card-title">
                  <strong>{role.label}</strong>
                  <span>{role.zhName}</span>
                </div>
                <small className={`status-badge ${state.status}`}>
                  {state.elapsedMs ? `${Math.round(state.elapsedMs / 1000)}s` : state.status}
                </small>
              </div>
              <pre>{state.error || state.content || role.shortMission}</pre>
            </article>
          );
        })}
      </div>
    </aside>
  );
}

function roleLabel(roleId: RoleId): string {
  return roleDefinitions.find((role) => role.id === roleId)?.label || roleId;
}
