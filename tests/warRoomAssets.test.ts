import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { roleDefinitions, type RoleStatus } from "../shared/debate";
import { getAtlasCell, getAtlasDefinition, getRoleStatusFrame, warRoomManifest } from "../src/war-room/assets";
import { createWarRoomSceneState, statusVisuals } from "../src/war-room/sceneState";

const generatedDir = join(process.cwd(), "src", "assets", "generated");
const roleStatuses: RoleStatus[] = ["idle", "queued", "speaking", "done", "error"];

describe("war room asset pack", () => {
  it("generates the manifest and atlas files", () => {
    expect(existsSync(join(generatedDir, "war-room-atlas.svg"))).toBe(true);
    expect(existsSync(join(generatedDir, "agent-status-atlas.svg"))).toBe(true);
    expect(existsSync(join(generatedDir, "asset-manifest.json"))).toBe(true);
    expect(warRoomManifest.seed).toBe("war-room-v2-20260518");
  });

  it("keeps atlas ids unique and dimensions valid", () => {
    const atlasIds = warRoomManifest.atlases.map((atlas) => atlas.id);
    expect(new Set(atlasIds).size).toBe(atlasIds.length);
    for (const atlas of warRoomManifest.atlases) {
      expect(atlas.width).toBeGreaterThan(0);
      expect(atlas.height).toBeGreaterThan(0);
      expect(existsSync(join(generatedDir, atlas.file))).toBe(true);
    }
  });

  it("renders agent-native professional role cards", () => {
    const statusAtlas = getAtlasDefinition("agent-status-atlas");
    const statusSvg = readFileSync(join(generatedDir, "agent-status-atlas.svg"), "utf8");

    expect(statusAtlas.frameWidth).toBe(160);
    expect(statusAtlas.frameHeight).toBe(128);
    expect(statusSvg).toContain("Growth CEO");
    expect(statusSvg).toContain("Risk Reviewer");
    expect(statusSvg).toContain("Systems Programmer");
    expect(statusSvg).toContain("Coord Lead");
  });

  it("keeps named atlas cells inside their atlas boundaries", () => {
    for (const atlas of warRoomManifest.atlases) {
      for (const cell of Object.values(atlas.cells || {})) {
        const owner = getAtlasDefinition(cell.atlas);
        expect(cell.x).toBeGreaterThanOrEqual(0);
        expect(cell.y).toBeGreaterThanOrEqual(0);
        expect(cell.x + cell.width).toBeLessThanOrEqual(owner.width);
        expect(cell.y + cell.height).toBeLessThanOrEqual(owner.height);
      }
    }
    expect(getAtlasCell("data-wall").atlas).toBe("war-room-atlas");
  });

  it("maps every role status to a frame and visual behavior", () => {
    for (const role of roleDefinitions) {
      for (const status of roleStatuses) {
        const frame = getRoleStatusFrame(role.id, status);
        const atlas = getAtlasDefinition(frame.atlas);
        expect(frame.x + frame.width).toBeLessThanOrEqual(atlas.width);
        expect(frame.y + frame.height).toBeLessThanOrEqual(atlas.height);
        expect(statusVisuals[status].lightIntensity).toBeGreaterThan(0);
      }
    }
  });

  it("builds scene state from debate role state", () => {
    const roles = Object.fromEntries(
      roleDefinitions.map((role) => [role.id, { status: role.id === "bear" ? "speaking" : "idle", content: `${role.label} text` }])
    ) as Parameters<typeof createWarRoomSceneState>[0];
    const state = createWarRoomSceneState(roles, "bear", 1);

    expect(state.roles).toHaveLength(4);
    expect(state.activeRole).toBe("bear");
    expect(state.roles.find((role) => role.id === "bear")?.active).toBe(true);
    expect(state.roles.find((role) => role.id === "bear")?.status).toBe("speaking");
  });
});
