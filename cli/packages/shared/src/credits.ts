// =============================================================================
// Sistema de créditos e estimativa de custos - PrismCode
// Calcula o custo estimado de uma mensagem em USD e créditos.
// Cada crédito vale $0.01. Usado para mostrar ao usuário quanto
// uma mensagem vai custar antes de enviá-la ao modelo de IA.
// =============================================================================

import { findSupportedChatModel, type ModelPricing } from "./models";

// Constantes de conversão
export const USD_PER_CREDIT = 0.01;     // 1 crédito = $0.01 (1 centavo)
export const TOKENS_PER_MILLION = 1_000_000; // 1 milhão de tokens (unidade de preço)

// ---------------------------------------------------------------------------
// Estimativa de contagem de tokens
// Usa a regra simplificada: ~4 caracteres por token
// (na prática varia por tokenizer, mas é uma boa aproximação)
// ---------------------------------------------------------------------------

export function estimateTokenCount(text: string): number {
  if (text.length === 0) return 0;
  return Math.ceil(text.length / 4); // Arredonda para cima
}

// ---------------------------------------------------------------------------
// Estimativa de custo em USD
// Calcula: (tokensEntrada * preçoEntrada + tokensSaída * preçoSaída) / 1M
// ---------------------------------------------------------------------------

export function estimateCostUsd(
  inputTokens: number,
  outputTokens: number,
  pricing: ModelPricing,
): number {
  return (
    (inputTokens * pricing.inputUsdPerMillionTokens +
      outputTokens * pricing.outputUsdPerMillionTokens) /
    TOKENS_PER_MILLION
  );
}

// ---------------------------------------------------------------------------
// Conversão de USD para créditos
// Arredonda para cima, mínimo de 1 crédito se houver custo
// ---------------------------------------------------------------------------

export function convertUsdToCredits(estimatedCostUsd: number): number {
  if (estimatedCostUsd <= 0) return 0;
  return Math.max(1, Math.ceil(estimatedCostUsd / USD_PER_CREDIT));
}

// Tipo que representa a prévia de custo para exibição ao usuário
export type CostPreview = {
  usd: number;     // Custo estimado em dólares
  credits: number; // Custo em créditos do sistema
};

// Número padrão estimado de tokens de saída (resposta do modelo)
// Usado quando ainda não sabemos quantos tokens a IA vai gerar
const DEFAULT_ESTIMATED_OUTPUT_TOKENS = 500;

// ---------------------------------------------------------------------------
// Função principal: gera uma prévia de custo
// Recebe o texto do usuário e o modelo, e retorna custo estimado
// Retorna null se o texto estiver vazio ou o modelo não for encontrado
// ---------------------------------------------------------------------------

export function getCostPreview(
  text: string,
  modelId: string,
  estimatedOutputTokens = DEFAULT_ESTIMATED_OUTPUT_TOKENS,
): CostPreview | null {
  if (text.length === 0) return null;

  // Busca o modelo na lista de suportados para obter os preços
  const model = findSupportedChatModel(modelId);
  if (!model) return null;

  // Calcula tokens de entrada a partir do texto
  const inputTokens = estimateTokenCount(text);
  // Calcula custo em USD
  const costUsd = estimateCostUsd(inputTokens, estimatedOutputTokens, model.pricing);
  // Converte para créditos
  const credits = convertUsdToCredits(costUsd);

  return { usd: costUsd, credits };
}
