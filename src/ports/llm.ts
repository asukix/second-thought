export type LlmErrorKind = "rate-limited" | "unavailable" | "auth" | "bad-request";

export interface LlmError {
  kind: LlmErrorKind;
  message: string;        // short, no raw vendor payload
  retryAfterMs?: number;
}

// Like Swift's Result<String, LlmError>: the caller cannot read `text` without checking `ok`.
export type LlmResult =
  | { ok: true; text: string }
  | { ok: false; error: LlmError };

export interface LlmClient {
  complete(systemPrompt: string, userText: string): Promise<LlmResult>;
}