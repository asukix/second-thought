import type { LlmClient } from "../ports/llm";
import type { Finding } from "../contract";
import { segment } from "../segmenter";
import { extractJson } from "./util";
import { Category } from "../constants";
import type { PassOutcome } from "./pass";

const SYSTEM_PROMPT =
  "You are an editorial reviewer for a technical blog on iOS and software architecture. " +
  "Judge the writing against the author's style principles and COMMENT — do NOT rewrite. " +
  "IGNORE spelling, punctuation and grammar entirely — a separate pass handles those. " +
  "Comment ONLY on structure, argument and clarity. " +
  "Principles:\n" +
  "- Three-level structure: L1 an opening sentence that hooks, L2 the conceptual frame, L3 a concrete example.\n" +
  "- Trade-off framing over prescriptive rules: prefer 'when X' to 'X is better'.\n" +
  "- Clear reasoning (WHAT/WHY/HOW/TRADE-OFF); every claim supported; no buried lead.\n" +
  "- A critical voice that questions the status quo.\n" +
  "Report structural/editorial observations: missing concrete example (L3), prescriptive instead of trade-off, " +
  "unclear or unsupported claim, buried point, inconsistent terminology. " +
  "For each, quote a SHORT verbatim snippet from the text as 'anchor' (empty string if it applies broadly). " +
  'Return ONLY a JSON array of {"anchor","category","message"}. Empty array if the writing is strong. ' +
  "No prose, no code fences.";

export async function editorialPass(
  source: string,
  llm: LlmClient
): Promise<PassOutcome> {
  const segments = segment(source);
  const prose = segments.map((s) => s.text).join("\n\n");

  const result = await llm.complete(SYSTEM_PROMPT, prose);
  if (!result.ok) {
    // The LLM is not usable: report it. review() decides what happens next.
    return { findings: [], llmError: result.error };
  }

  let items: Array<{ anchor: string; category: string; message: string }>;
  try {
    items = JSON.parse(extractJson(result.text));
  } catch (err) {
    return {
      findings: [{
        passId: Category.Editorial,
        range: { start: 0, end: 0 },
        severity: "error",
        category: Category.ParseError,
        message: `Nem sikerült feldolgozni az LLM válaszát: ${err}`,
      }],
    };
  }

  return {
    findings: items.map((item): Finding => {
      let range = { start: 0, end: 0 };
      if (item.anchor) {
        const at = source.indexOf(item.anchor);
        if (at !== -1) range = { start: at, end: at + item.anchor.length };
      }
      return {
        passId: Category.Editorial,
        range,
        severity: "info",
        category: item.category || Category.Editorial,
        message: item.message,
      };
    }),
  };
}
