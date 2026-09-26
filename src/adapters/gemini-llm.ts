import type { LlmClient } from "../ports/llm";

const MODEL = "gemini-3.5-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const MAX_RETRIES = 4;
const BASE_BACKOFF_MS = 2000;
const MAX_BACKOFF_MS = 60_000;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// For 429 responses, the Gemini API may include a "retryDelay" in the response body (in seconds).
function suggestedDelayMs(body: string): number | undefined {
  const match = body.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  return match ? Math.ceil(parseFloat(match[1]) * 1000) : undefined;
}

export class GeminiLlmClient implements LlmClient {
  constructor(private apiKey: string) {}

  async complete(systemPrompt: string, userText: string): Promise<string> {
    let lastError = "";

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
        // Newtwork error (DNS, TLS, etc.): retry
        lastError = `Gemini hálózati hiba: ${err instanceof Error ? err.message : String(err)}`;
        if (attempt === MAX_RETRIES) break;
        await sleep(Math.min(BASE_BACKOFF_MS * 2 ** attempt, MAX_BACKOFF_MS));
        continue;
      }

      if (res.ok) {
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      }

      const body = await res.text();
      lastError = `Gemini API hiba ${res.status}: ${body}`;

      // Only retry transient errors (429 quota, 5xx backend).
      const transient = res.status === 429 || res.status >= 500;
      if (!transient || attempt === MAX_RETRIES) break;

      const backoff = Math.min(
        suggestedDelayMs(body) ?? BASE_BACKOFF_MS * 2 ** attempt,
        MAX_BACKOFF_MS
      );
      await sleep(backoff);
    }

    throw new Error(lastError);
  }
}
