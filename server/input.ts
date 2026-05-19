import {
  inferDecisionUse,
  type BriefExpansion,
  type DebateInput,
  type ReasoningEffort
} from "../shared/debate.js";

export function parseBriefExpansion(raw: string, fallbackSeed: string): BriefExpansion {
  const parsed = parseJsonObject(raw);
  return normalizeBriefExpansion(parsed, fallbackSeed);
}

export function parseJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  const fenced = trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  try {
    return JSON.parse(fenced);
  } catch {
    const start = fenced.indexOf("{");
    const end = fenced.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(fenced.slice(start, end + 1));
    }
    throw new Error("Brief builder did not return valid JSON.");
  }
}

export function normalizeBriefExpansion(value: unknown, fallbackSeed: string): BriefExpansion {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  const topic = optionalString(source.topic) || fallbackSeed.trim();
  const decisionUse = normalizeDecisionUse(optionalString(source.decisionUse), topic);
  return {
    topic,
    background:
      optionalString(source.background) ||
      `用户提出了一个待评估想法：${topic}。当前只有一句话需求，尚未补充真实数据。`,
    goal: optionalString(source.goal) || "判断该决策是否值得继续推进，并形成可执行验证清单。",
    constraints: optionalString(source.constraints) || "本地优先；先验证关键假设；避免复制闭源应用代码和素材。",
    dataNotes: optionalString(source.dataNotes) || "当前未提供真实数据，需要后续补充/核查。",
    timeframe: optionalString(source.timeframe) || "未来 7-14 天完成最小验证。",
    decisionUse
  };
}

export function normalizeInput(value: unknown): DebateInput {
  const source = typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
  return {
    topic: String(source.topic || "").trim(),
    background: optionalString(source.background),
    goal: optionalString(source.goal),
    constraints: optionalString(source.constraints),
    dataNotes: optionalString(source.dataNotes),
    timeframe: optionalString(source.timeframe),
    decisionUse: optionalString(source.decisionUse) || "其他",
    model: optionalString(source.model),
    reasoningEffort: normalizeEffort(source.reasoningEffort),
    demoMode: Boolean(source.demoMode)
  };
}

export function optionalString(value: unknown): string | undefined {
  const text = typeof value === "string" ? value.trim() : "";
  return text || undefined;
}

export function normalizeEffort(value: unknown): ReasoningEffort {
  if (value === "low" || value === "medium" || value === "high" || value === "xhigh") {
    return value;
  }
  return "default";
}

function normalizeDecisionUse(value: string | undefined, topic: string): string {
  const allowed = new Set(["产品", "投资", "创业", "战略", "职业", "技术路线", "其他"]);
  if (value && allowed.has(value)) {
    return value;
  }
  return inferDecisionUse(topic);
}
