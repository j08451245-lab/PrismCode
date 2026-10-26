import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import {
  findSupportedChatModel,
  getByokKey,
  loadConfig,
  type SupportedProvider,
} from "@prismcode543/shared";

export type Provider = SupportedProvider | "ollama";

const OLLAMA_SENTINEL = "ollama";

// getByokKey já cobre config do projeto, config global (byok/providers) e env.
export function hasLocalKey(provider: Provider): boolean {
  if (provider === "ollama") return true;
  return Boolean(getByokKey(provider));
}

function requireKey(provider: Provider, hint: string): string {
  const key = getByokKey(provider);
  if (!key) {
    throw new Error(`${hint} API key not configured. Set ${provider.toUpperCase()}_API_KEY in .env or use /api command.`);
  }
  return key;
}

export function resolveLocalModel(provider: Provider, modelId: string) {
  switch (provider) {
    case "anthropic": {
      const apiKey = requireKey("anthropic", "Anthropic");
      return createAnthropic({ apiKey })(modelId);
    }
    case "openai": {
      const apiKey = requireKey("openai", "OpenAI");
      return createOpenAI({ apiKey })(modelId);
    }
    case "google": {
      const apiKey = requireKey("google", "Google");
      return createGoogleGenerativeAI({ apiKey })(modelId);
    }
    case "groq": {
      const apiKey = requireKey("groq", "Groq");
      return createOpenAI({ baseURL: "https://api.groq.com/openai/v1", apiKey })(modelId);
    }
    case "openrouter": {
      const apiKey = requireKey("openrouter", "OpenRouter");
      return createOpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey })(modelId);
    }
    case "opencode": {
      const apiKey = requireKey("opencode", "OpenCode");
      return createOpenAI({ baseURL: "https://opencode.ai/zen/v1", apiKey })(modelId);
    }
    case "ollama": {
      const config = loadConfig(process.cwd());
      const baseUrl = config.ollama?.baseUrl ?? process.env.OLLAMA_URL ?? "http://localhost:11434";
      const modelName =
        modelId && modelId !== OLLAMA_SENTINEL
          ? modelId
          : config.ollama?.defaultModel ?? "codellama";
      // Ollama ignora a chave, mas o provider OpenAI exige um valor não vazio.
      return createOpenAI({ baseURL: `${baseUrl}/v1`, apiKey: OLLAMA_SENTINEL })(modelName);
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

const DEFAULT_PROVIDERS: { provider: Provider; modelId: string }[] = [
  { provider: "groq", modelId: "llama-3.3-70b-versatile" },
  { provider: "openrouter", modelId: "anthropic/claude-sonnet-4-6" },
  { provider: "google", modelId: "gemini-2.5-flash" },
  { provider: "openai", modelId: "gpt-5.4-mini" },
  { provider: "anthropic", modelId: "claude-sonnet-4-6" },
  { provider: "opencode", modelId: "big-pickle" },
  { provider: "ollama", modelId: OLLAMA_SENTINEL },
];

export function providerForModel(modelId: string): Provider | undefined {
  const supported = findSupportedChatModel(modelId);
  if (supported) return supported.provider;
  if (modelId === OLLAMA_SENTINEL) return OLLAMA_SENTINEL;
  return undefined;
}

export function getDefaultModel(): { provider: Provider; modelId: string } {
  const config = loadConfig(process.cwd());
  const configuredModel = config.model ?? config.defaultModel;

  if (configuredModel) {
    const provider = providerForModel(configuredModel);
    if (provider && hasLocalKey(provider)) {
      return { provider, modelId: configuredModel };
    }
  }

  for (const p of DEFAULT_PROVIDERS) {
    if (hasLocalKey(p.provider)) return p;
  }

  return { provider: "google", modelId: "gemini-2.5-flash" };
}
