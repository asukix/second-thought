import type { LlmClient } from "../ports/llm";
import type { Finding } from "../contract";
import { segment } from "../segmenter";

const SYSTEM_PROMPT =
  "You are an English proofreader for technical blog prose. " +
  "Find grammar, punctuation and phrasing issues. For each issue return the exact " +
  "original substring to replace and its correction. " +
  "Copy 'original' VERBATIM from the input (exact characters, incl. punctuation and " +
  "Markdown) so it can be located by exact string match. Preserve Markdown syntax. " +
  'Return ONLY a JSON array of {"original","corrected","category","message"}. ' +
  "Empty array if no issues. No prose, no code fences.";

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