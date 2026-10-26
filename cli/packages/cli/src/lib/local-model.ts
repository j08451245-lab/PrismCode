import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { loadConfig, getByokKey } from "@prismcode543/shared";

export type Provider = "anthropic" | "openai" | "google" | "groq" | "openrouter" | "ollama";

export function hasLocalKey(provider: Provider): boolean {
  const byok = getByokKey(provider);
  if (byok) return true;
  switch (provider) {
    case "groq": return !!process.env.GROQ_API_KEY;
    case "openrouter": return !!process.env.OPENROUTER_API_KEY;
    case "ollama": return true;
    case "google": return !!process.env.GOOGLE_API_KEY;
    default: return !!process.env[`${provider.toUpperCase()}_API_KEY`];
  }
}

export function resolveLocalModel(provider: Provider, modelId: string) {
  switch (provider) {
    case "anthropic": {
      const byokKey = getByokKey("anthropic");
      return (anthropic as any)(modelId, byokKey ? { apiKey: byokKey } : undefined);
    }
    case "openai": {
      const byokKey = getByokKey("openai");
      if (!byokKey && !process.env.OPENAI_API_KEY) {
        throw new Error("OpenAI API key not configured. Set OPENAI_API_KEY in .env or use /api command.");
      }
      return createOpenAI({ apiKey: byokKey })(modelId);
    }
    case "google": {
      const byokKey = getByokKey("google") || process.env.GOOGLE_API_KEY;
      if (!byokKey) {
        throw new Error("Google API key not configured. Set GOOGLE_API_KEY in .env or use /api command.");
      }
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = byokKey;
      return (google as any)(modelId, { apiKey: byokKey });
    }
    case "groq": {
      const byokKey = getByokKey("groq") || process.env.GROQ_API_KEY;
      if (!byokKey) {
        throw new Error("Groq API key not configured. Use /api command.");
      }
      process.env.OPENAI_API_KEY = byokKey;
      return createOpenAI({ baseURL: "https://api.groq.com/openai/v1", apiKey: byokKey })("llama-3.3-70b-versatile");
    }
    case "openrouter": {
      const byokKey = getByokKey("openrouter") || process.env.OPENROUTER_API_KEY;
      if (!byokKey) {
        throw new Error("OpenRouter API key not configured. Use /api command.");
      }
      process.env.OPENAI_API_KEY = byokKey;
      return createOpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey: byokKey })(modelId);
    }
    case "ollama": {
      const config = loadConfig(process.cwd());
      const baseUrl = config.ollama?.baseUrl ?? process.env.OLLAMA_URL ?? "http://localhost:11434";
      const modelName = config.ollama?.defaultModel ?? "codellama";
      return createOpenAI({ baseURL: `${baseUrl}/v1` })(modelName);
    }
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
}

const DEFAULT_PROVIDERS: { provider: Provider; modelId: string }[] = [
  { provider: "groq", modelId: "groq-llama-3.3-70b" },
  { provider: "openrouter", modelId: "openrouter-auto" },
  { provider: "google", modelId: "gemini-2.5-flash" },
  { provider: "openai", modelId: "gpt-5.4-mini" },
  { provider: "anthropic", modelId: "claude-sonnet-4-6" },
  { provider: "ollama", modelId: "ollama" },
];

export function getDefaultModel(): { provider: Provider; modelId: string } {
  const config = loadConfig(process.cwd());

  if (config.defaultModel) {
    const modelId = config.defaultModel;
    if (modelId.startsWith("claude")) return { provider: "anthropic", modelId };
    if (modelId.startsWith("gpt")) return { provider: "openai", modelId };
    if (modelId.startsWith("gemini")) return { provider: "google", modelId };
    if (modelId.startsWith("groq")) return { provider: "groq", modelId };
    if (modelId.startsWith("openrouter")) return { provider: "openrouter", modelId };
    if (modelId === "ollama") return { provider: "ollama", modelId };
  }

  for (const p of DEFAULT_PROVIDERS) {
    if (hasLocalKey(p.provider)) return p;
  }

  return { provider: "google", modelId: "gemini-2.5-flash" };
}
