import { describe, test, expect } from "bun:test";
import { review } from "./review";
import { languagePass } from "./passes/language";
import { GeminiLlmClient } from "./adapters/gemini-llm";

const LIVE = process.env.LEKTOR_LIVE === "1";
const key = process.env.GEMINI_API_KEY;

describe("live LLM smoke (opt-in: LEKTOR_LIVE=1)", () => {
  test.if(LIVE)("returns a result and catches an obvious typo", async () => {
    if (!key) throw new Error("LEKTOR_LIVE=1 needs GEMINI_API_KEY");
    const llm = new GeminiLlmClient(key);

    const result = await review("smoke.mdx", "teh cat and the dog.", llm, [languagePass]);

    expect(Array.isArray(result.findings)).toBe(true);

    const caughtTeh = result.findings.some(
      (f) => f.passId === "language" && f.suggestion?.includes("the")
    );
    expect(caughtTeh).toBe(true);
  }, 20000);  // wait for LLM response
});