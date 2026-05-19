import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { roleDefinitions, type RoleId, type RoleStatus } from "../../shared/debate";
import { createWarRoomScene, type WarRoomSceneApi } from "../war-room/createWarRoomScene";
import { createWarRoomSceneState } from "../war-room/sceneState";

interface RoleState {
  status: RoleStatus;
  content: string;
  elapsedMs?: number;
  error?: string;
}

interface WarRoomStageProps {
  roles: Record<RoleId, RoleState>;
  activeRole: RoleId | null;
  allOutputs: number;
}

export function WarRoomStage({ roles, activeRole, allOutputs }: WarRoomStageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<WarRoomSceneApi | null>(null);
  const sceneState = useMemo(() => createWarRoomSceneState(roles, activeRole, allOutputs), [roles, activeRole, allOutputs]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) {
      return;
    }

    const scene = createWarRoomScene(canvas);
    sceneRef.current = scene;

    const resize = () => {
      const bounds = container.getBoundingClientRect();
      scene.resize(bounds.width, bounds.height);
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);
    resize();

    const start = performance.now();
    let frame = 0;
    const render = () => {
      scene.renderAt((performance.now() - start) / 1000);
      frame = window.requestAnimationFrame(render);
    };
    frame = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      scene.dispose();
      sceneRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.sync(sceneState);
  }, [sceneState]);

  const activeLabel = activeRole ? sceneState.roles.find((role) => role.id === activeRole)?.label : "STANDBY";
  const cast = sceneState.roles.map((roleState) => {
    const role = roleDefinitions.find((item) => item.id === roleState.id)!;
    return {
      role,
      roleState,
      status: roles[roleState.id]?.status ?? "idle",
      active: activeRole === roleState.id
    };
  });

  return (
    <div className="war-room-stage" ref={containerRef}>
      <canvas ref={canvasRef} className="war-room-canvas" aria-label="AI War Room 3D stage" />
      <div className="war-room-hud" aria-hidden="true">
        <span>AI WAR ROOM</span>
        <strong>{allOutputs}/4 verified</strong>
        <em>{activeLabel}</em>
      </div>
      <div className="role-cast" aria-label="角色对话状态">
        {cast.map(({ role, roleState, status, active }) => (
          <div
            className={`cast-card cast-${role.id} ${status}${active ? " active" : ""}`}
            style={{ "--role-color": role.color } as CSSProperties}
            key={role.id}
          >
            <div className="cast-avatar">
              <span className="cast-hair" />
              <span className="cast-head">
                <i />
              </span>
              <span className="cast-body">
                <b />
              </span>
              <span className="cast-tool" />
            </div>
            <div className="cast-copy">
              <strong>{role.artBadge}</strong>
              <span>{role.artRole}</span>
            </div>
            <div className="cast-speech">
              <div>
                <strong>{role.label}</strong>
                <em>{statusLabel(roleState.status)}</em>
              </div>
              <p>{dialogueText(role.id, roleState.status, roleState.preview)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function statusLabel(status: RoleStatus): string {
  return {
    idle: "standby",
    queued: "queued",
    speaking: "speaking",
    done: "done",
    error: "error"
  }[status];
}

function dialogueText(roleId: RoleId, status: RoleStatus, preview: string): string {
  const role = roleDefinitions.find((item) => item.id === roleId);
  const cleanPreview = preview.replace(/[#*_`>\-]+/g, " ").replace(/\s+/g, " ").trim();
  if (status === "queued") {
    return `${role?.zhName || roleId} 已进入队列，等待发言窗口。`;
  }
  if (status === "speaking") {
    return cleanPreview || `${role?.zhName || roleId} 正在组织论点。`;
  }
  if (status === "done") {
    return cleanPreview || `${role?.zhName || roleId} 已提交摘要。`;
  }
  if (status === "error") {
    return cleanPreview || "调用失败，需要检查本地 Codex 或网络。";
  }
  return role?.shortMission || "等待任务。";
}
