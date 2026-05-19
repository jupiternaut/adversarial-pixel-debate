import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outDir = join(root, "src", "assets", "generated");

const seed = "war-room-v2-20260518";
const atlasSize = 512;
const STATUS_FRAME = { width: 160, height: 128 };
const statuses = ["idle", "queued", "speaking", "done", "error"];
const roles = [
  {
    id: "bull",
    label: "BULL",
    title: "Growth CEO",
    color: "#19a463",
    hair: "#d8793b",
    hairDark: "#733c38",
    hairLight: "#ffb15f",
    jacket: "#8b52b9",
    accent: "#f2b84b",
    tool: "growth"
  },
  {
    id: "bear",
    label: "BEAR",
    title: "Risk Reviewer",
    color: "#c7403a",
    hair: "#a8323f",
    hairDark: "#552439",
    hairLight: "#e85f64",
    jacket: "#bb4151",
    accent: "#70c84f",
    tool: "review"
  },
  {
    id: "engineer",
    label: "ENG",
    title: "Systems Programmer",
    color: "#2f6fc7",
    hair: "#8a5a35",
    hairDark: "#3f2a2a",
    hairLight: "#bd7b3e",
    jacket: "#253443",
    accent: "#4da3ff",
    tool: "code"
  },
  {
    id: "moderator",
    label: "MOD",
    title: "Coord Lead",
    color: "#b8871f",
    hair: "#e0a12b",
    hairDark: "#8a5b17",
    hairLight: "#ffe15a",
    jacket: "#674d9b",
    accent: "#d89a18",
    tool: "qa"
  }
];

const palette = {
  void: "#09111f",
  base: "#101b2d",
  base2: "#162238",
  floor: "#1b2a3f",
  line: "#2f4662",
  cyan: "#70e8ff",
  blue: "#2868c7",
  green: "#19a463",
  red: "#c7403a",
  amber: "#d09a26",
  white: "#edf7ff",
  glass: "#9ed8ff",
  muted: "#8091a5"
};

function esc(value) {
  return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function rect(x, y, w, h, fill, extra = "") {
  return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"${extra}/>`;
}

function line(x1, y1, x2, y2, stroke, width = 2, extra = "") {
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${width}"${extra}/>`;
}

function text(x, y, value, size = 18, fill = palette.white, extra = "") {
  return `<text x="${x}" y="${y}" fill="${fill}" font-family="Inter,Arial,sans-serif" font-size="${size}" font-weight="800" letter-spacing="1"${extra}>${esc(value)}</text>`;
}

function cell(id, x, y, w, h, body) {
  return `<g id="${id}" transform="translate(${x} ${y})">${body}</g>`;
}

function gridCell() {
  const paths = [];
  for (let x = 0; x <= 256; x += 32) {
    paths.push(line(x, 0, x, 256, x % 64 === 0 ? "#38536d" : "#253a50", x % 64 === 0 ? 2 : 1));
  }
  for (let y = 0; y <= 256; y += 32) {
    paths.push(line(0, y, 256, y, y % 64 === 0 ? "#38536d" : "#253a50", y % 64 === 0 ? 2 : 1));
  }
  return [
    rect(0, 0, 256, 256, palette.floor),
    ...paths,
    rect(0, 0, 256, 256, "none", ` stroke="${palette.cyan}" stroke-width="3" opacity="0.18"`)
  ].join("");
}

function dataWallCell() {
  const bars = Array.from({ length: 9 }, (_, index) =>
    rect(18 + index * 24, 142 - index * 8, 12, 34 + index * 8, index % 3 === 0 ? palette.green : index % 3 === 1 ? palette.blue : palette.amber, ' opacity="0.86"')
  );
  return [
    rect(0, 0, 256, 128, "#0d1828"),
    rect(8, 8, 240, 112, "#122236", ` stroke="${palette.line}" stroke-width="4"`),
    line(24, 88, 58, 62, palette.cyan, 4),
    line(58, 62, 96, 72, palette.cyan, 4),
    line(96, 72, 138, 38, "#ff6f61", 4),
    line(138, 38, 212, 54, palette.green, 4),
    ...bars,
    text(22, 30, "ADSS OPS", 15, palette.white),
    text(154, 105, "VERIFY", 13, palette.cyan)
  ].join("");
}

function translucentPanelCell() {
  return [
    rect(0, 0, 256, 128, "#00000000"),
    rect(10, 14, 236, 96, "rgba(143,211,255,0.24)", ` stroke="${palette.glass}" stroke-width="4" rx="10"`),
    rect(22, 28, 98, 10, palette.cyan, ' opacity="0.76"'),
    rect(22, 48, 190, 8, palette.white, ' opacity="0.62"'),
    rect(22, 64, 154, 8, palette.white, ' opacity="0.42"'),
    rect(22, 82, 64, 12, palette.green, ' opacity="0.85"'),
    rect(96, 82, 64, 12, palette.amber, ' opacity="0.85"')
  ].join("");
}

function iconStripCell() {
  return [
    rect(0, 0, 256, 128, "#0d1828"),
    rect(14, 24, 42, 42, palette.green, ' opacity="0.9" rx="8"'),
    rect(76, 24, 42, 42, palette.red, ' opacity="0.9" rx="8"'),
    rect(138, 24, 42, 42, palette.blue, ' opacity="0.9" rx="8"'),
    rect(200, 24, 42, 42, palette.amber, ' opacity="0.9" rx="8"'),
    text(24, 52, "+", 24, palette.void),
    text(88, 52, "!", 24, palette.void),
    text(148, 52, "E", 22, palette.void),
    text(210, 52, "M", 22, palette.void),
    rect(18, 86, 220, 7, palette.cyan, ' opacity="0.6"'),
    rect(18, 100, 146, 6, palette.white, ' opacity="0.4"')
  ].join("");
}

function warRoomAtlasSvg() {
  const cells = [
    cell("floor-grid", 0, 0, 256, 256, gridCell()),
    cell("data-wall", 256, 0, 256, 128, dataWallCell()),
    cell("glass-panel", 256, 128, 256, 128, translucentPanelCell()),
    cell("icon-strip", 0, 256, 256, 128, iconStripCell()),
    cell(
      "table-top",
      256,
      256,
      256,
      128,
      [
        rect(0, 0, 256, 128, "#122236"),
        rect(14, 18, 228, 86, "rgba(143,211,255,0.2)", ` stroke="${palette.glass}" stroke-width="5" rx="24"`),
        line(40, 64, 216, 64, palette.cyan, 2, ' opacity="0.5"'),
        line(128, 26, 128, 104, palette.cyan, 2, ' opacity="0.35"'),
        text(74, 73, "WAR ROOM", 18, palette.cyan)
      ].join("")
    ),
    cell(
      "status-light",
      0,
      384,
      256,
      128,
      [
        rect(0, 0, 256, 128, "#0d1828"),
        rect(30, 34, 42, 42, palette.green, ' rx="21"'),
        rect(86, 34, 42, 42, palette.amber, ' rx="21"'),
        rect(142, 34, 42, 42, palette.cyan, ' rx="21"'),
        rect(198, 34, 42, 42, palette.red, ' rx="21"')
      ].join("")
    ),
    cell(
      "logo-plate",
      256,
      384,
      256,
      128,
      [
        rect(0, 0, 256, 128, palette.base),
        rect(14, 18, 228, 88, "#111827", ` stroke="${palette.cyan}" stroke-width="4" rx="8"`),
        text(36, 72, "AI WAR ROOM", 24, palette.white)
      ].join("")
    )
  ];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${atlasSize}" height="${atlasSize}" viewBox="0 0 ${atlasSize} ${atlasSize}" shape-rendering="crispEdges">${cells.join("")}</svg>`;
}

function statusColor(status, roleColor) {
  if (status === "idle") return palette.muted;
  if (status === "queued") return palette.amber;
  if (status === "speaking") return roleColor;
  if (status === "done") return palette.green;
  return palette.red;
}

function statusGlyph(status) {
  return {
    idle: "IDLE",
    queued: "QUEUE",
    speaking: "LIVE",
    done: "DONE",
    error: "ERR"
  }[status];
}

function roleTool(role, status, x, y) {
  const active = status === "speaking" || status === "done";
  if (role.tool === "growth") {
    return [
      rect(x, y, 11, 14, palette.void),
      rect(x + 2, y + 2, 7, 10, "#fff8db"),
      rect(x + 3, y + 9 - (active ? 2 : 0), 1, 3 + (active ? 2 : 0), role.color),
      rect(x + 6, y + 7 - (active ? 2 : 0), 1, 5 + (active ? 2 : 0), palette.blue)
    ].join("");
  }
  if (role.tool === "review") {
    return [
      rect(x, y, 12, 16, palette.void),
      rect(x + 2, y + 3, 8, 11, "#fff7f7"),
      rect(x + 3, y + 6, 5, 1, palette.red),
      rect(x + 3, y + 10, 5, 1, active ? palette.red : palette.muted)
    ].join("");
  }
  if (role.tool === "code") {
    return [
      rect(x - 2, y + 6, 17, 10, palette.void),
      rect(x, y + 8, 13, 6, palette.blue),
      rect(x + 2, y + 10, 3, 1, palette.cyan),
      rect(x + 8, y + 11, 3, 1, active ? palette.green : palette.white)
    ].join("");
  }
  return [
    rect(x + 1, y, 10, 16, palette.void),
    rect(x + 4, y + 3, 4, 10, "#fde68a"),
    rect(x, y + 14, 12, 2, active ? palette.green : role.accent)
  ].join("");
}

function rolePortrait(role, status) {
  const skin = "#f1bf78";
  const eye = status === "error" ? palette.red : palette.void;
  const mouth = status === "done" ? palette.green : status === "error" ? palette.red : palette.void;
  const dim = status === "queued" ? ' opacity="0.74"' : "";
  const talk = status === "speaking" ? `${rect(56, 36, 3, 3, role.accent)}${rect(62, 31, 3, 3, role.accent)}` : "";
  const bang = status === "error" ? `${rect(58, 8, 4, 15, palette.red)}${rect(58, 27, 4, 4, palette.red)}` : "";
  return `<g transform="translate(12 12)"${dim}>
    ${rect(14, 0, 34, 10, role.hairDark)}
    ${rect(8, 8, 48, 14, role.hair)}
    ${rect(11, 3, 9, 16, role.hairLight)}
    ${rect(39, 4, 8, 14, role.hairLight)}
    ${rect(5, 20, 8, 18, role.hairDark)}
    ${rect(51, 20, 8, 18, role.hairDark)}
    ${rect(10, 18, 44, 33, palette.void)}
    ${rect(12, 20, 40, 32, skin)}
    ${rect(17, 32, 6, 6, eye)}
    ${rect(41, 32, 6, 6, eye)}
    ${rect(28, 44, 10, 3, mouth)}
    ${rect(13, 57, 38, 27, palette.void)}
    ${rect(16, 60, 32, 23, role.jacket)}
    ${rect(25, 60, 14, 23, "#f8fafc")}
    ${rect(31, 61, 4, 21, role.accent)}
    ${rect(8, 65, 10, 23, skin)}
    ${rect(48, 65, 10, 23, skin)}
    ${roleTool(role, status, 48, 62)}
    ${rect(18, 84, 13, 9, "#263238")}
    ${rect(36, 84, 13, 9, "#263238")}
    ${talk}
    ${bang}
  </g>`;
}

function statusFrameSvg(role, status, x, y) {
  const color = statusColor(status, role.color);
  const meterWidth = status === "speaking" ? 92 : status === "done" ? 116 : status === "error" ? 42 : 62;
  const signal = status === "speaking" ? palette.cyan : status === "done" ? palette.green : status === "error" ? palette.red : palette.muted;
  return `<g id="${role.id}-${status}" transform="translate(${x} ${y})">
    ${rect(0, 0, STATUS_FRAME.width, STATUS_FRAME.height, palette.base)}
    ${rect(6, 6, STATUS_FRAME.width - 12, STATUS_FRAME.height - 12, "#111c2e", ` stroke="${color}" stroke-width="4" rx="10"`)}
    ${rect(12, 92, 56, 19, "#09111f", ` stroke="${color}" stroke-width="2" rx="4"`)}
    ${rect(18, 99, 6, 5 + (status === "speaking" ? 6 : 0), signal)}
    ${rect(28, 97, 6, 7 + (status === "speaking" ? 9 : 0), signal)}
    ${rect(38, 101, 6, 3 + (status === "speaking" ? 5 : 0), signal)}
    ${rect(48, 96, 6, 8 + (status === "speaking" ? 8 : 0), signal)}
    ${rolePortrait(role, status)}
    ${text(82, 31, role.label, 15, palette.white)}
    ${text(82, 54, role.title, 10, palette.muted)}
    ${text(82, 76, statusGlyph(status), 12, color)}
    ${rect(82, 96, 54, 7, "#22344b", ' rx="4"')}
    ${rect(82, 96, Math.max(14, Math.round(meterWidth * 0.44)), 7, color, ' rx="4"')}
    ${line(82, 112, 136, 112, signal, 2, ' opacity="0.78"')}
    ${rect(139, 104, 8, 8, color, ' rx="2" opacity="0.9"')}
  </g>`;
}

function agentStatusAtlasSvg() {
  const frames = roles.flatMap((role, row) =>
    statuses.map((status, col) => statusFrameSvg(role, status, col * STATUS_FRAME.width, row * STATUS_FRAME.height))
  );
  const width = statuses.length * STATUS_FRAME.width;
  const height = roles.length * STATUS_FRAME.height;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" shape-rendering="crispEdges">${frames.join("")}</svg>`;
}

const atlasCells = {
  "floor-grid": { atlas: "war-room-atlas", x: 0, y: 0, width: 256, height: 256 },
  "data-wall": { atlas: "war-room-atlas", x: 256, y: 0, width: 256, height: 128 },
  "glass-panel": { atlas: "war-room-atlas", x: 256, y: 128, width: 256, height: 128 },
  "icon-strip": { atlas: "war-room-atlas", x: 0, y: 256, width: 256, height: 128 },
  "table-top": { atlas: "war-room-atlas", x: 256, y: 256, width: 256, height: 128 },
  "status-light": { atlas: "war-room-atlas", x: 0, y: 384, width: 256, height: 128 },
  "logo-plate": { atlas: "war-room-atlas", x: 256, y: 384, width: 256, height: 128 }
};

function roleFrames(role, row) {
  return Object.fromEntries(
    statuses.map((status, col) => [
      status,
      {
        atlas: "agent-status-atlas",
        x: col * STATUS_FRAME.width,
        y: row * STATUS_FRAME.height,
        width: STATUS_FRAME.width,
        height: STATUS_FRAME.height
      }
    ])
  );
}

const manifest = {
  version: 1,
  seed,
  theme: {
    name: "AI War Room",
    positivePrompts: [
      "AI war room",
      "glass conference table",
      "calm product-grade interface",
      "tactical data wall",
      "agent-native desktop console",
      "visible run evidence"
    ],
    negativePrompts: ["cheap pixel art", "baked messy lighting", "random cartoon", "overdecorated fantasy UI", "copied app assets"],
    rules: [
      "Structure sketch before asset generation",
      "Unit assets first, scene composition second",
      "Lighting belongs to Three.js, not baked tile textures",
      "Every generated asset must be named, sized, and referenced through the manifest"
    ]
  },
  atlases: [
    { id: "war-room-atlas", file: "war-room-atlas.svg", width: atlasSize, height: atlasSize, cells: atlasCells },
    {
      id: "agent-status-atlas",
      file: "agent-status-atlas.svg",
      width: statuses.length * STATUS_FRAME.width,
      height: roles.length * STATUS_FRAME.height,
      frameWidth: STATUS_FRAME.width,
      frameHeight: STATUS_FRAME.height
    }
  ],
  materials: {
    floor: { color: "#172338", roughness: 0.72, metalness: 0.18, texture: "floor-grid" },
    glassTable: { color: "#8fd3ff", roughness: 0.18, metalness: 0.08, opacity: 0.38, texture: "table-top" },
    dataWall: { color: "#70e8ff", roughness: 0.25, metalness: 0.28, emissiveIntensity: 0.72, texture: "data-wall" },
    translucentPanel: { color: "#9ed8ff", roughness: 0.32, metalness: 0.02, opacity: 0.54, texture: "glass-panel" }
  },
  roles: Object.fromEntries(roles.map((role, row) => [role.id, { color: role.color, frames: roleFrames(role, row) }]))
};

await mkdir(outDir, { recursive: true });
await writeFile(join(outDir, "war-room-atlas.svg"), warRoomAtlasSvg(), "utf8");
await writeFile(join(outDir, "agent-status-atlas.svg"), agentStatusAtlasSvg(), "utf8");
await writeFile(join(outDir, "asset-manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(`generated ${join(outDir, "war-room-atlas.svg")}`);
console.log(`generated ${join(outDir, "agent-status-atlas.svg")}`);
console.log(`generated ${join(outDir, "asset-manifest.json")}`);
