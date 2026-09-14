import type { LlmClient } from "../ports/llm";
import type { Finding } from "../contract";

export type ReviewPass = (
  source: string,
  llm: LlmClient,
  limit?: number
) => Promise<Finding[]>;