import { describe, test, expect } from "bun:test";
import { minimalEdit, isValidEdit, chooseNarrowest, type SentenceEdit } from "./sentence-edit";

function apply(sentence: string, e: SentenceEdit): string {
  return sentence.slice(0, e.offset) + e.replacement + sentence.slice(e.offset + e.length);
}

describe("minimalEdit", () => {
  test("replaces a single word", () => {
    expect(minimalEdit("teh cat", "the cat")).toEqual({ offset: 0, length: 3, replacement: "the" });
  });

  test("an insertion absorbs the next word (never zero-width)", () => {
    expect(minimalEdit("I give a hint", "I would give a hint")).toEqual({
      offset: 2,
      length: 4,
      replacement: "would give",
    });
  });

  test("an insertion at the end absorbs the previous word", () => {
    expect(minimalEdit("it works", "it works now")).toEqual({
      offset: 3,
      length: 5,
      replacement: "works now",
    });
  });

  test("punctuation attached to a word changes that word", () => {
    expect(minimalEdit("it works", "it works.")).toEqual({
      offset: 3,
      length: 5,
      replacement: "works.",
    });
  });

  test("identical text → undefined", () => {
    expect(minimalEdit("same text", "same text")).toBeUndefined();
  });

  test("applied to the original it always reproduces the corrected text", () => {
    const pairs: Array<[string, string]> = [
      ["teh cat", "the cat"],
      ["I give a hint", "I would give a hint"],
      ["it works", "it works now"],
      ["a  b", "a b"],
      ["Teh cat sat on teh mat.", "The cat sat on teh mat."],
    ];
    for (const [original, corrected] of pairs) {
      expect(apply(original, minimalEdit(original, corrected)!)).toBe(corrected);
    }
  });
});

describe("isValidEdit", () => {
  test("accepts an edit that reproduces the corrected sentence", () => {
    expect(isValidEdit("teh cat", "the cat", { offset: 0, length: 3, replacement: "the" })).toBe(true);
  });

  test("rejects a zero-width edit even if the text would match", () => {
    expect(isValidEdit("I give", "I would give", { offset: 2, length: 0, replacement: "would " })).toBe(false);
  });

  test("rejects an edit that produces a different sentence", () => {
    expect(isValidEdit("teh cat", "the cat", { offset: 4, length: 3, replacement: "dog" })).toBe(false);
  });
});

describe("chooseNarrowest", () => {
  const sentence = "I give a hint";
  const corrected = "I would give a hint";
  const llm = { precision: "llm" as const, edit: { offset: 0, length: 6, replacement: "I would give" } };
  const whole = { precision: "sentence" as const, edit: { offset: 0, length: sentence.length, replacement: corrected } };

  test("picks the minimal candidate when it is valid", () => {
    const minimal = { precision: "minimal" as const, edit: minimalEdit(sentence, corrected)! };
    expect(chooseNarrowest(sentence, corrected, [minimal, llm, whole])?.precision).toBe("minimal");
  });

  test("falls back to the LLM narrowing when the computed edit is wrong", () => {
    const broken = { precision: "minimal" as const, edit: { offset: 2, length: 4, replacement: "WRONG" } };
    expect(chooseNarrowest(sentence, corrected, [broken, llm, whole])?.precision).toBe("llm");
  });

  test("falls back to the whole sentence when both narrower candidates are wrong", () => {
    const broken = { precision: "minimal" as const, edit: { offset: 2, length: 4, replacement: "WRONG" } };
    const badLlm = { precision: "llm" as const, edit: { offset: 0, length: 6, replacement: "nope" } };
    expect(chooseNarrowest(sentence, corrected, [broken, badLlm, whole])?.precision).toBe("sentence");
  });
});