import type { LlmClient, LlmError } from "../ports/llm";
import type { Finding } from "../contract";

export interface PassOutcome {
  findings: Finding[];
  // Contract: a pass never swallows an LLM error or turns it into a finding.
  // It stops and reports it here; review() decides what happens next.
  llmError?: LlmError;
}

export type ReviewPass = (
  source: string,
  llm: LlmClient
) => Promise<PassOutcome>;