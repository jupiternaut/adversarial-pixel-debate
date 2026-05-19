import { execFileSync } from "node:child_process";
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();

function parseArgs(argv) {
  const parsed = { evidence: [] };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) {
      continue;
    }
    const key = arg.slice(2);
    const value = argv[index + 1] && !argv[index + 1].startsWith("--") ? argv[++index] : true;
    if (key === "evidence") {
      parsed.evidence.push(value);
    } else {
      parsed[key] = value;
    }
  }
  return parsed;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function getOpenSpecStatus(changeName) {
  try {
    const stdout = execFileSync("openspec", ["status", "--change", changeName, "--json"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    }).trim();
    return JSON.parse(stdout);
  } catch (error) {
    fail(`OpenSpec change '${changeName}' is not readable: ${error.stderr?.toString().trim() || error.message}`);
  }
}

function getScore() {
  const stdout = execFileSync("node", ["scripts/iteration-score.mjs"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"]
  }).trim();
  return JSON.parse(stdout);
}

const args = parseArgs(process.argv.slice(2));
const id = String(args.id || "").trim();
const status = String(args.status || "").trim();
const summary = String(args.summary || "").trim();
const change = String(args.change || "").trim();
const exploratory = Boolean(args.exploratory);

if (!id) fail("Missing --id.");
if (!status) fail("Missing --status.");
if (!summary) fail("Missing --summary.");
if (status === "accepted" && !exploratory && !change) {
  fail("Accepted non-exploratory iterations must include --change <openspec-change-name>.");
}

const openspecStatus = change ? getOpenSpecStatus(change) : null;
if (status === "accepted" && openspecStatus && !openspecStatus.isComplete) {
  fail(`OpenSpec change '${change}' is not complete.`);
}

const entry = {
  id,
  recordedAt: new Date().toISOString(),
  status,
  summary,
  openspecChange: change || null,
  exploratory,
  evidence: args.evidence,
  score: getScore(),
  openspec: openspecStatus
    ? {
        changeName: openspecStatus.changeName,
        schemaName: openspecStatus.schemaName,
        isComplete: openspecStatus.isComplete
      }
    : null
};

mkdirSync(path.join(root, "iteration"), { recursive: true });
appendFileSync(path.join(root, "iteration/version-ledger.jsonl"), `${JSON.stringify(entry)}\n`, "utf8");
console.log(JSON.stringify(entry, null, 2));
