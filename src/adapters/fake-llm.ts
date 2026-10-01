import type { LlmClient, LlmResult } from "../ports/llm";

// Fake LLM: calls nothing, always returns the same successful answer.
export class FakeLlmClient implements LlmClient {
  async complete(systemPrompt: string, userText: string): Promise<LlmResult> {
    // Pretend the LLM found an issue in the text.
    return {
      ok: true,
      text: JSON.stringify([
        {
          category: "grammar",
          message: "Test finding from the fake adapter.",
          suggestion: userText.toUpperCase(),
        },
      ]),
    };
  }
}
