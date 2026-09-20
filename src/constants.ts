export const Category = {
  ParseError: "parse-error",
  Language: "language",
  Editorial: "editorial",
} as const;


export type CategoryId = (typeof Category)[keyof typeof Category];
