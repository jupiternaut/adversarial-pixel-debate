import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function run(command, args) {
  try {
    return {
      ok: true,
      stdout: execFileSync(command, args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim()
    };
  } catch (error) {
    return {
      ok: false,
      stdout: error.stdout?.toString().trim() || "",
      stderr: error.stderr?.toString().trim() || error.message
    };
  }
}

function readJson(filePath) {
  return JSON.parse(readFileSync(path.join(root, filePath), "utf8"));
}

function fileState(filePath) {
  const absolutePath = path.join(root, filePath);
  if (!existsSync(absolutePath)) {
    return { exists: false };
  }
  const stats = statSync(absolutePath);
  return { exists: true, bytes: stats.size, modifiedAt: stats.mtime.toISOString() };
}

function listReleaseApps() {
  const releasePath = path.join(root, "release");
  if (!existsSync(releasePath)) {
    return [];
  }
  return readdirSync(releasePath, { recursive: true })
    .filter((entry) => String(entry).endsWith(".app") && !String(entry).includes(".app/"))
    .map((entry) => String(entry));
}

const packageJson = readJson("package.json");
const openspecList = run("openspec", ["list", "--json"]);
const gitStatus = run("git", ["status", "--short"]);

const scan = {
  scannedAt: new Date().toISOString(),
  project: {
    name: packageJson.name,
    version: packageJson.version,
    root
  },
  repository: gitStatus.ok
    ? { type: "git", status: gitStatus.stdout.split("\n").filter(Boolean) }
    : { type: "none", note: "Project directory is not currently a Git repository." },
  openspec: openspecList.ok ? JSON.parse(openspecList.stdout) : { error: openspecList.stderr },
  scripts: Object.keys(packageJson.scripts || {}).sort(),
  artifacts: {
    dist: fileState("dist/index.html"),
    server: fileState("dist-server/server/app.js"),
    desktopApps: listReleaseApps(),
    ledger: fileState("iteration/version-ledger.jsonl")
  }
};

console.log(JSON.stringify(scan, null, 2));
