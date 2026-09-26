export const Category = {
  ParseError: "parse-error",
  Language: "language",
  Editorial: "editorial",
  System: "system",
} as const;


export type CategoryId = (typeof Category)[keyof typeof Category];
