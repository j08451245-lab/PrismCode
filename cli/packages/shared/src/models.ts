// =============================================================================
// Modelos de IA suportados - PrismCode
// Define todos os modelos de linguagem que o agente pode usar,
// seus provedores, preços por milhão de tokens, e funções de busca.
// =============================================================================

// Tipo que representa o preço de um modelo (custo por milhão de tokens)
export type ModelPricing = {
  inputUsdPerMillionTokens: number;   // Custo em USD por milhão de tokens de entrada
  outputUsdPerMillionTokens: number;  // Custo em USD por milhão de tokens de saída
};

// Provedores de IA suportados pelo sistema
export type SupportedProvider = "anthropic" | "openai" | "groq" | "google" | "openrouter" | "opencode";

// Tipo interno para definição de um modelo suportado
type SupportedChatModelDefinition = {
  id: string;           // Identificador único do modelo (ex: "claude-sonnet-4-6")
  provider: SupportedProvider; // Provedor que fornece o modelo
  pricing: ModelPricing;       // Preços de uso do modelo
};

// ---------------------------------------------------------------------------
// Lista de todos os modelos suportados com seus preços
// "as const satisfies" garante tipagem forte mantendo os valores literais
// ---------------------------------------------------------------------------

export const SUPPORTED_CHAT_MODELS = [
  // --- Modelos Anthropic (Claude) ---
  {
    id: "claude-sonnet-4-6",        // Claude Sonnet 4.6 - modelo equilibrado
    provider: "anthropic",
    pricing: {
      inputUsdPerMillionTokens: 3,   // $3 por milhão de tokens de entrada
      outputUsdPerMillionTokens: 15, // $15 por milhão de tokens de saída
    },
  },
  {
    id: "claude-haiku-4-5",         // Claude Haiku 4.5 - modelo rápido e barato
    provider: "anthropic",
    pricing: {
      inputUsdPerMillionTokens: 1,   // $1 por milhão de tokens de entrada
      outputUsdPerMillionTokens: 5,  // $5 por milhão de tokens de saída
    },
  },
  {
    id: "claude-opus-4-6",          // Claude Opus 4.6 - modelo mais capaz e caro
    provider: "anthropic",
    pricing: {
      inputUsdPerMillionTokens: 5,   // $5 por milhão de tokens de entrada
      outputUsdPerMillionTokens: 25, // $25 por milhão de tokens de saída
    },
  },

  // --- Modelos OpenAI (GPT) ---
  {
    id: "gpt-5.4",                  // GPT-5.4 - modelo principal da OpenAI
    provider: "openai",
    pricing: {
      inputUsdPerMillionTokens: 2.5,
      outputUsdPerMillionTokens: 15,
    },
  },
  {
    id: "gpt-5.4-mini",            // GPT-5.4 Mini - versão reduzida e mais barata
    provider: "openai",
    pricing: {
      inputUsdPerMillionTokens: 0.75,
      outputUsdPerMillionTokens: 4.5,
    },
  },
  {
    id: "gpt-5.4-nano",            // GPT-5.4 Nano - versão mais leve e econômica
    provider: "openai",
    pricing: {
      inputUsdPerMillionTokens: 0.2,
      outputUsdPerMillionTokens: 1.25,
    },
  },

  // --- Modelos Groq (Meta Llama e Mistral) ---
  // Groq roda modelos open-source em hardware otimizado (muito rápido)
  {
    id: "llama-3.3-70b-versatile",  // Llama 3.3 70B - modelo grande da Meta
    provider: "groq",
    pricing: {
      inputUsdPerMillionTokens: 0.59,
      outputUsdPerMillionTokens: 0.79,
    },
  },
  {
    id: "llama-3.1-8b-instant",    // Llama 3.1 8B - modelo pequeno e instantâneo
    provider: "groq",
    pricing: {
      inputUsdPerMillionTokens: 0.05,
      outputUsdPerMillionTokens: 0.08,
    },
  },
  {
    id: "mixtral-8x7b-32768",      // Mixtral 8x7B - modelo Mixture of Experts
    provider: "groq",
    pricing: {
      inputUsdPerMillionTokens: 0.24,
      outputUsdPerMillionTokens: 0.24,
    },
  },

  // --- Modelos Google (Gemini) ---
  // Gemini models have free tier pricing (0 = gratuito no momento)
  {
    id: "gemini-2.5-flash",         // Gemini 2.5 Flash - rápido e gratuito
    provider: "google",
    pricing: {
      inputUsdPerMillionTokens: 0,
      outputUsdPerMillionTokens: 0,
    },
  },
  {
    id: "gemini-2.5-flash-lite",   // Gemini 2.5 Flash Lite - ainda mais leve
    provider: "google",
    pricing: {
      inputUsdPerMillionTokens: 0,
      outputUsdPerMillionTokens: 0,
    },
  },
  {
    id: "gemini-2.5-pro",          // Gemini 2.5 Pro - modelo mais avançado
    provider: "google",
    pricing: {
      inputUsdPerMillionTokens: 0,
      outputUsdPerMillionTokens: 0,
    },
  },

  // --- Modelos OpenRouter (agregador de múltiplos provedores) ---
  // OpenRouter roteia para diferentes provedores, usando o prefixo "provedor/modelo"
  {
    id: "anthropic/claude-sonnet-4-6",  // Claude Sonnet via OpenRouter
    provider: "openrouter",
    pricing: {
      inputUsdPerMillionTokens: 3,
      outputUsdPerMillionTokens: 15,
    },
  },
  {
    id: "anthropic/claude-haiku-4-5",   // Claude Haiku via OpenRouter
    provider: "openrouter",
    pricing: {
      inputUsdPerMillionTokens: 1,
      outputUsdPerMillionTokens: 5,
    },
  },
  {
    id: "anthropic/claude-opus-4-6",    // Claude Opus via OpenRouter
    provider: "openrouter",
    pricing: {
      inputUsdPerMillionTokens: 5,
      outputUsdPerMillionTokens: 25,
    },
  },

  // --- Modelos OpenCode (gratuitos) ---
  // Modelos gratuitos oferecidos pela plataforma OpenCode
  {
    id: "big-pickle",                // Big Pickle - modelo gratuito OpenCode
    provider: "opencode",
    pricing: {
      inputUsdPerMillionTokens: 0,
      outputUsdPerMillionTokens: 0,
    },
  },
  {
    id: "deepseek-v4-flash-free",   // DeepSeek V4 Flash - gratuito
    provider: "opencode",
    pricing: {
      inputUsdPerMillionTokens: 0,
      outputUsdPerMillionTokens: 0,
    },
  },
  {
    id: "mimo-v2.5-free",           // MiMo V2.5 - modelo da Xiaomi, gratuito
    provider: "opencode",
    pricing: {
      inputUsdPerMillionTokens: 0,
      outputUsdPerMillionTokens: 0,
    },
  },
  {
    id: "qwen3.6-plus-free",        // Qwen 3.6 Plus - modelo da Alibaba, gratuito
    provider: "opencode",
    pricing: {
      inputUsdPerMillionTokens: 0,
      outputUsdPerMillionTokens: 0,
    },
  },
  {
    id: "minimax-m3-free",          // MiniMax M3 - gratuito
    provider: "opencode",
    pricing: {
      inputUsdPerMillionTokens: 0,
      outputUsdPerMillionTokens: 0,
    },
  },
  {
    id: "nemotron-3-ultra-free",    // Nemotron 3 Ultra - modelo NVIDIA, gratuito
    provider: "opencode",
    pricing: {
      inputUsdPerMillionTokens: 0,
      outputUsdPerMillionTokens: 0,
    },
  },
  {
    id: "north-mini-code-free",     // North Mini Code - gratuito
    provider: "opencode",
    pricing: {
      inputUsdPerMillionTokens: 0,
      outputUsdPerMillionTokens: 0,
    },
  },
] as const satisfies readonly SupportedChatModelDefinition[];

// Tipo de um modelo individual da lista
export type SupportedChatModel = (typeof SUPPORTED_CHAT_MODELS)[number];
// Tipo do ID de um modelo (união de todas as strings de ID possíveis)
export type SupportedChatModelId = SupportedChatModel["id"];

// ---------------------------------------------------------------------------
// Função de busca: encontra um modelo pelo seu ID
// Retorna undefined se o modelo não existir na lista
// ---------------------------------------------------------------------------

export function findSupportedChatModel(modelId: string) {
  return SUPPORTED_CHAT_MODELS.find((model) => model.id === modelId);
}

// Modelo padrão usado quando o usuário não escolhe nenhum
// Gemini 2.5 Flash é gratuito e rápido, boa escolha como padrão
export const DEFAULT_CHAT_MODEL_ID: SupportedChatModelId = "gemini-2.5-flash";
