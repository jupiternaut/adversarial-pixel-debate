import type { RoleId, RoleStatus } from "../../shared/debate";
import manifestJson from "../assets/generated/asset-manifest.json";
import agentStatusAtlasUrl from "../assets/generated/agent-status-atlas.svg?url";
import warRoomAtlasUrl from "../assets/generated/war-room-atlas.svg?url";

export interface AtlasCell {
  atlas: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AtlasDefinition {
  id: string;
  file: string;
  width: number;
  height: number;
  frameWidth?: number;
  frameHeight?: number;
  cells?: Record<string, AtlasCell>;
}

export interface WarRoomAssetManifest {
  version: number;
  seed: string;
  theme: {
    name: string;
    positivePrompts: string[];
    negativePrompts: string[];
    rules: string[];
  };
  atlases: AtlasDefinition[];
  materials: Record<string, Record<string, string | number>>;
  roles: Record<RoleId, { color: string; frames: Record<RoleStatus, AtlasCell> }>;
}

export const warRoomManifest = manifestJson as WarRoomAssetManifest;

export const atlasUrls: Record<string, string> = {
  "war-room-atlas": warRoomAtlasUrl,
  "agent-status-atlas": agentStatusAtlasUrl
};

export function getAtlasDefinition(atlasId: string): AtlasDefinition {
  const atlas = warRoomManifest.atlases.find((item) => item.id === atlasId);
  if (!atlas) {
    throw new Error(`Unknown atlas: ${atlasId}`);
  }
  return atlas;
}

export function getAtlasCell(cellId: string): AtlasCell {
  for (const atlas of warRoomManifest.atlases) {
    const cell = atlas.cells?.[cellId];
    if (cell) {
      return cell;
    }
  }
  throw new Error(`Unknown atlas cell: ${cellId}`);
}

export function getRoleStatusFrame(roleId: RoleId, status: RoleStatus): AtlasCell {
  return warRoomManifest.roles[roleId].frames[status];
}
