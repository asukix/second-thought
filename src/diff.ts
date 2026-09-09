import { createTwoFilesPatch } from "diff";

export function makeDiff(file: string, before: string, after: string): string {
  return createTwoFilesPatch(file, file, before, after, "", "", { context: 2 });
}