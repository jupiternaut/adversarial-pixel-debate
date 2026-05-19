import { roleDefinitions, type RoleId, type RoleStatus } from "../../shared/debate";

export interface RoleStateLike {
  status: RoleStatus;
  content: string;
  elapsedMs?: number;
  error?: string;
}

export interface RoleSceneState {
  id: RoleId;
  label: string;
  zhName: string;
  color: string;
  status: RoleStatus;
  active: boolean;
  preview: string;
}

export interface WarRoomSceneState {
  roles: RoleSceneState[];
  activeRole: RoleId | null;
  allOutputs: number;
}

export const roleSeats: Record<RoleId, { x: number; z: number; heading: number }> = {
  bull: { x: -2.9, z: -0.85, heading: Math.PI * 0.22 },
  bear: { x: 2.9, z: -0.85, heading: -Math.PI * 0.22 },
  engineer: { x: -2.3, z: 2.15, heading: Math.PI * 0.82 },
  moderator: { x: 2.3, z: 2.15, heading: -Math.PI * 0.82 }
};

export const statusVisuals: Record<
  RoleStatus,
  {
    color: string;
    lightIntensity: number;
    lift: number;
    pulseSpeed: number;
    panelOpacity: number;
  }
> = {
  idle: { color: "#8091a5", lightIntensity: 0.45, lift: 0, pulseSpeed: 0.45, panelOpacity: 0.74 },
  queued: { color: "#d09a26", lightIntensity: 0.92, lift: 0.03, pulseSpeed: 1.2, panelOpacity: 0.82 },
  speaking: { color: "#70e8ff", lightIntensity: 2.6, lift: 0.12, pulseSpeed: 4.6, panelOpacity: 1 },
  done: { color: "#19a463", lightIntensity: 1.25, lift: 0.06, pulseSpeed: 0.8, panelOpacity: 0.9 },
  error: { color: "#c7403a", lightIntensity: 2.2, lift: 0.02, pulseSpeed: 5.4, panelOpacity: 1 }
};

export function createWarRoomSceneState(
  roles: Record<RoleId, RoleStateLike>,
  activeRole: RoleId | null,
  allOutputs: number
): WarRoomSceneState {
  return {
    activeRole,
    allOutputs,
    roles: roleDefinitions.map((role) => {
      const state = roles[role.id];
      return {
        id: role.id,
        label: role.label,
        zhName: role.zhName,
        color: role.color,
        status: state.status,
        active: activeRole === role.id,
        preview: previewText(state.error || state.content || role.shortMission)
      };
    })
  };
}

function previewText(value: string): string {
  const latestStage = value.split(/\n\s*---\s*\n/).at(-1) || value;
  return latestStage.replace(/\s+/g, " ").slice(0, 80);
}
