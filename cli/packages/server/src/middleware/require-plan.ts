// =============================================================================
// Middleware de verificação de plano - PrismCode
// Verifica se o usuário tem um plano ativo e se ainda tem mensagens
// disponíveis no dia. Retorna 429 (Too Many Requests) se atingiu o limite.
// =============================================================================

import { createMiddleware } from "hono/factory";
import { getUserPlan, ensureUser } from "../lib/plans";

// Tipo do contexto Hono após verificação de plano
export type PlanEnv = {
  Variables: {
    userId: string;           // ID do usuário
    planId: string;           // ID do plano atual
    planName: string;         // Nome do plano
    remainingMessages: number; // Mensagens restantes no dia
  };
};

// Middleware que verifica plano e limite de mensagens
export const requirePlan = createMiddleware<PlanEnv>(async (c, next) => {
  const userId = c.get("userId");

  // Garante que o usuário existe no banco (cria se não existir)
  await ensureUser(userId);

  // Busca o plano e mensagens restantes
  const plan = await getUserPlan(userId);

  // Se o plano não é ilimitado e não tem mensagens restantes
  if (!plan.isUnlimited && plan.remainingMessages <= 0) {
    // Retorna 429 com link para upgrade
    return c.json({
      error: "Você atingiu o limite diário de mensagens do plano Free.",
      upgradeUrl: "/billing/checkout?plan=pro",
      remainingMessages: 0,
      planId: plan.planId,
    }, 429);
  }

  // Injeta dados do plano no contexto para uso pelas rotas
  c.set("planId", plan.planId);
  c.set("planName", plan.planName);
  c.set("remainingMessages", plan.remainingMessages);
  await next();
});
