import type { LlmClient } from "../ports/llm";

const MODEL = "gemini-3.5-flash-lite";
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export class GeminiLlmClient implements LlmClient {
  constructor(private apiKey: string) {}

  async complete(systemPrompt: string, userText: string): Promise<string> {
    const res = await fetch(`${ENDPOINT}?key=${this.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userText }] }],
      }),
    });

    if (!res.ok) {
      throw new Error(`Gemini API hiba ${res.status}: ${await res.text()}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  }
}