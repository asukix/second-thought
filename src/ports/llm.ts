export interface LlmClient {
  complete(systemPrompt: string, userText: string): Promise<string>;
}