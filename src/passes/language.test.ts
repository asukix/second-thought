import { describe, test, expect } from "bun:test";
import { languagePass } from "./language";
import type { LlmClient } from "../ports/llm";

// Stub LLM: mindig a megadott stringet adja vissza (a port test double-je).
function fakeLlm(response: string): LlmClient {
  return { async complete() { return response; } };
}

describe("languagePass", () => {
  test("valid finding: range points at the original, suggestion is the correction", async () => {
    const source = "The cat sat on teh mat.";
    const llm = fakeLlm(
      JSON.stringify([
        { original: "teh", corrected: "the", category: "spelling", message: "typo" },
      ])
    );

    const findings = await languagePass(source, llm);

    expect(findings).toHaveLength(1);
    const f = findings[0];
    expect(f.passId).toBe("language");
    expect(source.slice(f.range.start, f.range.end)).toBe("teh");
    expect(f.suggestion).toBe("the");
  });

  test("skips a finding whose original is not found verbatim", async () => {
    const source = "The cat sat on the mat.";
    const llm = fakeLlm(
      JSON.stringify([{ original: "dog", corrected: "cat", category: "x", message: "y" }])
    );
    expect(await languagePass(source, llm)).toHaveLength(0);
  });

  test("skips a finding whose original is not unique in the block", async () => {
    const source = "teh cat and teh dog.";
    const llm = fakeLlm(
      JSON.stringify([{ original: "teh", corrected: "the", category: "x", message: "y" }])
    );
    expect(await languagePass(source, llm)).toHaveLength(0);
  });

  test("malformed LLM response becomes an error finding, not a crash", async () => {
    const source = "A short paragraph.";
    const llm = fakeLlm("not valid json at all");

    const findings = await languagePass(source, llm);

    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("error");
    expect(findings[0].category).toBe("parse-error");
  });
});