import { describe, expect, it } from "vitest";
import {
  buildBriefExpansionPrompt,
  buildDemoBriefExpansion,
  buildDemoStageOutput,
  buildModeratorPrompt,
  buildRoleDebateTranscript,
  buildRolePrompt,
  buildRoleStagePrompt,
  roleDefinitions,
  type DebateStageOutputs,
  type DebateInput
} from "../shared/debate";

const input: DebateInput = {
  topic: "是否应该开发像素多智能体辩论 App",
  background: "Codex OAuth 本地接入。",
  decisionUse: "产品"
};

describe("debate prompt builders", () => {
  it("defines four debate roles", () => {
    expect(roleDefinitions.map((role) => role.id)).toEqual(["bull", "bear", "engineer", "moderator"]);
  });

  it("defines ChatDev-style art metadata for every role", () => {
    for (const role of roleDefinitions) {
      expect(role.artRole).toMatch(/\w/);
      expect(role.artBadge).toMatch(/^[A-Z]{2,3}$/);
    }
  });

  it("builds role-specific prompts with the user topic", () => {
    expect(buildRolePrompt("bull", input)).toContain("狂热多头");
    expect(buildRolePrompt("bear", input)).toContain("极度空头");
    expect(buildRolePrompt("engineer", input)).toContain("第一性原理工程师");
    expect(buildRolePrompt("bull", input)).toContain(input.topic);
  });

  it("builds staged debate prompts that force red-team attacks and consensus", () => {
    const stageOutputs: DebateStageOutputs = {
      opening: {
        bull: "Bull claims the product can become a standard preflight workflow.",
        bear: "Bear claims the output may create false confidence.",
        engineer: "Engineer claims Codex CLI latency is a hard workflow constraint."
      },
      redTeam: {
        bull: "Bull attacks Bear for not separating demo mode from data-backed mode."
      }
    };

    const redTeamPrompt = buildRoleStagePrompt("bear", "redTeam", input, stageOutputs);
    const consensusPrompt = buildRoleStagePrompt("engineer", "consensus", input, stageOutputs);

    expect(redTeamPrompt).toContain("交叉红队");
    expect(redTeamPrompt).toContain("必须引用对方原话");
    expect(redTeamPrompt).toContain("Bull claims the product");
    expect(consensusPrompt).toContain("阶段共识");
    expect(consensusPrompt).toContain("已达成共识");
    expect(consensusPrompt).toContain("被推翻或降级的主张");
  });

  it("assembles role transcripts across debate stages", () => {
    const transcript = buildRoleDebateTranscript("bull", {
      opening: { bull: "opening" },
      redTeam: { bull: "red team" },
      consensus: { bull: "consensus" }
    });

    expect(transcript).toContain("opening");
    expect(transcript).toContain("red team");
    expect(transcript).toContain("consensus");
  });

  it("builds a moderator prompt with strict output sections", () => {
    const prompt = buildModeratorPrompt(input, {
      bull: "Bull output",
      bear: "Bear output",
      engineer: "Engineer output"
    });
    expect(prompt).toContain("## ⚔️ 核心冲突与验证清单");
    expect(prompt).toContain("## 🧭 客观理性结论");
    expect(prompt).toContain("完整 staged transcript");
    expect(prompt).toContain("红队攻击是否真的迫使角色修正");
    expect(prompt).toContain("Bull output");
    expect(prompt).toContain("Bear output");
    expect(prompt).toContain("Engineer output");
  });

  it("builds a strict brief expansion skill prompt", () => {
    const prompt = buildBriefExpansionPrompt("我要做一个 Codex OAuth 多智能体桌面 App", input);
    expect(prompt).toContain("Brief Builder Skill");
    expect(prompt).toContain("只输出一个 JSON 对象");
    expect(prompt).toContain("\"topic\"");
    expect(prompt).toContain("Codex OAuth 多智能体桌面 App");
  });

  it("creates a local demo brief from one sentence", () => {
    const brief = buildDemoBriefExpansion("我要做一个 Codex OAuth 多智能体桌面 App");
    expect(brief.topic).toContain("Codex OAuth");
    expect(brief.background).toContain("一句话需求");
    expect(brief.goal).toContain("验证");
    expect(brief.decisionUse).toBe("技术路线");
  });

  it("creates staged demo outputs with visible attacks and consensus", () => {
    expect(buildDemoStageOutput("bull", "opening", input)).toContain("Stage 1 / 开场立论");
    expect(buildDemoStageOutput("bear", "redTeam", input)).toContain("交叉红队");
    expect(buildDemoStageOutput("engineer", "consensus", input)).toContain("阶段共识");
  });
});
