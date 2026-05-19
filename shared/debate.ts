export type RoleId = "bull" | "bear" | "engineer" | "moderator";

export type RoleStatus = "idle" | "queued" | "speaking" | "done" | "error";

export type ReasoningEffort = "default" | "low" | "medium" | "high" | "xhigh";

export type DebatingRoleId = Exclude<RoleId, "moderator">;

export type DebateStageId = "opening" | "redTeam" | "consensus";

export type StageRoleOutputs = Partial<Record<DebatingRoleId, string>>;

export type DebateStageOutputs = Partial<Record<DebateStageId, StageRoleOutputs>>;

export interface RoleDefinition {
  id: RoleId;
  label: string;
  zhName: string;
  subtitle: string;
  color: string;
  artRole: string;
  artBadge: string;
  shortMission: string;
}

export interface DebateInput {
  topic: string;
  background?: string;
  goal?: string;
  constraints?: string;
  dataNotes?: string;
  timeframe?: string;
  decisionUse?: string;
  model?: string;
  reasoningEffort?: ReasoningEffort;
  demoMode?: boolean;
}

export type RoleOutputs = Partial<Record<RoleId, string>>;

export const debatingRoleIds: DebatingRoleId[] = ["bull", "bear", "engineer"];

export const debateStages: { id: DebateStageId; label: string }[] = [
  { id: "opening", label: "开场立论" },
  { id: "redTeam", label: "交叉红队" },
  { id: "consensus", label: "阶段共识" }
];

export interface BriefExpansion {
  topic: string;
  background: string;
  goal: string;
  constraints: string;
  dataNotes: string;
  timeframe: string;
  decisionUse: string;
}

export const roleDefinitions: RoleDefinition[] = [
  {
    id: "bull",
    label: "Bull",
    zhName: "狂热多头",
    subtitle: "增长 / 拐点 / 杠杆",
    color: "#19a463",
    artRole: "Growth CEO",
    artBadge: "CEO",
    shortMission: "找出最强正面论点和上行空间。"
  },
  {
    id: "bear",
    label: "Bear",
    zhName: "极度空头",
    subtitle: "风险 / 崩溃 / 黑天鹅",
    color: "#c7403a",
    artRole: "Risk Reviewer",
    artBadge: "REV",
    shortMission: "找出失败路径、触发机制和早期预警。"
  },
  {
    id: "engineer",
    label: "Engineer",
    zhName: "第一性原理工程师",
    subtitle: "约束 / 资源 / 可行性",
    color: "#2f6fc7",
    artRole: "Systems Programmer",
    artBadge: "DEV",
    shortMission: "只看因果链、硬约束和最小验证。"
  },
  {
    id: "moderator",
    label: "Moderator",
    zhName: "冲突分析协调员",
    subtitle: "矛盾 / 验证 / 结论",
    color: "#b8871f",
    artRole: "Coordination Lead",
    artBadge: "QA",
    shortMission: "把冲突转化成可执行验证任务。"
  }
];

export function getRoleDefinition(roleId: RoleId): RoleDefinition {
  const role = roleDefinitions.find((item) => item.id === roleId);
  if (!role) {
    throw new Error(`Unknown role: ${roleId}`);
  }
  return role;
}

export function formatInput(input: DebateInput): string {
  return [
    `【主题 / 决策 / 项目】：${input.topic.trim()}`,
    `【背景】：${input.background?.trim() || "未提供"}`,
    `【目标】：${input.goal?.trim() || "未提供"}`,
    `【约束】：${input.constraints?.trim() || "未提供"}`,
    `【已知数据 / 上传文件】：${input.dataNotes?.trim() || "未提供"}`,
    `【时间范围】：${input.timeframe?.trim() || "未提供"}`,
    `【决策用途】：${input.decisionUse?.trim() || "其他"}`
  ].join("\n");
}

export function buildBriefExpansionPrompt(seed: string, current?: Partial<DebateInput>): string {
  const currentInput = current?.topic
    ? [
        `现有主题：${current.topic}`,
        `现有背景：${current.background || "未提供"}`,
        `现有目标：${current.goal || "未提供"}`,
        `现有约束：${current.constraints || "未提供"}`,
        `现有已知数据 / 时间范围：${[current.dataNotes, current.timeframe].filter(Boolean).join(" / ") || "未提供"}`,
        `现有用途：${current.decisionUse || "未提供"}`
      ].join("\n")
    : "无";

  return `
你是 ADSS War Room 的 Brief Builder Skill。

任务：把用户的一句话需求补全成多智能体对抗决策分析所需的结构化输入。

用户一句话需求：
${seed.trim()}

可参考的现有字段：
${currentInput}

要求：
- 不要追问，基于已有信息做保守、明确、可验证的补全。
- 不要编造真实数据；未知数据必须写成“当前未提供真实数据，需要后续补充/核查”。
- 约束要包含用户已经表达的边界，也要补上安全、合规、时间或资源边界。
- 时间范围如果用户没有提供，默认写“未来 7-14 天完成最小验证”。
- decisionUse 必须是以下之一：产品、投资、创业、战略、职业、技术路线、其他。
- 只输出一个 JSON 对象，不要 Markdown，不要解释。

JSON 字段必须严格为：
{
  "topic": "主题 / 决策 / 项目",
  "background": "背景",
  "goal": "目标",
  "constraints": "约束",
  "dataNotes": "已知数据 / 上传文件",
  "timeframe": "时间范围",
  "decisionUse": "产品"
}
`.trim();
}

export function buildDemoBriefExpansion(seed: string): BriefExpansion {
  const topic = seed.trim() || "需要进行压力测试的决策";
  return {
    topic,
    background: `用户提出了一个待评估想法：${topic}。当前信息主要来自一句话需求，尚未补充真实用户、市场、技术或财务数据。`,
    goal: "判断这个想法是否值得进入下一轮小规模验证，并产出可执行的风险、约束和验证清单。",
    constraints: "本地优先；不读取敏感凭据；不复制闭源应用代码和素材；先做最小可行验证，再决定是否扩大投入。",
    dataNotes: "当前只有一句话需求，没有真实用户数据、竞品数据、成本数据或外部核查材料。",
    timeframe: "未来 7-14 天完成最小验证。",
    decisionUse: inferDecisionUse(topic)
  };
}

export function inferDecisionUse(text: string): string {
  const value = text.toLowerCase();
  if (/(投资|股票|基金|资产|币|crypto|stock|fund)/i.test(value)) {
    return "投资";
  }
  if (/(创业|公司|商业模式|融资|startup)/i.test(value)) {
    return "创业";
  }
  if (/(战略|市场|竞争|增长|strategy)/i.test(value)) {
    return "战略";
  }
  if (/(职业|工作|跳槽|offer|career)/i.test(value)) {
    return "职业";
  }
  if (/(技术|架构|模型|工程|代码|api|oauth|codex|路线|tech)/i.test(value)) {
    return "技术路线";
  }
  if (/(产品|app|应用|用户|体验|ui|ux|mvp|feature)/i.test(value)) {
    return "产品";
  }
  return "其他";
}

const evidencePolicy = `
信息优先级：
1. 用户提供的数据、合同、财报、计划书、研究报告；
2. 官方来源、一手数据、监管文件、公司公告、学术论文；
3. 可信媒体、行业数据库、专家报告；
4. 模型常识与推断。

如果主题涉及最新市场、监管、融资、竞争格局、2025 年后可能变化的信息，或法律、医疗、金融、投资、公共政策等高风险领域，必须明确标注需要联网核查的地方。当前运行环境不保证每个角色都能实时联网；无法验证时要写出“不确定性来源”。

不要输出隐藏推理过程。只输出可审计摘要、关键论点、冲突和验证任务。
`.trim();

const rolePrompts: Record<DebatingRoleId, string> = {
  bull: `
你现在只扮演 Step 1: The Bull / 狂热多头。

角色设定：风险投资家、增长型 CEO、数字化转型布道者。
思维模式：寻找指数级增长机会、非线性收益、市场拐点、战略杠杆和最佳情况。暂时忽略执行难度、组织阻力和短期财务压力。

输出 3-5 个最强正面论点。每个论点必须包含：
- 核心主张；
- 价值来源；
- 成立条件；
- 最大上行空间；
- 证据强度：强 / 中 / 弱。

不要替 Bear、Engineer 或 Moderator 下结论。
`.trim(),
  bear: `
你现在只扮演 Step 2: The Bear / 极度空头。

角色设定：做空机构、风险控制负责人、监管悲观主义者、末日论者。
思维模式：寻找致命缺陷、失败路径、监管黑天鹅、市场崩溃、现金流断裂、组织失控、伦理风险和最坏情况。假定墨菲定律成立：凡是会出错的地方，最终都会出错。

输出 3-5 个最致命负面论点。每个论点必须包含：
- 核心风险；
- 触发机制；
- 损害后果；
- 早期预警信号；
- 风险等级：高 / 中 / 低。

不要替 Bull、Engineer 或 Moderator 下结论。
`.trim(),
  engineer: `
你现在只扮演 Step 3: The Engineer / 第一性原理工程师。

角色设定：流程工程师、系统架构师、物理学家、运营负责人。
思维模式：只看因果链、资源约束、数据质量、技术可行性、时间、成本、产能、组织能力和不可绕过的硬约束。不讨论愿景，不讨论情绪，不使用空泛商业词汇。

输出 3-5 个客观约束。每个约束必须包含：
- 约束本身；
- 约束来源：物理 / 技术 / 数据 / 人力 / 财务 / 法律 / 供应链 / 时间；
- 该约束对项目的影响；
- 是否可绕过：可绕过 / 部分可绕过 / 不可绕过；
- 最小验证方式。

不要替 Bull、Bear 或 Moderator 下结论。
`.trim()
};

export function buildRolePrompt(roleId: DebatingRoleId, input: DebateInput): string {
  return [
    "你是“对抗性决策支持系统 Pro 版”的一个角色。",
    evidencePolicy,
    "",
    "用户输入：",
    formatInput(input),
    "",
    rolePrompts[roleId]
  ].join("\n");
}

export function buildRoleStagePrompt(
  roleId: DebatingRoleId,
  stageId: DebateStageId,
  input: DebateInput,
  stageOutputs: DebateStageOutputs = {}
): string {
  const role = getRoleDefinition(roleId);
  const stage = debateStages.find((item) => item.id === stageId);
  const stageLabel = stage?.label || stageId;
  return [
    "你是“对抗性决策支持系统 Pro 版”的一个角色。",
    "这不是独立观点报告，而是多阶段辩论。你必须引用其他角色已经说过的具体主张，进行攻击、修正或形成共识。",
    evidencePolicy,
    "",
    "用户输入：",
    formatInput(input),
    "",
    `当前角色：${role.label} / ${role.zhName}`,
    `当前阶段：${stageLabel}`,
    "",
    formatStageContext(stageOutputs),
    "",
    buildStageInstruction(roleId, stageId)
  ].join("\n");
}

function buildStageInstruction(roleId: DebatingRoleId, stageId: DebateStageId): string {
  if (stageId === "opening") {
    return [
      rolePrompts[roleId],
      "",
      "额外要求：",
      "- 标题必须写成 `## Stage 1 / 开场立论 / 角色名`。",
      "- 最后追加 `### 可被攻击的关键假设`，列出 2-3 条你认为其他角色最应该质疑的假设。",
      "- 不要进入最终结论；本阶段只建立本角色的强主张。"
    ].join("\n");
  }

  if (stageId === "redTeam") {
    return `
现在进入 Stage 2 / 交叉红队。

你的任务不是补充自己的观点，而是对其他两个角色进行真正的红队攻击。

输出要求：
- 标题必须写成 \`## Stage 2 / 交叉红队 / ${getRoleDefinition(roleId).label}\`。
- 分别攻击其他两个角色各 2 条具体主张，必须引用对方原话或清楚复述其具体主张。
- 每条攻击必须包含：被攻击主张、攻击理由、可能造成的误判、需要对方补交的证据。
- 必须反击至少 1 条对你自己 Stage 1 立场最不利的论点，说明你承认、修正还是拒绝。
- 最后追加 \`### 本阶段让步 / 修正\`，写出你愿意放弃或降级的 1-2 个原始主张。

禁止只写“同意/不同意”；禁止泛泛总结；禁止替 Moderator 下最终结论。
`.trim();
  }

  return `
现在进入 Stage 3 / 阶段共识。

你必须基于 Stage 1 开场立论和 Stage 2 交叉红队，产出本角色愿意签字的阶段性共识。

输出要求：
- 标题必须写成 \`## Stage 3 / 阶段共识 / ${getRoleDefinition(roleId).label}\`。
- \`### 已达成共识\`：列出 2-4 条三方可以共同接受的判断，每条说明来自哪些角色的碰撞。
- \`### 仍然分歧\`：列出 2-3 条不能强行平均的分歧。
- \`### 被推翻或降级的主张\`：列出至少 1 条在红队攻击后应删除、降级或改写的主张。
- \`### 下一阶段验证任务\`：给出 3 条人类研究员可执行任务，必须包含数据、来源和判断标准。
- \`### 本角色修正后立场\`：用 3 句话以内说明你的最终阶段立场。

禁止输出空泛共识；如果无法形成共识，必须明确写出阻塞原因和最小验证动作。
`.trim();
}

function formatStageContext(stageOutputs: DebateStageOutputs): string {
  const sections: string[] = [];
  for (const stage of debateStages) {
    const outputs = stageOutputs[stage.id];
    if (!outputs) {
      continue;
    }
    const roleSections = debatingRoleIds
      .map((roleId) => {
        const role = getRoleDefinition(roleId);
        return `### ${role.label} / ${role.zhName}\n${outputs[roleId] || "未生成"}`;
      })
      .join("\n\n");
    sections.push(`## 已有阶段：${stage.label}\n${roleSections}`);
  }
  return sections.length ? `已有辩论上下文：\n\n${sections.join("\n\n---\n\n")}` : "已有辩论上下文：无，本角色先开场立论。";
}

export function buildModeratorPrompt(input: DebateInput, previous: RoleOutputs): string {
  return [
    "你是 Step 4: The Moderator / 冲突分析协调员。",
    "你的任务是综合 Bull、Bear、Engineer 的结果，但不要做平均主义总结。",
    "注意：你收到的不是三份独立报告，而是三位角色的完整 staged transcript，通常包含 Stage 1 / 开场立论、Stage 2 / 交叉红队、Stage 3 / 阶段共识。",
    "你必须审计红队攻击是否真的迫使角色修正、降级或放弃主张；最终冲突应来自红队之后仍未解决的分歧，而不是原始开场观点的简单拼接。",
    evidencePolicy,
    "",
    "用户输入：",
    formatInput(input),
    "",
    "Bull 输出：",
    previous.bull || "未生成",
    "",
    "Bear 输出：",
    previous.bear || "未生成",
    "",
    "Engineer 输出：",
    previous.engineer || "未生成",
    "",
    `规则：
1. 完全忽略共识：如果多头、空头、工程师都同意某件事，不要重点讨论。
2. 专门寻找矛盾：
   - 多头认为有巨大价值，但空头认为会被监管、竞争或财务结构扼杀；
   - 多头认为可快速扩张，但工程师认为资源、技术、数据或流程无法支撑；
   - 空头认为风险致命，但工程师认为可以通过设计、流程或约束管理化解；
   - 工程师认为技术可行，但空头认为商业或监管不可行。
3. 每个矛盾必须转化成一个可验证问题。
4. 每个验证问题必须具体到人类研究员可以执行，而不是泛泛而谈。

请严格使用下面格式输出，不要增删一级标题：

**【输入主题】：**
[复述用户输入的主题]

**【关键假设】：**
- 假设 1：
- 假设 2：
- 假设 3：

---

## 🕵️‍♂️ 视角模拟摘要

### 📈 多头视角 Bull
1. **正面论点 1：**
   - 核心主张：
   - 价值来源：
   - 成立条件：
   - 最大上行空间：
   - 证据强度：强 / 中 / 弱

2. **正面论点 2：**
   - 核心主张：
   - 价值来源：
   - 成立条件：
   - 最大上行空间：
   - 证据强度：强 / 中 / 弱

3. **正面论点 3：**
   - 核心主张：
   - 价值来源：
   - 成立条件：
   - 最大上行空间：
   - 证据强度：强 / 中 / 弱

---

### 📉 空头视角 Bear
1. **负面论点 1：**
   - 核心风险：
   - 触发机制：
   - 损害后果：
   - 早期预警信号：
   - 风险等级：高 / 中 / 低

2. **负面论点 2：**
   - 核心风险：
   - 触发机制：
   - 损害后果：
   - 早期预警信号：
   - 风险等级：高 / 中 / 低

3. **负面论点 3：**
   - 核心风险：
   - 触发机制：
   - 损害后果：
   - 早期预警信号：
   - 风险等级：高 / 中 / 低

---

### ⚙️ 工程师视角 Engineer
1. **客观约束 1：**
   - 约束本身：
   - 约束来源：物理 / 技术 / 数据 / 人力 / 财务 / 法律 / 供应链 / 时间
   - 影响：
   - 是否可绕过：可绕过 / 部分可绕过 / 不可绕过
   - 最小验证方式：

2. **客观约束 2：**
   - 约束本身：
   - 约束来源：
   - 影响：
   - 是否可绕过：
   - 最小验证方式：

3. **客观约束 3：**
   - 约束本身：
   - 约束来源：
   - 影响：
   - 是否可绕过：
   - 最小验证方式：

---

## ⚔️ 核心冲突与验证清单

### 矛盾 1：[简短标题]
- **冲突点：**
  - 多头声称：
  - 空头 / 工程师反驳：
- **冲突本质：**
- **❓ 验证问题：**
- **验证方法：**
  - 需要收集的数据：
  - 推荐信息源：
  - 判断标准：
  - 截止时间：
- **若验证失败，意味着：**

### 矛盾 2：[简短标题]
- **冲突点：**
  - 多头声称：
  - 空头 / 工程师反驳：
- **冲突本质：**
- **❓ 验证问题：**
- **验证方法：**
  - 需要收集的数据：
  - 推荐信息源：
  - 判断标准：
  - 截止时间：
- **若验证失败，意味着：**

### 矛盾 3：[简短标题]
- **冲突点：**
  - 多头声称：
  - 空头 / 工程师反驳：
- **冲突本质：**
- **❓ 验证问题：**
- **验证方法：**
  - 需要收集的数据：
  - 推荐信息源：
  - 判断标准：
  - 截止时间：
- **若验证失败，意味着：**

---

## 🧭 客观理性结论

### 1. 当前判断
请选择一个结论：
- A. 值得推进；
- B. 值得小规模试点；
- C. 暂缓，先验证关键假设；
- D. 不建议推进；
- E. 信息不足，无法判断。

**结论：** [A / B / C / D / E]

### 2. 判断理由
用 3 条以内说明，不要空泛。
1.
2.
3.

### 3. 最大未解风险

### 4. 最小可行验证计划
请给出未来 7-14 天内可以执行的验证动作：
- 验证动作 1：
- 验证动作 2：
- 验证动作 3：

### 5. 决策门槛
- **继续推进的条件：**
- **停止 / 转向的条件：**

### 6. 置信度
**置信度：** 高 / 中 / 低

**置信度理由：**
`
  ].join("\n");
}

export function buildDemoStageOutput(roleId: DebatingRoleId, stageId: DebateStageId, input: DebateInput): string {
  const topic = input.topic || "未命名决策";
  if (stageId === "redTeam") {
    if (roleId === "bull") {
      return `## Stage 2 / 交叉红队 / Bull\n\n1. **攻击 Bear：** Bear 把“角色表演会制造严谨错觉”当成致命风险，但它没有区分演示模式和真实数据模式。误判在于把可通过数据门槛管理的问题直接判死刑；Bear 需要补交失败样本和误用案例。\n2. **攻击 Engineer：** Engineer 强调 Codex CLI 慢，但没有证明慢会破坏决策质量。对压力测试工具来说，用户可接受的延迟应和普通聊天比较，而不是和 token API 比较。\n\n### 本阶段让步 / 修正\n- 我承认如果没有真实数据输入，${topic} 只能做小规模试点，不能宣称能支持重大决策。`;
    }
    if (roleId === "bear") {
      return `## Stage 2 / 交叉红队 / Bear\n\n1. **攻击 Bull：** Bull 声称 ${topic} 可以成为标准预演工具，但没有证明用户会持续提交高质量上下文。误判会导致产品只剩漂亮舞台和空泛结论；Bull 需要补交留存、复用和真实案例证据。\n2. **攻击 Engineer：** Engineer 把问题压成延迟和编排，但忽略了错误自信这个核心伤害。即使技术跑通，低质量共识仍可能误导用户。\n\n### 本阶段让步 / 修正\n- 我承认可视化和多角色分工有价值，但前提是输出必须强制包含可执行验证任务。`;
    }
    return `## Stage 2 / 交叉红队 / Engineer\n\n1. **攻击 Bull：** Bull 的上行空间依赖“用户愿意补上下文”，这是未验证的人力约束。没有输入质量门槛，系统只能生成表面完整的文本。\n2. **攻击 Bear：** Bear 把风险归因于角色表演，但真正可控变量是流程：每轮必须产出被攻击主张、证据缺口和验证任务。\n\n### 本阶段让步 / 修正\n- 我承认延迟不是唯一硬约束；更关键的是输入结构、证据引用和共识质量检查。`;
  }
  if (stageId === "consensus") {
    return `## Stage 3 / 阶段共识 / ${getRoleDefinition(roleId).label}\n\n### 已达成共识\n- ${topic} 不能只输出三份独立观点，必须让角色互相引用、攻击和修正。\n- 没有真实数据时，只能给“小规模试点 / 先验证关键假设”的结论。\n\n### 仍然分歧\n- Bull 认为可视化多角色工作流有产品上行；Bear 认为错误自信可能抵消收益。\n- Engineer 认为风险可通过流程门槛降低，但 Bear 认为用户仍可能只读结论。\n\n### 被推翻或降级的主张\n- “只要多角色输出就足够严谨”应被删除，必须升级为多阶段红队辩论。\n\n### 下一阶段验证任务\n- 收集 3 个真实决策主题，记录每轮是否产生具体被攻击主张。\n- 对每个主题检查最终共识是否包含数据源、判断标准和截止时间。\n- 统计真实 Codex 模式下每阶段耗时，判断桌面体验是否可接受。\n\n### 本角色修正后立场\n${topic} 值得继续做小规模试点，但必须把红队攻击和阶段共识作为默认流程。`;
  }
  return `## Stage 1 / 开场立论 / ${getRoleDefinition(roleId).label}\n\n${buildDemoOutput(roleId, input)}`;
}

export function buildRoleDebateTranscript(roleId: DebatingRoleId, stageOutputs: DebateStageOutputs): string {
  return debateStages
    .map((stage) => stageOutputs[stage.id]?.[roleId])
    .filter(Boolean)
    .join("\n\n---\n\n");
}

export function buildDemoOutput(roleId: RoleId, input: DebateInput): string {
  const topic = input.topic || "未命名决策";
  if (roleId === "bull") {
    return `1. **正面论点 1：**\n   - 核心主张：${topic} 可能把抽象决策压力测试转成可视化、可复用的工作流。\n   - 价值来源：多角色分工降低单一模型迎合用户的概率。\n   - 成立条件：用户愿意提交足够上下文，并接受先验证再推进。\n   - 最大上行空间：成为投资、产品、战略讨论前的标准预演工具。\n   - 证据强度：中`;
  }
  if (roleId === "bear") {
    return `1. **负面论点 1：**\n   - 核心风险：角色表演可能制造“看起来很严谨”的错觉。\n   - 触发机制：缺少真实数据、没有外部核查、用户只阅读最终结论。\n   - 损害后果：错误信心上升，重大决策反而更激进。\n   - 早期预警信号：输出大量口号，验证问题无法落到具体数据。\n   - 风险等级：高`;
  }
  if (roleId === "engineer") {
    return `1. **客观约束 1：**\n   - 约束本身：Codex CLI 调用是进程级编排，不是低延迟 token API。\n   - 约束来源：技术\n   - 影响：四角色完整辩论会比普通聊天慢。\n   - 是否可绕过：部分可绕过\n   - 最小验证方式：记录每个角色调用耗时，比较 demo 模式与真实 Codex 模式。`;
  }
  return `**【输入主题】：**\n${topic}\n\n**【关键假设】：**\n- 假设 1：当前为本地 MVP 验证，优先证明工作流闭环。\n- 假设 2：Codex OAuth 已在本机登录。\n- 假设 3：用户后续会补充真实数据源。\n\n---\n\n## 🧭 客观理性结论\n\n### 1. 当前判断\n**结论：** B\n\n### 2. 判断理由\n1. 可视化多角色辩论能降低纯文本工具的使用门槛。\n2. 最大风险不是 UI，而是缺少可验证数据输入。\n3. 适合先做小规模试点，再决定是否桌面化。\n\n### 3. 最大未解风险\n真实 Codex OAuth 调用的延迟与稳定性是否足以支撑连续多角色辩论。\n\n### 4. 最小可行验证计划\n- 验证动作 1：用 3 个真实决策主题跑完整流程。\n- 验证动作 2：记录每个角色耗时与失败率。\n- 验证动作 3：检查最终验证清单是否能被人类研究员直接执行。\n\n### 5. 决策门槛\n- **继续推进的条件：** 三次样本中至少两次产出可执行验证清单。\n- **停止 / 转向的条件：** 输出长期停留在泛泛建议，无法形成数据收集任务。\n\n### 6. 置信度\n**置信度：** 中`;
}
