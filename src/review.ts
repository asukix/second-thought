import { applyEdits, type Edit } from "./apply";
import { makeDiff } from "./diff";
import { segment } from "./segmenter";
import { Category } from "./constants";
import type { LlmClient } from "./ports/llm";
import type { ReviewPass } from "./passes/pass";
import type { ReviewResult, Finding } from "./contract";

export async function review(
  file: string,
  source: string,
  llm: LlmClient,
  passes: ReviewPass[]
): Promise<ReviewResult> {
  if (source.trim() === "") {
    throw new Error("review: üres bemenet.");
  }

  // Parse-guard
  try {
    segment(source);
  } catch (err) {
    return {
      file,
      findings: [
        {
          passId: Category.System,
          range: { start: 0, end: 0 },
          severity: "error",
          category: Category.ParseError,
          message: `Nem sikerült elemezni a fájlt: ${
            err instanceof Error ? err.message : String(err)
          }`,
        },
      ],
    };
  }

  const findings: Finding[] = [];
  for (const pass of passes) {
    findings.push(...(await pass(source, llm)));
  }

  const edits: Edit[] = findings
    .filter((f) => f.suggestion !== undefined)
    .map((f) => ({ range: f.range, replacement: f.suggestion! }));

  const diff =
    edits.length > 0 ? makeDiff(file, source, applyEdits(source, edits)) : undefined;

  return { file, findings, diff };
}
