import { describe, test, expect } from "bun:test";
import { review } from "./review";
import type { ReviewPass } from "./passes/pass";
import type { Finding } from "./contract";
import type { LlmClient } from "./ports/llm";
import { Category } from "./constants";

const dummyLlm: LlmClient = { async complete() { return ""; } };

const editFinding: Finding = {
  passId: Category.Editorial,
  range: { start: 0, end: 0 },
  severity: "info",
  category: "structure",
  message: "note",
};

function fakePass(findings: Finding[]): ReviewPass {
  return async () => findings;
}

describe("review", () => {
  test("collects findings from 2 passes, uses and builds a diff from suggestions", async () => {
    const source = "teh cat";
    const langFinding: Finding = {
      passId: Category.Language,
      range: { start: 0, end: 3 }, // "teh"
      severity: "warning",
      category: "spelling",
      message: "typo",
      suggestion: "the",
    };

    const result = await review("a.mdx", source, dummyLlm, [
      fakePass([langFinding]),
      fakePass([editFinding]),
    ]);

    expect(result.file).toBe("a.mdx");
    expect(result.findings).toHaveLength(2);
    expect(result.findings.map((f) => f.passId).sort()).toEqual([Category.Editorial, Category.Language]);
    expect(result.diff).toBeDefined();
    expect(result.diff).toContain("the cat");
  });

  test("no applicable suggestions → diff is undefined, findings still returned", async () => {
    const result = await review("a.mdx", "Some prose.", dummyLlm, [fakePass([editFinding])]);

    expect(result.findings).toHaveLength(1);
    expect(result.diff).toBeUndefined();
  });

  test("empty source throws", async () => {
    await expect(review("a.mdx", "   ", dummyLlm, [])).rejects.toThrow();
  });
});