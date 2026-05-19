import { describe, expect, it } from "vitest";
import { parseCodexJsonEvent } from "../server/codexAgent";

describe("parseCodexJsonEvent", () => {
  it("parses reasoning JSONL events", () => {
    expect(parseCodexJsonEvent(JSON.stringify({ type: "agent_reasoning_delta", delta: "分析约束" }))).toEqual({
      eventKind: "reasoning",
      message: "分析约束",
      rawType: "agent_reasoning_delta"
    });
  });

  it("parses command begin and end events as tool call/result events", () => {
    const begin = parseCodexJsonEvent(JSON.stringify({ type: "exec_command_begin", command: "npm test" }));
    const end = parseCodexJsonEvent(JSON.stringify({ type: "exec_command_end", output: "2 passed" }));

    expect(begin?.eventKind).toBe("tool_call");
    expect(begin?.message).toBe("npm test");
    expect(end?.eventKind).toBe("tool_result");
    expect(end?.message).toBe("2 passed");
  });

  it("parses nested final answer messages", () => {
    const parsed = parseCodexJsonEvent(
      JSON.stringify({
        type: "message",
        item: {
          content: [{ type: "output_text", text: "最终结论" }]
        }
      })
    );

    expect(parsed?.eventKind).toBe("message");
    expect(parsed?.message).toBe("最终结论");
  });

  it("keeps non-json lines visible as raw trace events", () => {
    expect(parseCodexJsonEvent("plain stderr-ish line")).toEqual({
      eventKind: "raw",
      message: "plain stderr-ish line"
    });
    expect(parseCodexJsonEvent("   ")).toBeNull();
  });
});
