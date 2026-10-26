// =============================================================================
// Resolução de modelos de IA - PrismCode
// Mapeia IDs de modelos (strings) para instâncias reais dos provedores
// (Anthropic, OpenAI, Groq, Google, OpenRouter, OpenCode).
// Cada provedor tem sua própria SDK e configurações de provider options
// (ex: thinking/rationing para Claude e GPT-5).
// =============================================================================

import { anthropic } from "@ai-sdk/anthropic";           // SDK Anthropic (Claude)
import { openai, createOpenAI } from "@ai-sdk/openai";   // SDK OpenAI (GPT)
import { createGroq } from "@ai-sdk/groq";               // SDK Groq (Llama, Mistral)
import { google } from "@ai-sdk/google";                 // SDK Google (Gemini)
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"; // Para provedores compatíveis
import {
  findSupportedChatModel,
  type SupportedChatModel,
  type SupportedChatModelId,
  type SupportedProvider,
} from "@prismcode543/shared";
import type { ProviderOptions } from "@ai-sdk/provider-utils";
import type { LanguageModel } from "ai";

// ---------------------------------------------------------------------------
// Tipos de IDs extraídos por provedor
// Usam Extract para obter apenas os IDs de um provedor específico
// Ex: AnthropicModelId = "claude-sonnet-4-6" | "claude-haiku-4-5" | ...
// ---------------------------------------------------------------------------

type AnthropicModelId = Extract<SupportedChatModel, { provider: "anthropic" }>["id"];
type OpenAIModelId = Extract<SupportedChatModel, { provider: "openai" }>["id"];
type GroqModelId = Extract<SupportedChatModel, { provider: "groq" }>["id"];
type GoogleModelId = Extract<SupportedChatModel, { provider: "google" }>["id"];
type OpenRouterModelId = Extract<SupportedChatModel, { provider: "openrouter" }>["id"];
type OpenCodeModelId = Extract<SupportedChatModel, { provider: "opencode" }>["id"];

// ---------------------------------------------------------------------------
// Tipo resultado: modelo resolvido pronto para uso
// Contém a instância do modelo, o provedor, o ID, e opções extras
// ---------------------------------------------------------------------------

export type ResolvedModel = {
  model: LanguageModel;                    // Instância do modelo da Vercel AI SDK
  provider: SupportedProvider;             // Qual provedor está sendo usado
  modelId: SupportedChatModelId;           // ID do modelo
  providerOptions?: ProviderOptions;       // Opções específicas do provedor
};

// ---------------------------------------------------------------------------
// Opções de provider para cada modelo
// Algumas modelos precisam de configurações extras (ex: thinking habilitado)
// ---------------------------------------------------------------------------

// Opções do Anthropic: habilita "thinking" (raciocínio em cadeia) para Opus e Sonnet
const ANTHROPIC_PROVIDER_OPTIONS: Partial<Record<AnthropicModelId, ProviderOptions>> = {
  "claude-opus-4-6": {
    anthropic: {
      thinking: {
        type: "enabled",        // Habilita modo de pensamento
        budgetTokens: 10000,    // Budget de 10k tokens para raciocínio
      }
    },
  },
  "claude-sonnet-4-6": {
    anthropic: {
      thinking: {
        type: "enabled",
        budgetTokens: 10000,
      },
    },
  },
};

// Opções do OpenAI: habilita resumo detalhado do raciocínio para GPT-5.4
const OPENAI_PROVIDER_OPTIONS: Partial<Record<OpenAIModelId, ProviderOptions>> = {
  "gpt-5.4": {
    openai: {
      thinking: {
        reasoningSummary: "detailed", // Raciocínio detalhado
      }
    },
  },
};

// ---------------------------------------------------------------------------
// Instâncias dos provedores criadas uma única vez (singletons)
// ---------------------------------------------------------------------------

// OpenRouter: usa API compatível com OpenAI, roteando para múltiplos provedores
const openrouter = createOpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
  name: "openrouter",
});

// OpenCode: provedor gratuito, API compatível com OpenAI
const opencode = createOpenAICompatible({
  baseURL: "https://opencode.ai/zen/v1",
  name: "opencode",
  apiKey: process.env.OPencode_API_KEY,
});

// ---------------------------------------------------------------------------
// Função auxiliar para erros: garante que todos os provedores foram tratados
// Se algum provedor não for coberto pelo switch, lança erro em tempo de compilação
// ---------------------------------------------------------------------------

function assertUnsupportedProvider(provider: never): never {
  throw new Error(`Unsupported provider: ${provider}`);
};

// ---------------------------------------------------------------------------
// Funções de resolução: criam instância do modelo para cada provedor
// ---------------------------------------------------------------------------

// Resolve modelo Anthropic (Claude)
function resolveAnthropicModel(modelId: AnthropicModelId): ResolvedModel {
  return {
    model: anthropic(modelId),       // Cria instância do Claude
    provider: "anthropic",
    modelId,
    providerOptions: ANTHROPIC_PROVIDER_OPTIONS[modelId], // Opções de thinking
  };
};

// Resolve modelo OpenAI (GPT)
function resolveOpenAIModel(modelId: OpenAIModelId): ResolvedModel {
  return {
    model: openai(modelId),          // Cria instância do GPT
    provider: "openai",
    modelId,
    providerOptions: OPENAI_PROVIDER_OPTIONS[modelId], // Opções de reasoning
  };
};

// Resolve modelo Groq (Llama, Mistral)
function resolveGroqModel(modelId: GroqModelId): ResolvedModel {
  return {
    model: createGroq({}).languageModel(modelId) as unknown as LanguageModel,
    provider: "groq",
    modelId,
  };
};

// Resolve modelo Google (Gemini)
function resolveGoogleModel(modelId: GoogleModelId): ResolvedModel {
  return {
    model: google(modelId),
    provider: "google",
    modelId,
  };
};

// Resolve modelo OpenRouter
function resolveOpenRouterModel(modelId: OpenRouterModelId): ResolvedModel {
  return {
    model: openrouter(modelId),
    provider: "openrouter",
    modelId,
  };
};

// Resolve modelo OpenCode (gratuito)
function resolveOpenCodeModel(modelId: OpenCodeModelId): ResolvedModel {
  return {
    model: opencode(modelId),
    provider: "opencode",
    modelId,
  };
};

// ---------------------------------------------------------------------------
// Função principal: resolve um modelo suportado para sua instância real
// Usa switch para despachar para a função correta de cada provedor
// ---------------------------------------------------------------------------

function resolveSupportedChatModel(model: SupportedChatModel): ResolvedModel {
  const provider = model.provider;

  switch (provider) {
    case "anthropic":  return resolveAnthropicModel(model.id);
    case "openai":     return resolveOpenAIModel(model.id);
    case "groq":       return resolveGroqModel(model.id);
    case "google":     return resolveGoogleModel(model.id);
    case "openrouter": return resolveOpenRouterModel(model.id);
    case "opencode":   return resolveOpenCodeModel(model.id);
    default:           return assertUnsupportedProvider(provider); // Nunca deve chegar aqui
  }
};

// Verifica se um ID de modelo é suportado (type guard)
export function isSupportedChatModel(modelId: string): modelId is SupportedChatModelId {
  return findSupportedChatModel(modelId) != null;
};

// Função pública: resolve um modelId string para uma instância pronta para uso
// Lança erro se o modelo não for suportado
export function resolveChatModel(modelId: string): ResolvedModel {
  const model = findSupportedChatModel(modelId);
  if (!model) {
    throw new Error(`Unsupported model: ${modelId}`);
  }

  return resolveSupportedChatModel(model);
};

