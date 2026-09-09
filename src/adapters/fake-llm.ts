import type { LlmClient } from "../ports/llm";

// Hamis LLM: nem hív semmit, mindig ugyanazt a választ adja.
export class FakeLlmClient implements LlmClient {
  async complete(systemPrompt: string, userText: string): Promise<string> {
    // Úgy teszünk, mintha az LLM talált volna egy hibát a szövegben.
    return JSON.stringify([
      {
        category: "grammar",
        message: "Teszt-finding a hamis adaptertől.",
        suggestion: userText.toUpperCase(),
      },
    ]);
  }
}