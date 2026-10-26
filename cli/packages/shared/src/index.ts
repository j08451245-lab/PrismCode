// =============================================================================
// Pacote compartilhado (shared) - PrismCode
// Este arquivo é o ponto de entrada principal do pacote compartilhado.
// Ele re-exporta tudo que outros pacotes do monorepo precisam usar:
//   - Modelos de IA suportados e seus preços
//   - Modos de operação (BUILD, PLAN, ASK, etc.) e schemas de ferramentas
//   - Configuração do projeto (prismcode.json)
//   - Planos de assinatura (free, pro, enterprise)
//   - Sistema de logging
//   - Sistema de skills (plugins)
// =============================================================================

// Re-exporta modelos de IA: lista de modelos suportados, modelo padrão,
// função de busca, e tipos relacionados a preços e provedores
export {
  SUPPORTED_CHAT_MODELS,
  DEFAULT_CHAT_MODEL_ID,
  findSupportedChatModel,
  type ModelPricing,
  type SupportedProvider,
  type SupportedChatModel,
  type SupportedChatModelId,
} from "./models";

// Re-exporta modos de operação e schemas de entrada das ferramentas:
// - Mode: enum com os modos (BUILD, PLAN, ASK, DEBUG, REVIEW)
// - toolInputSchemas: schemas Zod para validar entradas de cada ferramenta
// - getToolContracts: retorna as ferramentas disponíveis para cada modo
export {
  Mode,
  modeSchema,
  toolInputSchemas,
  getToolContracts,
  type ToolContracts,
  type ModeType,
} from "./schemas";

// Re-exporta funções de configuração:
// - loadConfig: carrega prismcode.json do diretório do projeto
// - loadGlobalConfig: carrega config global (~/.prismcode/config.json)
// - saveConfig: salva configuração global
// - getByokKey: obtém chave de API do provedor (BYOK = Bring Your Own Key)
export {
  prismCodeConfigSchema,
  loadConfig,
  loadGlobalConfig,
  saveConfig,
  getByokKey,
  DEFAULT_CONFIG,
  type PrismCodeConfig,
} from "./config";

// Re-exporta sistema de planos: define os tiers de assinatura
// e funções auxiliares para verificar limites
export type { PlanId } from "./plans";
export { getPlan, getRemainingMessages, PLANS } from "./plans";

// Re-exporta o sistema de logging com níveis: DEBUG, INFO, WARN, ERROR
export { logger, LogLevel } from "./logger";

// Re-exporta tudo do sistema de skills (plugins):
// tipos, schemas de manifesto, constantes de diretório
export * from "./skills";
