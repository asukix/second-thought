import { describe, test, expect } from "bun:test";
import { applyEdits } from "./apply";

describe("applyEdits", () => {
  test("apply one edit without changing the rest", () => {
    const source = "Hello world, goodbye world.";
    const result = applyEdits(source, [
      { range: { start: 6, end: 11 }, replacement: "there" },
    ]);
    expect(result).toBe("Hello there, goodbye world.");
  });

  test("apply multiple edits with length changes, order-independent", () => {
    const source = "aaa bbb ccc";
    const result = applyEdits(source, [
      { range: { start: 0, end: 3 }, replacement: "AAAA" },   // +1
      { range: { start: 4, end: 7 }, replacement: "B" },      // -2
      { range: { start: 8, end: 11 }, replacement: "CCCCC" }, // +2
    ]);
    expect(result).toBe("AAAA B CCCCC");
  });

  test("apply edits to the same incorrect text at two positions, without interference", () => {
    const source = "teh cat and teh dog";
    const result = applyEdits(source, [
      { range: { start: 0, end: 3 }, replacement: "the" },
      { range: { start: 12, end: 15 }, replacement: "the" },
    ]);
    expect(result).toBe("the cat and the dog");
  });

  test("apply edits at the end without length changes", () => {
    const source = "Sentence ends with dot,";
    const result = applyEdits(source, [
      { range: { start: 22, end: 23 }, replacement: "." },
    ]);
    expect(result).toBe("Sentence ends with dot.");
  });

  test("apply edits at the beginning with length changes", () => {
    const source = "sentence with extra characters.";
    const result = applyEdits(source, [
      { range: { start: 0, end: 1 }, replacement: "S" },
    ]);
    expect(result).toBe("Sentence with extra characters.");
  });

  test("apply edits with inserting text at the beginning and end", () => {
    const source = "Middle text";
    const result = applyEdits(source, [
      { range: { start: 0, end: 0 }, replacement: "Start: " },
      { range: { start: 11, end: 11 }, replacement: ": End" },
    ]);
    expect(result).toBe("Start: Middle text: End");
  });

  test("apply edits with deleting text at the beginning and end", () => {
    const source = "Start: Middle text: End";
    const result = applyEdits(source, [
      { range: { start: 0, end: 7 }, replacement: "" },
      { range: { start: 18, end: 23 }, replacement: "" },
    ]);
    expect(result).toBe("Middle text");
  });

  test("apply empty edit list without changing the source", () => {
    const source = "Should not change.";
    expect(applyEdits(source, [])).toBe(source);
  });

  test("apply empty edits to empty source → empty string", () => {
    expect(applyEdits("", [])).toBe("");
  });
});