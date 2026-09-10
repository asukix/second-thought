import type { LlmClient } from "../ports/llm";
import type { Finding } from "../contract";
import { segment } from "../segmenter";

const SYSTEM_PROMPT =
  "You are a STRICT English proofreader for a technical blog. " +
  "Fix ONLY mechanical errors: spelling, punctuation, capitalization, " +
  "subject-verb agreement, verb tense mistakes, and missing or incorrect articles. " +
  "Do NOT rephrase, reword, restructure, or change word choice for style, tone, " +
  "concision or 'naturalness'. If a sentence is grammatically correct, leave it " +
  "EXACTLY as is, even if you would phrase it differently. Preserve the author's " +
  "wording and voice, and preserve Markdown syntax (**, `, #). " +
  "For each genuine mechanical error, return the exact original substring and its " +
  'correction. Copy "original" VERBATIM so it can be located by exact string match. ' +
  'Return ONLY a JSON array of {"original","corrected","category","message"}. ' +
  "Empty array if there are no mechanical errors. No prose, no code fences.";

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  return (fenced ? fenced[1] : raw).trim();
}

export async function languagePass(
  source: string,
  llm: LlmClient,
  limit?: number
): Promise<Finding[]> {
  if (source.trim() === "") {
    throw new Error("languagePass: üres bemenet.");
  }
  const segments = segment(source);
  const targets = limit ? segments.slice(0, limit) : segments;
  const findings: Finding[] = [];

    for (const seg of targets) {
    try {
      const raw = await llm.complete(SYSTEM_PROMPT, seg.text);
      const items = JSON.parse(extractJson(raw)) as Array<{
        original: string;
        corrected: string;
        category: string;
        message: string;
      }>;

      for (const item of items) {
        const at = seg.text.indexOf(item.original);
        if (at === -1) continue;
        if (seg.text.indexOf(item.original, at + 1) !== -1) continue;

        const start = seg.range.start + at;
        const end = start + item.original.length;

        findings.push({
          passId: "language",
          range: { start, end },
          severity: "warning",
          category: item.category || "language",
          message: item.message,
          suggestion: item.corrected,
        });
      }
    } catch (err) {
      findings.push({
        passId: "language",
        range: seg.range,
        severity: "error",
        category: "parse-error",
        message: `Nem sikerült feldolgozni az LLM válaszát: ${err}`,
      });
    }
  }

  return findings;
}