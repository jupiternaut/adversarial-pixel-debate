import { useEffect, useMemo, useRef, useState } from "react";
import { CircleStop, FlaskConical, GitBranch, Layers3, Network, Play, ShieldCheck, Sparkles, TerminalSquare } from "lucide-react";
import {
  roleDefinitions,
  type BriefExpansion,
  type DebateStageId,
  type DebateInput,
  type RoleId,
  type RoleOutputs,
  type RoleStatus
} from "../shared/debate";
import { TranscriptPanel } from "./components/TranscriptPanel";
import { WarRoomStage } from "./components/WarRoomStage";

interface RoleState {
  status: RoleStatus;
  content: string;
  elapsedMs?: number;
  error?: string;
}

type RunStatus = "idle" | "running" | "finished" | "error";
type BriefStatus = "idle" | "expanding" | "error";

type DebateEvent =
  | { type: "server-ready"; codex: CodexHealth }
  | { type: "run-started"; runId: string; input: DebateInput }
  | { type: "role-started"; runId: string; roleId: RoleId; stageId?: DebateStageId | "moderator"; stageLabel?: string }
  | {
      type: "role-output";
      runId: string;
      roleId: RoleId;
      content: string;
      elapsedMs: number;
      stageId?: DebateStageId | "moderator";
      stageLabel?: string;
    }
  | { type: "role-error"; runId: string; roleId: RoleId; message: string }
  | { type: "run-finished"; runId: string; outputs: RoleOutputs }
  | { type: "run-error"; runId: string; message: string };

interface CodexHealth {
  available: boolean;
  version?: string;
  message: string;
}

const initialRoles = Object.fromEntries(
  roleDefinitions.map((role) => [role.id, { status: "idle", content: "" }])
) as Record<RoleId, RoleState>;

const defaultInput: DebateInput = {
  topic: "是否应该做一个像素小人的多智能体决策辩论 App",
  background: "用户希望用 Codex OAuth 驱动多个角色，像 PixelHQ 一样可视化 AI 工作状态，但实现必须原创。",
  goal: "验证这个产品是否值得继续做成桌面 App。",
  constraints: "本地优先；不能复制闭源应用代码和素材；尽量不读取敏感凭据。",
  dataNotes: "当前只有需求描述，没有真实用户数据。",
  timeframe: "未来 7-14 天完成 MVP 验证。",
  decisionUse: "产品",
  model: "",
  reasoningEffort: "low",
  demoMode: false
};

export function App() {
  const [input, setInput] = useState<DebateInput>(defaultInput);
  const [roles, setRoles] = useState<Record<RoleId, RoleState>>(initialRoles);
  const [runStatus, setRunStatus] = useState<RunStatus>("idle");
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<RoleId | null>(null);
  const [codexHealth, setCodexHealth] = useState<CodexHealth | null>(null);
  const [socketReady, setSocketReady] = useState(false);
  const [runMessage, setRunMessage] = useState("等待输入");
  const [briefSeed, setBriefSeed] = useState(defaultInput.topic);
  const [briefStatus, setBriefStatus] = useState<BriefStatus>("idle");
  const [briefMessage, setBriefMessage] = useState("输入一句话，自动补全下面的 Brief。");
  const runIdRef = useRef<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((response) => response.json())
      .then((payload: { codex: CodexHealth }) => setCodexHealth(payload.codex))
      .catch((error: Error) => setCodexHealth({ available: false, message: error.message }));
  }, []);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${protocol}://${window.location.host}/ws`);

    socket.addEventListener("open", () => setSocketReady(true));
    socket.addEventListener("close", () => setSocketReady(false));
    socket.addEventListener("message", (message) => {
      const event = JSON.parse(String(message.data)) as DebateEvent;
      handleEvent(event);
    });

    return () => socket.close();
  }, []);

  const allOutputs = useMemo(() => Object.values(roles).filter((role) => role.content).length, [roles]);
  const roleProgress = useMemo(
    () =>
      roleDefinitions.map((role) => ({
        ...role,
        status: roles[role.id].status,
        hasOutput: Boolean(roles[role.id].content)
      })),
    [roles]
  );
  const runTone = runStatus === "error" ? "danger" : runStatus === "running" ? "warn" : runStatus === "finished" ? "ok" : "neutral";

  function handleEvent(event: DebateEvent) {
    if (event.type === "server-ready") {
      setCodexHealth(event.codex);
      return;
    }
    if ("runId" in event && runIdRef.current && event.runId !== runIdRef.current) {
      return;
    }

    if (event.type === "run-started") {
      setRunStatus("running");
      setRunMessage("辩论开始：开场立论 -> 交叉红队 -> 阶段共识");
      return;
    }
    if (event.type === "role-started") {
      setActiveRole(event.roleId);
      setRunMessage(`${event.stageLabel ? `${event.stageLabel} · ` : ""}${roleLabel(event.roleId)} 正在发言`);
      setRoles((current) => ({
        ...current,
        [event.roleId]: { ...current[event.roleId], status: "speaking", error: undefined }
      }));
      return;
    }
    if (event.type === "role-output") {
      setRoles((current) => ({
        ...current,
        [event.roleId]: {
          ...current[event.roleId],
          status: "done",
          content: event.content,
          elapsedMs: event.elapsedMs
        }
      }));
      setRunMessage(`${event.stageLabel ? `${event.stageLabel} · ` : ""}${roleLabel(event.roleId)} 已更新`);
      return;
    }
    if (event.type === "role-error") {
      setRoles((current) => ({
        ...current,
        [event.roleId]: { ...current[event.roleId], status: "error", error: event.message }
      }));
      setRunStatus("error");
      setRunMessage(event.message);
      return;
    }
    if (event.type === "run-finished") {
      setRunStatus("finished");
      setActiveRole(null);
      setRunMessage("辩论完成");
      return;
    }
    if (event.type === "run-error") {
      setRunStatus("error");
      setActiveRole(null);
      setRunMessage(event.message);
    }
  }

  async function startDebate() {
    if (!input.topic.trim() || runStatus === "running") {
      return;
    }
    setRoles(Object.fromEntries(roleDefinitions.map((role) => [role.id, { status: "queued", content: "" }])) as Record<
      RoleId,
      RoleState
    >);
    setRunStatus("running");
    setRunMessage("提交给本机 Codex OAuth");

    const response = await fetch("/api/debates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input)
    });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setRunStatus("error");
      setRunMessage(payload.error || "提交失败");
      return;
    }
    const payload = (await response.json()) as { runId: string };
    runIdRef.current = payload.runId;
    setActiveRunId(payload.runId);
  }

  async function expandBrief() {
    const seed = briefSeed.trim() || input.topic.trim();
    if (!seed || briefStatus === "expanding" || runStatus === "running") {
      return;
    }

    setBriefStatus("expanding");
    setBriefMessage(input.demoMode ? "演示模式：正在本地补全 Brief。" : "正在通过 Codex skill 补全 Brief。");
    setRunMessage("正在补全 Brief");

    const response = await fetch("/api/briefs/expand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        seed,
        current: input,
        demoMode: input.demoMode,
        model: input.model,
        reasoningEffort: input.reasoningEffort
      })
    });

    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setBriefStatus("error");
      setBriefMessage(payload.error || "Brief 补全失败。");
      setRunMessage("Brief 补全失败");
      return;
    }

    const payload = (await response.json()) as { brief: BriefExpansion };
    setInput((current) => ({
      ...current,
      ...payload.brief,
      model: current.model,
      reasoningEffort: current.reasoningEffort,
      demoMode: current.demoMode
    }));
    setBriefStatus("idle");
    setBriefMessage("Brief 已补全，可直接开始辩论，也可以继续微调字段。");
    setRunMessage("Brief 已补全");
  }

  function updateField(field: keyof DebateInput, value: string | boolean) {
    setInput((current) => ({ ...current, [field]: value }));
  }

  return (
    <main className="app-shell">
      <section className="control-panel" aria-label="决策输入">
        <div className="control-panel-inner">
          <div className="brand-row">
            <div className="brand-mark">AP</div>
            <div>
              <h1>ADSS War Room</h1>
              <p>Codex OAuth 多智能体决策桌面</p>
            </div>
          </div>

          <div className="workspace-card">
            <div className="workspace-card-head">
              <TerminalSquare size={16} />
              <span>Local Codex Workspace</span>
            </div>
            <dl>
              <div>
                <dt>Transport</dt>
                <dd>{socketReady ? "WebSocket live" : "connecting"}</dd>
              </div>
              <div>
                <dt>Auth</dt>
                <dd>{codexHealth?.available ? "ChatGPT OAuth" : "not ready"}</dd>
              </div>
              <div>
                <dt>Run</dt>
                <dd>{activeRunId ? activeRunId.slice(0, 8) : "new session"}</dd>
              </div>
            </dl>
          </div>

          <div className="role-progress" aria-label="角色进度">
            {roleProgress.map((role) => (
              <div key={role.id} className={`role-progress-item ${role.status}`}>
                <span style={{ background: role.color }} />
                <strong>{role.label}</strong>
                <em>{role.status}</em>
              </div>
            ))}
          </div>

          <div className="control-card brief-builder-card">
            <div className="section-title">
              <span>Brief Builder Skill</span>
              <strong>一句话</strong>
            </div>
            <label>
              <span>一句话需求</span>
              <textarea
                value={briefSeed}
                onChange={(event) => setBriefSeed(event.target.value)}
                rows={3}
                placeholder="例如：我想做一个用 Codex OAuth 驱动的多智能体桌面 App"
              />
            </label>
            <button
              className="secondary-button"
              onClick={expandBrief}
              disabled={briefStatus === "expanding" || runStatus === "running" || !briefSeed.trim()}
            >
              <Sparkles size={16} />
              {briefStatus === "expanding" ? "补全中" : "自动补全 Brief"}
            </button>
            <p className={`brief-builder-note ${briefStatus}`}>{briefMessage}</p>
          </div>

          <div className="control-card primary-card">
            <div className="section-title">
              <span>Decision Brief</span>
              <strong>{input.decisionUse || "其他"}</strong>
            </div>
            <label>
              <span>主题 / 决策 / 项目</span>
              <textarea
                value={input.topic}
                onChange={(event) => updateField("topic", event.target.value)}
                rows={2}
                placeholder="输入要压力测试的决策"
              />
            </label>
            <label>
              <span>背景</span>
              <textarea value={input.background} onChange={(event) => updateField("background", event.target.value)} rows={3} />
            </label>
          </div>

          <div className="control-card compact-card">
            <label>
              <span>目标</span>
              <input value={input.goal || ""} onChange={(event) => updateField("goal", event.target.value)} />
            </label>
            <label>
              <span>约束</span>
              <input value={input.constraints || ""} onChange={(event) => updateField("constraints", event.target.value)} />
            </label>
          </div>

          <div className="field-grid control-card">
            <label>
              <span>用途</span>
              <select value={input.decisionUse || "其他"} onChange={(event) => updateField("decisionUse", event.target.value)}>
                <option>产品</option>
                <option>投资</option>
                <option>创业</option>
                <option>战略</option>
                <option>职业</option>
                <option>技术路线</option>
                <option>其他</option>
              </select>
            </label>
            <label>
              <span>推理强度</span>
              <select
                value={input.reasoningEffort || "default"}
                onChange={(event) => updateField("reasoningEffort", event.target.value)}
              >
                <option value="default">Codex 默认</option>
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="xhigh">超高</option>
              </select>
            </label>
          </div>

          <div className="control-card compact-card">
            <label>
              <span>模型</span>
              <input
                value={input.model || ""}
                onChange={(event) => updateField("model", event.target.value)}
                placeholder="留空使用 Codex CLI 默认模型"
              />
            </label>
            <label>
              <span>已知数据 / 时间范围</span>
              <textarea
                value={[input.dataNotes || "", input.timeframe || ""].filter(Boolean).join("\n")}
                onChange={(event) => {
                  const [dataNotes = "", timeframe = ""] = event.target.value.split("\n");
                  setInput((current) => ({ ...current, dataNotes, timeframe }));
                }}
                rows={2}
              />
            </label>
          </div>

          <div className="control-footer">
            <div className="toggle-row">
              <input
                id="demo-mode"
                type="checkbox"
                checked={Boolean(input.demoMode)}
                onChange={(event) => updateField("demoMode", event.target.checked)}
              />
              <label htmlFor="demo-mode">演示模式，不调用 Codex</label>
            </div>

            <button className="run-button" onClick={startDebate} disabled={runStatus === "running" || !input.topic.trim()}>
              {runStatus === "running" ? <CircleStop size={18} /> : <Play size={18} />}
              {runStatus === "running" ? "运行中" : "开始辩论"}
            </button>
          </div>

        </div>
      </section>

      <section className="stage-panel" aria-label="AI 战情室">
        <div className="stage-topbar">
          <div className="stage-title">
            <span>AI 战情室</span>
            <strong>{runMessage}</strong>
          </div>
          <div className="status-strip">
            <StatusPill icon={<Network size={16} />} label={socketReady ? "实时连接" : "连接中"} tone={socketReady ? "ok" : "warn"} />
            <StatusPill
              icon={<ShieldCheck size={16} />}
              label={codexHealth?.available ? codexHealth.version || "Codex OAuth" : "Codex 未就绪"}
              tone={codexHealth?.available ? "ok" : "danger"}
            />
            <StatusPill icon={<FlaskConical size={16} />} label={runStatus} tone={runTone} />
          </div>
        </div>

        <WarRoomStage roles={roles} activeRole={activeRole} allOutputs={allOutputs} />

        <div className="command-dock" aria-label="执行证据">
          <div>
            <GitBranch size={15} />
            <span>role pipeline</span>
            <strong>{"Opening -> Red-team -> Consensus -> Moderator"}</strong>
          </div>
          <div>
            <Layers3 size={15} />
            <span>outputs</span>
            <strong>{allOutputs}/4 ready</strong>
          </div>
          <div>
            <TerminalSquare size={15} />
            <span>runtime</span>
            <strong>{input.demoMode ? "demo mode" : "codex exec read-only"}</strong>
          </div>
        </div>
      </section>

      <TranscriptPanel roles={roles} activeRunId={activeRunId} codexMessage={codexHealth?.message} />
    </main>
  );
}

function StatusPill({ icon, label, tone }: { icon: React.ReactNode; label: string; tone: "ok" | "warn" | "danger" | "neutral" }) {
  return (
    <div className={`status-pill ${tone}`}>
      {icon}
      <span>{label}</span>
    </div>
  );
}

function roleLabel(roleId: RoleId): string {
  const role = roleDefinitions.find((item) => item.id === roleId);
  return role ? `${role.label} / ${role.zhName}` : roleId;
}
