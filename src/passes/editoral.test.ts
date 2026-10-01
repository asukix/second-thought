import { describe, test, expect } from "bun:test";
import { editorialPass } from "./editorial";
import type { LlmClient } from "../ports/llm";

// Stub LLM: always returns the given text as a successful result (test double of the port).
function fakeLlm(response: string): LlmClient {
  return { async complete() { return { ok: true, text: response }; } };
}

describe("editorialPass", () => {
  test("advisory finding: info severity, no suggestion, anchor mapped to range", async () => {
    const source = "This is a broad claim without any grounding.";
    const llm = fakeLlm(
      JSON.stringify([
        { anchor: "broad claim", category: "unsupported claim", message: "needs grounding" },
      ])
    );

    const { findings } = await editorialPass(source, llm);

    expect(findings).toHaveLength(1);
    const f = findings[0];
    expect(f.passId).toBe("editorial");
    expect(f.severity).toBe("info");
    expect(f.suggestion).toBeUndefined();
    expect(source.slice(f.range.start, f.range.end)).toBe("broad claim");
  });

  test("absent anchor falls back to a broad range (0,0)", async () => {
    const source = "Some prose here.";
    const llm = fakeLlm(
      JSON.stringify([{ anchor: "not in the text", category: "structure", message: "..." }])
    );

    const { findings } = await editorialPass(source, llm);

    expect(findings).toHaveLength(1);
    expect(findings[0].range).toEqual({ start: 0, end: 0 });
  });

  test("empty array → no findings (strong writing)", async () => {
    const llm = fakeLlm("[]");
    expect((await editorialPass("Great paragraph.", llm)).findings).toHaveLength(0);
  });

  test("malformed response → error finding, not a crash", async () => {
    const llm = fakeLlm("nonsense");
    const { findings } = await editorialPass("Some prose.", llm);
    expect(findings).toHaveLength(1);
    expect(findings[0].severity).toBe("error");
    expect(findings[0].category).toBe("parse-error");
  });

  test("LLM error is reported, not turned into a finding", async () => {
    const llm: LlmClient = {
      async complete() {
        return { ok: false, error: { kind: "unavailable", message: "down" } };
      },
    };

    const outcome = await editorialPass("Some prose.", llm);

    expect(outcome.llmError?.kind).toBe("unavailable");
    expect(outcome.findings).toHaveLength(0);
  });
});
