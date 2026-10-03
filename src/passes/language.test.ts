import { describe, test, expect } from "bun:test";
import { languagePass } from "./language";
import type { LlmClient } from "../ports/llm";

// Stub LLM: always returns the given text as a successful result (test double of the port).
function fakeLlm(response: string): LlmClient {
  return { async complete() { return { ok: true, text: response }; } };
}

// One item in the LLM schema: the whole sentence is the anchor, original/corrected the LLM's narrowing.
function item(sentence: string, correctedSentence: string, original: string, corrected: string) {
  return { sentence, correctedSentence, original, corrected, category: "x", message: "y" };
}

describe("languagePass", () => {
  test("valid finding: range points at the minimal change, suggestion is the correction", async () => {
    const source = "The cat sat on teh mat.";
    const llm = fakeLlm(
      JSON.stringify([item("The cat sat on teh mat.", "The cat sat on the mat.", "on teh mat", "on the mat")])
    );

    const { findings } = await languagePass(source, llm);

    expect(findings).toHaveLength(1);
    const f = findings[0];
    expect(f.passId).toBe("language");
    expect(source.slice(f.range.start, f.range.end)).toBe("teh");
    expect(f.suggestion).toBe("the");
    expect(f.editPrecision).toBe("minimal");
  });

  test("a long LLM span is narrowed to the changed word", async () => {
    const source = "Hence I decided that after the explanation, I give a small extra context.";
    const corrected = "Hence I decided that after the explanation, I would give a small extra context.";
    const llm = fakeLlm(JSON.stringify([item(source, corrected, "I give a small", "I would give a small")]));

    const { findings } = await languagePass(source, llm);

    expect(findings).toHaveLength(1);
    expect(source.slice(findings[0].range.start, findings[0].range.end)).toBe("give");
    expect(findings[0].suggestion).toBe("would give");
  });

  test("two errors in one sentence become two findings", async () => {
    const source = "Teh cat sat on teh mat.";
    const llm = fakeLlm(
      JSON.stringify([
        item(source, "The cat sat on teh mat.", "Teh cat", "The cat"),
        item(source, "Teh cat sat on the mat.", "on teh mat", "on the mat"),
      ])
    );

    const { findings } = await languagePass(source, llm);

    expect(findings.map((f) => source.slice(f.range.start, f.range.end))).toEqual(["Teh", "teh"]);
  });

  test("skips a finding whose sentence is not found verbatim", async () => {
    const llm = fakeLlm(JSON.stringify([item("A dog barked.", "A dog barks.", "barked", "barks")]));
    expect((await languagePass("The cat sat on the mat.", llm)).findings).toHaveLength(0);
  });

  test("skips a finding whose sentence is not unique in the block", async () => {
    const source = "teh cat. teh cat.";
    const llm = fakeLlm(JSON.stringify([item("teh cat.", "the cat.", "teh", "the")]));
    expect((await languagePass(source, llm)).findings).toHaveLength(0);
  });

  test("a no-op item (sentence unchanged) is skipped", async () => {
    const source = "Fine sentence.";
    const llm = fakeLlm(JSON.stringify([item(source, source, "Fine", "Fine")]));
    expect((await languagePass(source, llm)).findings).toHaveLength(0);
  });

  test("malformed LLM response becomes an error finding, not a crash", async () => {
    const { findings } = await languagePass("A short paragraph.", fakeLlm("not valid json at all"));

    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("error");
    expect(findings[0].category).toBe("parse-error");
  });

  test("LLM error stops the pass and is reported, not turned into a finding", async () => {
    let calls = 0;
    const llm: LlmClient = {
      async complete() {
        calls++;
        return { ok: false, error: { kind: "rate-limited", message: "quota" } };
      },
    };

    const outcome = await languagePass("First block.\n\nSecond block.", llm);

    expect(outcome.llmError?.kind).toBe("rate-limited");
    expect(outcome.findings).toHaveLength(0);
    expect(calls).toBe(1); // no further calls after the error
  });
});
