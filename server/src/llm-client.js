import OpenAI from 'openai';

const OPENROUTER_DEFAULT_BASE = 'https://openrouter.ai/api/v1';

/**
 * OpenAI SDK client for either OpenAI or OpenRouter (same API shape).
 * Prefer OPENROUTER_API_KEY when set — see https://openrouter.ai/docs
 */
export function createLlmClient() {
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  const openaiKey = process.env.OPENAI_API_KEY?.trim();
  const useOpenRouter =
    Boolean(openRouterKey) || Boolean(openaiKey?.startsWith('sk-or-v1-'));
  const apiKey = openRouterKey || openaiKey;

  const baseURL = useOpenRouter
    ? process.env.OPENROUTER_BASE_URL?.trim() || OPENROUTER_DEFAULT_BASE
    : process.env.OPENAI_BASE_URL?.trim() || undefined;

  const defaultPrimary = useOpenRouter ? 'openai/gpt-4o-mini' : 'gpt-4o-mini';
  const defaultFallback = useOpenRouter ? 'google/gemini-2.0-flash-001' : defaultPrimary;

  const primary =
    process.env.OPENAI_MODEL_PRIMARY?.trim() ||
    process.env.OPENAI_MODEL?.trim() ||
    defaultPrimary;
  const fallback =
    process.env.OPENAI_MODEL_FALLBACK?.trim() || primary;

  const client = new OpenAI({
    apiKey: apiKey || 'missing',
    baseURL,
    timeout: Number(process.env.OPENAI_TIMEOUT_MS) || 120_000,
    defaultHeaders: useOpenRouter
      ? {
          'HTTP-Referer':
            process.env.OPENROUTER_HTTP_REFERER?.trim() || 'http://localhost:4000',
          'X-Title': process.env.OPENROUTER_APP_NAME?.trim() || 'SnapDish',
        }
      : undefined,
  });

  return {
    client,
    apiKey,
    provider: useOpenRouter ? 'openrouter' : 'openai',
    models: { primary, fallback },
  };
}
