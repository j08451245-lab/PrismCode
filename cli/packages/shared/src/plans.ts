// =============================================================================
// Sistema de planos de assinatura - PrismCode
// Define os tiers de assinatura (Free, Pro, Enterprise) com seus
// limites, features, preços, e funções auxiliares para verificação.
// =============================================================================

// IDs dos planos disponíveis
export type PlanId = "free" | "pro" | "enterprise";

// Tipo que representa um plano de assinatura completo
export type PlanTier = {
  id: PlanId;           // Identificador único do plano
  name: string;         // Nome exibido ao usuário
  description: string;  // Descrição curta do plano
  priceUsd: number;     // Preço mensal em dólares
  polarProductIdEnv: string; // Nome da variável de ambiente com o ID do produto no Polar.sh
  limits: {
    messagesPerDay: number | null;      // Limite de mensagens por dia (null = ilimitado)
    maxSessions: number | null;         // Máximo de sessões simultâneas (null = ilimitado)
    maxTokensPerMessage: number | null; // Máximo de tokens por mensagem (null = ilimitado)
    allowedProviders: string[] | null;  // Provedores permitidos (null = todos)
    allowedModels: string[] | null;     // Modelos permitidos (null = todos)
    teamSeats: number | null;           // Assentos da equipe (null = sem equipe)
  };
  features: string[];   // Lista de features para exibição
  highlight: boolean;   // Se deve ser destacado na página de preços
};

// ---------------------------------------------------------------------------
// Definição de todos os planos
// ---------------------------------------------------------------------------

export const PLANS: Record<PlanId, PlanTier> = {
  // --- Plano Gratuito ---
  free: {
    id: "free",
    name: "Free",
    description: "Para começar com IA no terminal",
    priceUsd: 0,
    polarProductIdEnv: "POLAR_FREE_PRODUCT_ID",
    limits: {
      messagesPerDay: 20,        // 20 mensagens por dia
      maxSessions: 2,            // 2 sessões simultâneas
      maxTokensPerMessage: 100_000, // 100k tokens por mensagem
      allowedProviders: ["anthropic", "google", "ollama"], // Só estes provedores
      allowedModels: ["claude-haiku-4-5", "gemini-2.5-flash", "ollama"], // Só estes modelos
      teamSeats: 1,              // 1 assento (só o usuário)
    },
    features: [
      "20 mensagens/dia",
      "Claude Haiku, Gemini Flash, Ollama",
      "2 sessões simultâneas",
      "Suporte via GitHub Issues",
      "BYOK disponível",
    ],
    highlight: false,
  },

  // --- Plano Profissional ---
  pro: {
    id: "pro",
    name: "Pro",
    description: "Para uso profissional ilimitado",
    priceUsd: 20,               // $20/mês
    polarProductIdEnv: "POLAR_PRO_PRODUCT_ID",
    limits: {
      messagesPerDay: null,       // Ilimitado
      maxSessions: null,          // Ilimitado
      maxTokensPerMessage: 500_000, // 500k tokens por mensagem
      allowedProviders: null,     // Todos os provedores
      allowedModels: null,        // Todos os modelos
      teamSeats: 1,
    },
    features: [
      "Mensagens ilimitadas",
      "Todos os modelos (Opus, GPT-5, Gemini Pro)",
      "Sessões ilimitadas",
      "Suporte prioritário",
      "BYOK incluso",
      "Fila prioritária",
    ],
    highlight: true, // Destacado na página de preços (mais popular)
  },

  // --- Plano Empresarial ---
  enterprise: {
    id: "enterprise",
    name: "Enterprise",
    description: "Para equipes e organizações",
    priceUsd: 100,              // $100/mês
    polarProductIdEnv: "POLAR_ENTERPRISE_PRODUCT_ID",
    limits: {
      messagesPerDay: null,       // Ilimitado
      maxSessions: null,          // Ilimitado
      maxTokensPerMessage: null,  // Ilimitado
      allowedProviders: null,     // Todos
      allowedModels: null,        // Todos
      teamSeats: 10,             // 10 assentos de equipe
    },
    features: [
      "Tudo do Pro",
      "10 membros da equipe",
      "Workspaces organizacionais",
      "SSO / SAML",
      "Modelos customizados",
      "Suporte dedicado",
      "SLA garantido",
      "Onboarding assistido",
    ],
    highlight: false,
  },
};

// ---------------------------------------------------------------------------
// Funções auxiliares para trabalhar com planos
// ---------------------------------------------------------------------------

// Busca um plano pelo ID. Se não encontrar, retorna o plano free como fallback
export function getPlan(planId: string): PlanTier {
  const plan = PLANS[planId as PlanId];
  if (!plan) return PLANS.free;
  return plan;
}

// Busca um plano pelo preço. Usado para mapear webhook do Polar.sh
export function getPlanByPrice(priceUsd: number): PlanTier {
  return Object.values(PLANS).find((p) => p.priceUsd === priceUsd) ?? PLANS.free;
}

// Verifica se um modelo específico é permitido no plano informado
// Se allowedModels for null, todos os modelos são permitidos
export function isModelAllowed(planId: PlanId, modelId: string): boolean {
  const plan = getPlan(planId);
  if (!plan.limits.allowedModels) return true; // Sem restrição
  return plan.limits.allowedModels.includes(modelId);
}

// Verifica se um provedor específico é permitido no plano informado
export function isProviderAllowed(planId: PlanId, provider: string): boolean {
  const plan = getPlan(planId);
  if (!plan.limits.allowedProviders) return true; // Sem restrição
  return plan.limits.allowedProviders.includes(provider);
}

// Calcula quantas mensagens restam no dia para o usuário
// Retorna -1 se o plano tem mensagens ilimitadas
export function getRemainingMessages(messagesToday: number, planId: PlanId): number {
  const plan = getPlan(planId);
  if (plan.limits.messagesPerDay === null) return -1; // Ilimitado
  return Math.max(0, plan.limits.messagesPerDay - messagesToday);
}

// Ordem dos planos para exibição (do menor ao maior)
export const PLAN_ORDER: PlanId[] = ["free", "pro", "enterprise"];
