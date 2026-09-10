import { languagePass } from "./passes/language";
import { applyEdits, type Edit } from "./apply";
import { makeDiff } from "./diff";
import type { LlmClient } from "./ports/llm";
import type { ReviewResult } from "./contract";

export async function review(
  file: string,
  source: string,
  llm: LlmClient,
  limit?: number
): Promise<ReviewResult> {
  if (source.trim() === "") {
    throw new Error("review: üres bemenet.");
  }

  const findings = await languagePass(source, llm, limit);

  const edits: Edit[] = findings
    .filter((f) => f.suggestion !== undefined)
    .map((f) => ({ range: f.range, replacement: f.suggestion! }));

  const diff =
    edits.length > 0 ? makeDiff(file, source, applyEdits(source, edits)) : undefined;

  return { file, findings, diff };
}