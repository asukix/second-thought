import { LlmErrorCategory } from "../constants";
import type { Finding } from "../contract";

// Shared presentation for the TypeScript frontends (CLI, VS Code).
// The domain core must never import this: wording is a frontend concern.
export function toUserMessage(f: Finding): string {
  switch (f.category) {
    case LlmErrorCategory["rate-limited"]:
      return "Gemini quota exhausted. Wait a minute and run again.";
    case LlmErrorCategory.auth:
      return "GEMINI_API_KEY is invalid or missing.";
    case LlmErrorCategory.unavailable:
      return "Gemini is unavailable right now. Try again later.";
    default:
      return f.message;
  }
}
