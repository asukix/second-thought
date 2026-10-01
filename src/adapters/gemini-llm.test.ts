import { test, expect } from "bun:test";
import { GeminiLlmClient } from "./gemini-llm";
import type { LlmResult } from "../ports/llm";

// Records the requested backoff instead of waiting, so retry timing is asserted as data.
function recordingSleep() {
  const delays: number[] = [];
  return { delays, sleep: async (ms: number) => { delays.push(ms); } };
}

type FakeResponse = { status: number; body: string } | { throws: string };

// Fake fetch: returns the given responses in order (repeating the last one) and counts
// the calls, so the retry logic is testable deterministically, without network.
function stubFetch(responses: FakeResponse[]) {
  let calls = 0;
  const original = globalThis.fetch;
  (globalThis as any).fetch = async () => {
    const r = responses[Math.min(calls, responses.length - 1)]!;
    calls++;
    if ("throws" in r) {
      throw new TypeError(r.throws);
    }
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

// The error kind of a result, or undefined on success.
function errorKind(r: LlmResult): string | undefined {
  return r.ok ? undefined : r.error.kind;
}

const OK_BODY = JSON.stringify({
  candidates: [{ content: { parts: [{ text: "OK" }] } }],
});

function rateLimitBody(retryDelay: string): string {
  return JSON.stringify({
    error: { code: 429, status: "RESOURCE_EXHAUSTED", details: [{ retryDelay }] },
  });
}

// Gemini rounds the suggested delay down, so "0s" is realistic: the adapter must still back off.
const RATE_LIMIT_BODY = rateLimitBody("0s");

test("success → ok result with the text", async () => {
  const f = stubFetch([{ status: 200, body: OK_BODY }]);
  const s = recordingSleep();
  try {
    const r = await new GeminiLlmClient("fake-key", { sleep: s.sleep }).complete("sys", "user");
    expect(r).toEqual({ ok: true, text: "OK" });
  } finally {
    f.restore();
  }
});

test("429, then retry → ok result", async () => {
  const f = stubFetch([
    { status: 429, body: RATE_LIMIT_BODY },
    { status: 200, body: OK_BODY },
  ]);
  const s = recordingSleep();
  try {
    const r = await new GeminiLlmClient("fake-key", { sleep: s.sleep }).complete("sys", "user");
    expect(r).toEqual({ ok: true, text: "OK" });
    expect(f.calls).toBe(2); // 1 x 429 + 1 x success
  } finally {
    f.restore();
  }
});

test('retryDelay "0s" still backs off (floor = base backoff)', async () => {
  const f = stubFetch([
    { status: 429, body: RATE_LIMIT_BODY },
    { status: 200, body: OK_BODY },
  ]);
  const s = recordingSleep();
  try {
    await new GeminiLlmClient("fake-key", { sleep: s.sleep }).complete("sys", "user");
    expect(s.delays).toEqual([2000]);
  } finally {
    f.restore();
  }
});

test("suggested delay above the base backoff is respected", async () => {
  const f = stubFetch([
    { status: 429, body: rateLimitBody("50s") },
    { status: 200, body: OK_BODY },
  ]);
  const s = recordingSleep();
  try {
    await new GeminiLlmClient("fake-key", { sleep: s.sleep }).complete("sys", "user");
    expect(s.delays).toEqual([50000]);
  } finally {
    f.restore();
  }
});

test("429 after max retries → rate-limited error value", async () => {
  const f = stubFetch([{ status: 429, body: RATE_LIMIT_BODY }]); // always 429
  const s = recordingSleep();
  try {
    const r = await new GeminiLlmClient("fake-key", { sleep: s.sleep }).complete("sys", "user");
    expect(errorKind(r)).toBe("rate-limited");
    expect(f.calls).toBe(5); // 1 original + 4 retries (MAX_RETRIES = 4)
  } finally {
    f.restore();
  }
});

test("the raw vendor body never crosses the port", async () => {
  const f = stubFetch([{ status: 429, body: RATE_LIMIT_BODY }]); // always 429
  const s = recordingSleep();
  try {
    const r = await new GeminiLlmClient("fake-key", { sleep: s.sleep }).complete("sys", "user");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error.message).not.toContain("RESOURCE_EXHAUSTED");
  } finally {
    f.restore();
  }
});

test("backoff doubles on every attempt", async () => {
  const f = stubFetch([{ status: 429, body: RATE_LIMIT_BODY }]); // always 429
  const s = recordingSleep();
  try {
    await new GeminiLlmClient("fake-key", { sleep: s.sleep }).complete("sys", "user");
    expect(s.delays).toEqual([2000, 4000, 8000, 16000]);
  } finally {
    f.restore();
  }
});

test("backoff is capped at 60s", async () => {
  const f = stubFetch([{ status: 429, body: rateLimitBody("120s") }]); // always 429
  const s = recordingSleep();
  try {
    await new GeminiLlmClient("fake-key", { sleep: s.sleep }).complete("sys", "user");
    expect(s.delays).toEqual([60000, 60000, 60000, 60000]);
  } finally {
    f.restore();
  }
});

test("permanent error (400) → bad-request, no retry", async () => {
  const f = stubFetch([{ status: 400, body: JSON.stringify({ error: { code: 400 } }) }]);
  const s = recordingSleep();
  try {
    const r = await new GeminiLlmClient("fake-key", { sleep: s.sleep }).complete("sys", "user");
    expect(errorKind(r)).toBe("bad-request");
    expect(f.calls).toBe(1); // no retry
  } finally {
    f.restore();
  }
});

test("invalid API key (400 API_KEY_INVALID) → auth, no retry", async () => {
  const f = stubFetch([
    { status: 400, body: JSON.stringify({ error: { details: [{ reason: "API_KEY_INVALID" }] } }) },
  ]);
  const s = recordingSleep();
  try {
    const r = await new GeminiLlmClient("fake-key", { sleep: s.sleep }).complete("sys", "user");
    expect(errorKind(r)).toBe("auth");
    expect(f.calls).toBe(1);
  } finally {
    f.restore();
  }
});

test("server error (503) after max retries → unavailable", async () => {
  const f = stubFetch([{ status: 503, body: "{}" }]); // always 503
  const s = recordingSleep();
  try {
    const r = await new GeminiLlmClient("fake-key", { sleep: s.sleep }).complete("sys", "user");
    expect(errorKind(r)).toBe("unavailable");
    expect(f.calls).toBe(5);
  } finally {
    f.restore();
  }
});

test("network error (socket close) backs off, retries, then returns ok", async () => {
  const f = stubFetch([
    { throws: "The socket connection was closed unexpectedly." },
    { status: 200, body: OK_BODY },
  ]);
  const s = recordingSleep();
  try {
    const r = await new GeminiLlmClient("fake-key", { sleep: s.sleep }).complete("sys", "user");
    expect(r).toEqual({ ok: true, text: "OK" });
    expect(f.calls).toBe(2); // 1 x network error + 1 x success
    expect(s.delays).toEqual([2000]);
  } finally {
    f.restore();
  }
});

test("network error after max retries → unavailable", async () => {
  const f = stubFetch([{ throws: "The socket connection was closed unexpectedly." }]); // always
  const s = recordingSleep();
  try {
    const r = await new GeminiLlmClient("fake-key", { sleep: s.sleep }).complete("sys", "user");
    expect(errorKind(r)).toBe("unavailable");
    expect(f.calls).toBe(5);
  } finally {
    f.restore();
  }
});
