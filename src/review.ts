import { applyEdits, type Edit } from "./apply";
import { makeDiff } from "./diff";
import { protectedRanges, overlapsAny } from "./segmenter";
import { Category, LlmErrorCategory } from "./constants";
import type { LlmClient, LlmError, LlmErrorKind } from "./ports/llm";
import type { ReviewPass } from "./passes/pass";
import type { ReviewResult, Finding, Range } from "./contract";

// Systemic errors: further LLM calls would fail too, so stop (fail-fast).
const SYSTEMIC: ReadonlySet<LlmErrorKind> = new Set(["rate-limited", "unavailable", "auth"]);

export async function review(
  file: string,
  source: string,
  llm: LlmClient,
  passes: ReviewPass[]
): Promise<ReviewResult> {
  if (source.trim() === "") {
    throw new Error("review: üres bemenet.");
  }

  let guarded: Range[];

  // Parse-guard
  try {
    guarded = protectedRanges(source);
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
    const outcome = await pass(source, llm);
    findings.push(...outcome.findings);

    if (outcome.llmError) {
      findings.push(llmErrorFinding(outcome.llmError));
      if (SYSTEMIC.has(outcome.llmError.kind)) break;
    }
  }

  const safe = findings.filter(
    (f) => f.suggestion === undefined || !overlapsAny(f.range, guarded)
  );

  const edits: Edit[] = safe
    .filter((f) => f.suggestion !== undefined)
    .map((f) => ({ range: f.range, replacement: f.suggestion! }));

  const diff =
    edits.length > 0 ? makeDiff(file, source, applyEdits(source, edits)) : undefined;

  return { file, findings: safe, diff };
}

// Default message comes from the adapter; the presentation layer maps the category to its own wording.
function llmErrorFinding(error: LlmError): Finding {
  return {
    passId: Category.System,
    range: { start: 0, end: 0 },
    severity: "error",
    category: LlmErrorCategory[error.kind],
    message: error.message,
  };
}
