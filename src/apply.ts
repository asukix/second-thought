import type { Range } from "./contract";

export interface Edit {
  range: Range;
  replacement: string;
}

export function applyEdits(source: string, edits: Edit[]): string {
  
  const sorted = [...edits].sort((a, b) => b.range.start - a.range.start);

  let result = source;
  for (const edit of sorted) {
    result =
      result.slice(0, edit.range.start) +
      edit.replacement +
      result.slice(edit.range.end);
  }
  return result;
}