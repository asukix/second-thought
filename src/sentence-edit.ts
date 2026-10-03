import type { EditPrecision } from "./contract";

// An edit relative to one sentence: replace `length` chars at `offset` with `replacement`.
export interface SentenceEdit {
  offset: number;
  length: number;
  replacement: string;
}

export interface Candidate {
  precision: EditPrecision;
  edit: SentenceEdit;
}

// Trims the words both texts share at the start and the end, so an edit covers only
// what really changes. Returns undefined when nothing changes.
export function minimalEdit(original: string, corrected: string): SentenceEdit | undefined {
  if (original === corrected) return undefined;

  const a = original.split(/(\s+)/); // keeps whitespace as separate tokens
  const b = corrected.split(/(\s+)/);

  let head = 0;
  while (head < a.length && head < b.length && a[head] === b[head]) head++;

  let tail = 0;
  while (
    tail < a.length - head &&
    tail < b.length - head &&
    a[a.length - 1 - tail] === b[b.length - 1 - tail]
  ) tail++;

  // An edit must cover at least one word of the original, so it is never zero-width
  // (an invisible squiggle in an editor). Absorb a neighbouring shared word if needed.
  while (a.slice(head, a.length - tail).join("").trim() === "" && (tail > 0 || head > 0)) {
    if (tail > 0) tail--;
    else head--;
  }

  return {
    offset: a.slice(0, head).join("").length,
    length: a.slice(head, a.length - tail).join("").length,
    replacement: b.slice(head, b.length - tail).join(""),
  };
}

// The invariant every candidate must satisfy: applied to the sentence it yields exactly
// the corrected sentence, and it covers at least one character (never zero-width).
export function isValidEdit(sentence: string, correctedSentence: string, edit: SentenceEdit): boolean {
  const { offset, length, replacement } = edit;
  if (length <= 0 || offset < 0 || offset + length > sentence.length) return false;
  return sentence.slice(0, offset) + replacement + sentence.slice(offset + length) === correctedSentence;
}

// Candidates are ordered from narrow to wide; the first valid one wins.
// Callers append the whole sentence as the last resort, which is always valid.
export function chooseNarrowest(
  sentence: string,
  correctedSentence: string,
  candidates: Candidate[]
): Candidate | undefined {
  return candidates.find((c) => isValidEdit(sentence, correctedSentence, c.edit));
}