import type { LlmClient } from "../ports/llm";
import type { Finding } from "../contract";
import { segment } from "../segmenter";
import { extractJson } from "./util";
import { Category } from "../constants";
import type { PassOutcome } from "./pass";
import { minimalEdit, chooseNarrowest, type Candidate } from "../sentence-edit";

const SYSTEM_PROMPT =
  "You are a STRICT English proofreader for a technical blog. " +
  "Fix ONLY mechanical errors: spelling, punctuation, capitalization, " +
  "subject-verb agreement, verb tense mistakes, and missing or incorrect articles. " +
  "Do NOT rephrase, reword, restructure, or change word choice for style, tone, " +
  "concision or 'naturalness'. If a sentence is grammatically correct, leave it " +
  "EXACTLY as is, even if you would phrase it differently. Preserve the author's " +
  "wording and voice, and preserve Markdown syntax (**, `, #). " +
  "For each genuine mechanical error, return ONE item with: " +
  '"sentence": the whole sentence containing the error, copied VERBATIM from the text; ' +
  '"correctedSentence": that same sentence with ONLY this one fix applied; ' +
  '"original": the shortest part of the sentence that contains the error, plus a word or two of context, copied VERBATIM; ' +
  '"corrected": that part with the fix applied. ' +
  "If a sentence has two errors, return two items for the same sentence. " +
  'Return ONLY a JSON array of {"sentence","correctedSentence","original","corrected","category","message"}. ' +
  "Empty array if there are no mechanical errors. No prose, no code fences.";

type LanguageItem = {
  sentence: string;
  correctedSentence: string;
  original: string;
  corrected: string;
  category: string;
  message: string;
};

// Narrow → wide: the computed minimal change, the LLM's own narrowing, the whole sentence.
function candidatesFor(item: LanguageItem): Candidate[] {
  const candidates: Candidate[] = [];

  const minimal = minimalEdit(item.sentence, item.correctedSentence);
  if (minimal) candidates.push({ precision: "minimal", edit: minimal });

  const llmAt = item.original ? item.sentence.indexOf(item.original) : -1;
  if (llmAt !== -1 && item.sentence.indexOf(item.original, llmAt + 1) === -1) {
    candidates.push({
      precision: "llm",
      edit: { offset: llmAt, length: item.original.length, replacement: item.corrected },
    });
  }

  candidates.push({
    precision: "sentence",
    edit: { offset: 0, length: item.sentence.length, replacement: item.correctedSentence },
  });
  return candidates;
}

export async function languagePass(
  source: string,
  llm: LlmClient
): Promise<PassOutcome> {
  if (source.trim() === "") {
    throw new Error("languagePass: üres bemenet.");
  }
  const segments = segment(source);
  const findings: Finding[] = [];

  for (const seg of segments) {
    const result = await llm.complete(SYSTEM_PROMPT, seg.text);
    if (!result.ok) {
      // The LLM is not usable: stop and report. review() decides what happens next.
      return { findings, llmError: result.error };
    }

    try {
      const items = JSON.parse(extractJson(result.text)) as LanguageItem[];

      for (const item of items) {
        if (!item.sentence || !item.correctedSentence) continue; // schema not met
        if (item.sentence === item.correctedSentence) continue;   // no-op

        // Locate by the whole sentence: far more likely to be unique than a short fragment.
        const at = seg.text.indexOf(item.sentence);
        if (at === -1) continue;
        if (seg.text.indexOf(item.sentence, at + 1) !== -1) continue;

        const chosen = chooseNarrowest(item.sentence, item.correctedSentence, candidatesFor(item));
        if (!chosen) continue;

        const start = seg.range.start + at + chosen.edit.offset;
        findings.push({
          passId: Category.Language,
          range: { start, end: start + chosen.edit.length },
          severity: "warning",
          category: item.category || Category.Language,
          message: item.message,
          suggestion: chosen.edit.replacement,
          editPrecision: chosen.precision,
        });
      }
    } catch (err) {
      findings.push({
        passId: Category.Language,
        range: seg.range,
        severity: "error",
        category: Category.ParseError,
        message: `Nem sikerült feldolgozni az LLM válaszát: ${err}`,
      });
    }
  }

  return { findings };
}