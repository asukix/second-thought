import { describe, test, expect } from "bun:test";
import { review } from "./review";
import type { ReviewPass } from "./passes/pass";
import type { Finding } from "./contract";
import type { LlmClient } from "./ports/llm";
import { Category } from "./constants";

const dummyLlm: LlmClient = { async complete() { return { ok: true, text: "" }; } };

const editFinding: Finding = {
  passId: Category.Editorial,
  range: { start: 0, end: 0 },
  severity: "info",
  category: "structure",
  message: "note",
};

function fakePass(findings: Finding[]): ReviewPass {
  return async () => ({ findings });
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

  test("unparsable source (unterminated <br>) → single system parse-error, does not throw", async () => {
    const bad = "# Cím\n\nEgy bekezdés <br> benne lezáratlan taggel.\n";
    const result = await review("bad.md", bad, dummyLlm, []);

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.passId).toBe("system");
    expect(result.findings[0]!.category).toBe("parse-error");
    expect(result.findings[0]!.severity).toBe("error");
    expect(result.diff).toBeUndefined();
  });

  test("suggestion inside inline code is dropped; prose suggestion survives", async () => {
    const source = "`let` can't be declared in a convenience init.";
    expect(source.slice(15, 23)).toBe("declared"); // offset-check: "declared" is in prose, not in backticks

    const intoCode: Finding = {
      passId: Category.Language,
      range: { start: 1, end: 4 }, // "let" inside backticks
      severity: "warning",
      category: "punctuation",
      message: "add backticks",
      suggestion: "`let`",
    };
    const inProse: Finding = {
      passId: Category.Language,
      range: { start: 15, end: 23 }, // "declared"
      severity: "warning",
      category: "wording",
      message: "test",
      suggestion: "defined",
    };

    const result = await review("a.md", source, dummyLlm, [fakePass([intoCode, inProse])]);

    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.suggestion).toBe("defined");
    expect(result.diff).toContain("defined");
    expect(result.diff).not.toContain("``let``");
  });

  test("systemic LLM error: later passes don't run, one system finding", async () => {
    let secondRan = false;
    const failing: ReviewPass = async () => ({
      findings: [],
      llmError: { kind: "rate-limited", message: "quota" },
    });
    const second: ReviewPass = async () => {
      secondRan = true;
      return { findings: [] };
    };

    const result = await review("a.md", "Some prose.", dummyLlm, [failing, second]);

    expect(secondRan).toBe(false);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0]!.passId).toBe("system");
    expect(result.findings[0]!.category).toBe("llm-rate-limited");
  });

  test("bad-request is local: later passes still run", async () => {
    let secondRan = false;
    const failing: ReviewPass = async () => ({
      findings: [],
      llmError: { kind: "bad-request", message: "too large" },
    });
    const second: ReviewPass = async () => {
      secondRan = true;
      return { findings: [] };
    };

    const result = await review("a.md", "Some prose.", dummyLlm, [failing, second]);

    expect(secondRan).toBe(true);
    expect(result.findings[0]!.category).toBe("llm-bad-request");
  });
});
