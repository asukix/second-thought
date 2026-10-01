import { describe, test, expect } from "bun:test";
import { toUserMessage } from "./messages";
import type { Finding } from "../contract";

function finding(category: string, message: string): Finding {
  return { passId: "system", range: { start: 0, end: 0 }, severity: "error", category, message };
}

describe("toUserMessage", () => {
  test("rate-limited LLM error gets a friendly text", () => {
    expect(toUserMessage(finding("llm-rate-limited", "Gemini: a kvóta elfogyott (429)."))).toBe(
      "Gemini quota exhausted. Wait a minute and run again."
    );
  });

  test("unknown category falls back to the core message", () => {
    expect(toUserMessage(finding("grammar", "typo"))).toBe("typo");
  });
});
