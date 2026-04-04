// Phase 3: AI SDK model factory — provider-agnostic LLM instantiation

/**
 * Create a Vercel AI SDK model instance from config.
 * Phase 3 implementation — stub for now.
 *
 * Will support:
 * - openai (via @ai-sdk/openai)
 * - anthropic (via @ai-sdk/anthropic)
 * - ollama (via @ai-sdk/openai with custom baseURL)
 */
export function createModel(_provider: string, _modelId: string, _apiKey?: string): unknown {
  // Phase 3: Will return a Vercel AI SDK LanguageModel
  throw new Error("LLMJ provider not yet implemented — use mode: static-only");
}
