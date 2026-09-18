import { describe, test, expect } from "bun:test";
import { extractJson } from "./util";

describe("extractJson", () => {
  test("plain JSON is returned as-is (trimmed)", () => {
    expect(extractJson('  [{"a":1}]  ')).toBe('[{"a":1}]');
  });

  test("strips a ```json fence", () => {
    const raw = "```json\n[1, 2, 3]\n```";
    expect(extractJson(raw)).toBe("[1, 2, 3]");
  });

  test("strips a plain ``` fence (no language tag)", () => {
    const raw = '```\n{"ok": true}\n```';
    expect(extractJson(raw)).toBe('{"ok": true}');
  });

  test("extracts the fenced JSON even when wrapped in prose", () => {
    const raw = 'Here you go:\n```json\n[{"x":1}]\n```\nHope that helps!';
    expect(extractJson(raw)).toBe('[{"x":1}]');
  });
});