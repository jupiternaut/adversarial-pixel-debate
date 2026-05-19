import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function text(filePath) {
  return readFileSync(path.join(root, filePath), "utf8");
}

function exists(filePath) {
  return existsSync(path.join(root, filePath));
}

function countMatches(value, pattern) {
  return [...value.matchAll(pattern)].length;
}

function runJson(command, args) {
  try {
    const stdout = execFileSync(command, args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
    return JSON.parse(stdout);
  } catch {
    return null;
  }
}

function clampScore(value, max) {
  return Math.max(0, Math.min(max, value));
}

const packageJson = JSON.parse(text("package.json"));
const app = text("src/App.tsx");
const css = text("src/styles/app.css");
const stage = text("src/components/WarRoomStage.tsx");
const scene = text("src/war-room/createWarRoomScene.ts");
const sceneState = text("src/war-room/sceneState.ts");
const manifest = JSON.parse(text("src/assets/generated/asset-manifest.json"));
const openspec = runJson("openspec", ["list", "--json"]);

const atlasCount = manifest.atlases?.length || 0;
const materialCount = Object.keys(manifest.materials || {}).length;
const roleFrameCount = Object.values(manifest.roles || {}).reduce((sum, role) => sum + Object.keys(role.frames || {}).length, 0);
const stateMentions = countMatches(scene + sceneState + css + app, /\b(queued|speaking|done|error)\b/g);
const mediaQueries = countMatches(css, /@media/g);
const focusRules = countMatches(css, /:focus/g);
const warRoomClasses = countMatches(css, /\.(war-room-stage|war-room-canvas|war-room-hud|stage-panel|status-strip)/g);
const threeMentions = countMatches(scene, /\bTHREE\./g);

const requiredScripts = ["iterate:scan", "iterate:score", "iterate:record", "iterate:gate"];
const presentIterationScripts = requiredScripts.filter((script) => packageJson.scripts?.[script]);
const completedChanges = openspec?.changes?.filter((change) => change.status === "complete").length || 0;

const dimensions = {
  openspecGovernance: {
    max: 20,
    score: clampScore(
      (exists("openspec/config.yaml") ? 4 : 0) +
        (exists("openspec/changes/upgrade-pixel-office-ui/tasks.md") ? 5 : 0) +
        (exists("openspec/changes/chatdev-openevolve-iteration-control/tasks.md") ? 5 : 0) +
        Math.min(6, completedChanges * 6),
      20
    ),
    evidence: { completedChanges }
  },
  workflowControl: {
    max: 20,
    score: clampScore(
      (exists("iteration/README.md") ? 4 : 0) +
        (exists("iteration/chatdev-roles.md") ? 4 : 0) +
        (exists("iteration/version-ledger.jsonl") ? 3 : 0) +
        presentIterationScripts.length * 2 +
        (exists("openevolve/adversarial-pixel-debate/evaluator.py") ? 1 : 0),
      20
    ),
    evidence: { presentIterationScripts }
  },
  warRoomAssetEngine: {
    max: 20,
    score: clampScore(
      Math.min(4, atlasCount * 2) + Math.min(4, materialCount) + Math.min(5, roleFrameCount / 4) + Math.min(4, warRoomClasses) + Math.min(3, threeMentions / 10),
      20
    ),
    evidence: { atlasCount, materialCount, roleFrameCount, warRoomClasses, threeMentions }
  },
  desktopProductPolish: {
    max: 20,
    score: clampScore(
      (css.includes("grid-template-columns") ? 4 : 0) +
        (css.includes("border-radius: 8px") ? 3 : 0) +
        Math.min(4, focusRules) +
        Math.min(4, mediaQueries * 2) +
        (app.includes("aria-label") ? 3 : 0) +
        (stage.includes("aria-label") ? 2 : 0),
      20
    ),
    evidence: { focusRules, mediaQueries, hasAriaLabels: app.includes("aria-label") }
  },
  verificationReadiness: {
    max: 20,
    score: clampScore(
      (packageJson.scripts?.test ? 4 : 0) +
        (packageJson.scripts?.build ? 4 : 0) +
        (packageJson.scripts?.["dist:mac"] ? 4 : 0) +
        (exists("dist/index.html") ? 3 : 0) +
        (exists("dist-server/server/app.js") ? 3 : 0) +
        (exists("release/mac-arm64/Adversarial Pixel Debate.app") ? 2 : 0),
      20
    ),
    evidence: {
      hasTest: Boolean(packageJson.scripts?.test),
      hasBuild: Boolean(packageJson.scripts?.build),
      hasDesktopBuild: exists("release/mac-arm64/Adversarial Pixel Debate.app")
    }
  }
};

const total = Object.values(dimensions).reduce((sum, dimension) => sum + dimension.score, 0);

console.log(
  JSON.stringify(
    {
      scoredAt: new Date().toISOString(),
      total,
      max: 100,
      dimensions
    },
    null,
    2
  )
);
