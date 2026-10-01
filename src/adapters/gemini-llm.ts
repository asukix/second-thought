import type { LlmClient, LlmError, LlmResult } from "../ports/llm";

const MODEL = "gemini-3.5-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const MAX_RETRIES = 4;
const BASE_BACKOFF_MS = 2000;
const MAX_BACKOFF_MS = 60_000;

const defaultSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export interface GeminiOptions {
  // Injectable for tests: record the backoff instead of actually waiting.
  sleep?: (ms: number) => Promise<void>;
}

// For 429 responses, the Gemini API may include a "retryDelay" in the response body (in seconds).
function suggestedDelayMs(body: string): number | undefined {
  const match = body.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  return match ? Math.ceil(parseFloat(match[1]) * 1000) : undefined;
}

// The suggested delay is a floor, not a replacement: Gemini rounds it down (e.g. "0s").
function backoffMs(attempt: number, suggestedMs?: number): number {
  return Math.min(Math.max(suggestedMs ?? 0, BASE_BACKOFF_MS * 2 ** attempt), MAX_BACKOFF_MS);
}

// Vendor → domain translation (anti-corruption layer): the raw body never crosses the port.
function toLlmError(status: number, body: string, retryAfterMs?: number): LlmError {
  if (status === 429) {
    return { kind: "rate-limited", message: "Gemini: quota exhausted (429).", retryAfterMs };
  }
  if (status === 401 || status === 403 || body.includes("API_KEY_INVALID")) {
    return { kind: "auth", message: `Gemini: invalid or missing API key (${status}).` };
  }
  if (status >= 500) {
    return { kind: "unavailable", message: `Gemini: server error (${status}).` };
  }
  return { kind: "bad-request", message: `Gemini: request rejected (${status}).` };
}

export class GeminiLlmClient implements LlmClient {
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(private apiKey: string, options: GeminiOptions = {}) {
    this.sleep = options.sleep ?? defaultSleep;
  }

  async complete(systemPrompt: string, userText: string): Promise<LlmResult> {
    let lastError: LlmError = { kind: "unavailable", message: "Gemini: unknown error." };

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      let res: Response;
      try {
        res = await fetch(`${ENDPOINT}?key=${this.apiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: userText }] }],
          }),
        });
      } catch (err) {
        // Network error (DNS, TLS, dropped connection): transient.
        lastError = {
          kind: "unavailable",
          message: `Gemini: network error (${err instanceof Error ? err.message : String(err)}).`,
        };
        if (attempt === MAX_RETRIES) break;
        await this.sleep(backoffMs(attempt));
        continue;
      }

      if (res.ok) {
        const data = await res.json();
        return { ok: true, text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? "" };
      }

      const body = await res.text();
      const suggested = suggestedDelayMs(body);
      lastError = toLlmError(res.status, body, suggested);

      // Only retry transient errors (429 quota, 5xx backend).
      const transient = res.status === 429 || res.status >= 500;
      if (!transient || attempt === MAX_RETRIES) break;

      await this.sleep(backoffMs(attempt, suggested));
    }

    return { ok: false, error: lastError };
  }
}
