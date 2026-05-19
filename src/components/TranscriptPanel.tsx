import type { CSSProperties } from "react";
import { ClipboardCheck, Copy, FileText, Radio } from "lucide-react";
import { roleDefinitions, type RoleId, type RoleStatus } from "../../shared/debate";

interface RoleState {
  status: RoleStatus;
  content: string;
  elapsedMs?: number;
  error?: string;
}

interface TranscriptPanelProps {
  roles: Record<RoleId, RoleState>;
  activeRunId: string | null;
  codexMessage?: string;
}

export function TranscriptPanel({ roles, activeRunId, codexMessage }: TranscriptPanelProps) {
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
