import { test, expect } from "bun:test";
import { GeminiLlmClient } from "./gemini-llm";

// Fake fetch: sorban visszaadja a megadott válaszokat (az utolsót ismétli),
// és számolja a hívásokat. Így determinisztikusan tesztelhető a retry, hálózat nélkül.
function stubFetch(responses: Array<{ status: number; body: string }>) {
  let calls = 0;
  const original = globalThis.fetch;
  (globalThis as any).fetch = async () => {
    const r = responses[Math.min(calls, responses.length - 1)]!;
    calls++;
    return {
      ok: r.status >= 200 && r.status < 300,
      status: r.status,
      async text() {
        return r.body;
      },
      async json() {
        return JSON.parse(r.body);
      },
    } as any;
  };
  return {
    get calls() {
      return calls;
    },
    restore() {
      globalThis.fetch = original;
    },
  };
}

const OK_BODY = JSON.stringify({
  candidates: [{ content: { parts: [{ text: "OK" }] } }],
});

// retryDelay "0s" → the test will retry immediately, so we can test the retry logic without waiting.
const RATE_LIMIT_BODY = JSON.stringify({
  error: { code: 429, status: "RESOURCE_EXHAUSTED", details: [{ retryDelay: "0s" }] },
});

test("429 after retrying, then returns the successful response", async () => {
  const f = stubFetch([
    { status: 429, body: RATE_LIMIT_BODY },
    { status: 200, body: OK_BODY },
  ]);
  try {
    const out = await new GeminiLlmClient("fake-key").complete("sys", "user");
    expect(out).toBe("OK");
    expect(f.calls).toBe(2); // 1 x 429 + 1 x success
  } finally {
    f.restore();
  }
});

test("429 after max retries, then throws", async () => {
  const f = stubFetch([{ status: 429, body: RATE_LIMIT_BODY }]); // always 429
  try {
    await expect(
      new GeminiLlmClient("fake-key").complete("sys", "user")
    ).rejects.toThrow(/429/);
    expect(f.calls).toBe(5); // 1 original + 4 retry (MAX_RETRIES = 4)
  } finally {
    f.restore();
  }
});

test("permanent error (400) does not retry", async () => {
  const f = stubFetch([{ status: 400, body: JSON.stringify({ error: { code: 400 } }) }]);
  try {
    await expect(
      new GeminiLlmClient("fake-key").complete("sys", "user")
    ).rejects.toThrow(/400/);
    expect(f.calls).toBe(1); // no retry
  } finally {
    f.restore();
  }
});


test("network error (socket close) after retrying, then returns the successful response", async () => {
  let calls = 0;
  const original = globalThis.fetch;
  (globalThis as any).fetch = async () => {
    calls++;
    if (calls === 1) {
      throw new TypeError("The socket connection was closed unexpectedly.");
    }
    return {
      ok: true,
      status: 200,
      async text() {
        return OK_BODY;
      },
      async json() {
        return JSON.parse(OK_BODY);
      },
    } as any;
  };
  try {
    const out = await new GeminiLlmClient("fake-key").complete("sys", "user");
    expect(out).toBe("OK");
    expect(calls).toBe(2); // 1x dob (hálózati hiba) + 1x siker
  } finally {
    globalThis.fetch = original;
  }
});
