// =============================================================================
// Estimativa de custo local - PrismCode
// Calcula o custo estimado de uma mensagem ANTES de enviar ao servidor.
// Usado para mostrar ao usuário quanto a mensagem vai custar.
// =============================================================================

import { findSupportedChatModel } from "@prismcode543/shared";

// Aproximação: 4 caracteres por token (regra geral)
const CHARS_PER_TOKEN = 4;

// Estima a quantidade de tokens a partir do tamanho do texto
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

// Estima o custo total de uma mensagem (entrada + saída)
// imageCount: cada imagem ≈ 1000 tokens
export function estimateCostForMessage(text: string, modelId: string, imageCount: number = 0) {
  const model = findSupportedChatModel(modelId);
  if (!model) return null; // Modelo não encontrado

  // Tokens de entrada = texto + imagens
  const inputTokens = estimateTokenCount(text) + imageCount * 1000;
  // Tokens de saída estimados = 2x o texto de entrada
  const outputTokens = estimateTokenCount(text) * 2;

  // Calcula custo em USD para entrada e saída
  const inputCost = (inputTokens * model.pricing.inputUsdPerMillionTokens) / 1_000_000;
  const outputCost = (outputTokens * model.pricing.outputUsdPerMillionTokens) / 1_000_000;
  const totalCost = inputCost + outputCost;

  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    inputCost,
    outputCost,
    totalCost,
    isFree: model.pricing.inputUsdPerMillionTokens === 0 && model.pricing.outputUsdPerMillionTokens === 0,
  };
}
