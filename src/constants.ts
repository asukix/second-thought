import type { LlmErrorKind } from "./ports/llm";

export const Category = {
  ParseError: "parse-error",
  Language: "language",
  Editorial: "editorial",
  System: "system",
} as const;


export type CategoryId = (typeof Category)[keyof typeof Category];

// One category per LLM error kind. `satisfies` forces every new kind to get a category.
export const LlmErrorCategory = {
  "rate-limited": "llm-rate-limited",
  unavailable: "llm-unavailable",
  auth: "llm-auth",
  "bad-request": "llm-bad-request",
} as const satisfies Record<LlmErrorKind, string>;