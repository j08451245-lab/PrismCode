// =============================================================================
// Cálculo de créditos no servidor - PrismCode
// Calcula quantos créditos cobrar do usuário baseado no uso real de tokens
// após uma resposta do modelo de IA. Usado pelo endpoint de chat para
// registrar cobrança no Polar.sh.
// =============================================================================

import {
  SUPPORTED_CHAT_MODELS,
  findSupportedChatModel,
  type ModelPricing,
} from "@prismcode543/shared";
import type { LanguageModelUsage } from "ai"; // Tipo de uso retornado pela AI SDK

// Parâmetros de entrada: provedor, modelo, e uso de tokens
type CalculateCreditsForUsageParams = {
  provider: string;   // Provedor que processou a requisição
  model: string;      // Modelo usado
  usage: LanguageModelUsage; // Uso de tokens retornado pelo modelo
};

// Resultado: quantidade de créditos a cobrar
type BillableUsage = {
  credits: number;
};

// Contagem de tokens extraída do usage
type TokenCounts = {
  inputTokens: number;   // Tokens de entrada (prompt do usuário)
  outputTokens: number;  // Tokens de saída (resposta do modelo)
};

// Constantes de conversão
const TOKENS_PER_MILLION = 1_000_000;
// 1 crédito = $0.01. Fica fácil de raciocinar como centavos,
// mas é granular o suficiente para uso pequeno de IA.
// Mudar esta constante se product quiser uma unidade diferente.
const USD_PER_CREDIT = 0.01;

// ---------------------------------------------------------------------------
// Extrai e valida os contadores de tokens do objeto usage
// Lança erro se os valores forem nulos, não numéricos ou negativos
// ---------------------------------------------------------------------------

function getTokenCounts(usage: LanguageModelUsage): TokenCounts {
  const inputTokens = usage.inputTokens;
  const outputTokens = usage.outputTokens;

  // Validação robusta: null, NaN, Infinity, não-inteiro, ou negativo
  if (
    inputTokens == null ||
    outputTokens == null ||
    !Number.isFinite(inputTokens) ||
    !Number.isFinite(outputTokens) ||
    !Number.isInteger(inputTokens) ||
    !Number.isInteger(outputTokens) ||
    inputTokens < 0 ||
    outputTokens < 0
  ) {
    throw new Error("Credit conversion requires input and output token counts");
  }

  return { inputTokens, outputTokens };
};

// ---------------------------------------------------------------------------
// Busca o preço do modelo no catálogo de modelos suportados
// Valida se o modelo e provedor são compatíveis
// ---------------------------------------------------------------------------

function getModelPricing(provider: string, model: string): ModelPricing {
  const supportedModel = findSupportedChatModel(model);

  // Verifica se o modelo existe e se o provedor bate
  if (!supportedModel || supportedModel.provider !== provider) {
    if (!SUPPORTED_CHAT_MODELS.some((supportedModel) => supportedModel.provider === provider)) {
      throw new Error(`Unsupported billing provider: ${provider}`);
    }
    throw new Error(`Unsupported billing model: ${model}`);
  }

  return supportedModel.pricing;
};

// Calcula custo em USD: (tokensEntrada * preçoEntrada + tokensSaída * preçoSaída) / 1M
function estimateCostUsd({ inputTokens, outputTokens }: TokenCounts, pricing: ModelPricing) {
  return (
    (inputTokens * pricing.inputUsdPerMillionTokens +
      outputTokens * pricing.outputUsdPerMillionTokens) /
    TOKENS_PER_MILLION
  );
};

// Converte USD para créditos internos
// Se custar qualquer valor não-zero, cobra mínimo de 1 crédito
// Arredonda para cima (sem frações de crédito)
function convertUsdToCredits(estimatedCostUsd: number) {
  if (estimatedCostUsd <= 0) {
    return 0;
  }
  return Math.max(1, Math.ceil(estimatedCostUsd / USD_PER_CREDIT));
};

// ---------------------------------------------------------------------------
// Função pública: calcula créditos para um uso de modelo
// Usada pelo endpoint de chat após o modelo terminar de responder
// ---------------------------------------------------------------------------

export function calculateCreditsForUsage({
  provider,
  model,
  usage,
}: CalculateCreditsForUsageParams): BillableUsage {
  const tokenCounts = getTokenCounts(usage);       // Extrai tokens
  const pricing = getModelPricing(provider, model); // Busca preços
  const estimatedCostUsd = estimateCostUsd(tokenCounts, pricing); // Calcula custo
  const credits = convertUsdToCredits(estimatedCostUsd);          // Converte

  return { credits };
};

