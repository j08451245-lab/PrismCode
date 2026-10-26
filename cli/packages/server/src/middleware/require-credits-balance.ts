// =============================================================================
// Middleware de verificação de saldo de créditos - PrismCode
// Verifica se o usuário tem créditos suficientes antes de processar
// uma requisição. Retorna 402 (Payment Required) se não tiver créditos.
// =============================================================================

import { createMiddleware } from "hono/factory";
import type { AuthenticatedEnv } from "./require-auth";
import { getAvailableCreditsBalance } from "../lib/polar";

// Middleware que verifica saldo de créditos no Polar
export const requireCreditsBalance = createMiddleware<AuthenticatedEnv>(async (c, next) => {
  try {
    const userId = c.get("userId");

    // Busca o saldo de créditos do usuário no Polar
    const creditsBalance = await getAvailableCreditsBalance(userId);

    // Portão simples de lançamento: só inicia trabalho se ainda tiver créditos
    // Não reserva o custo total da requisição, então apps de baixo volume
    // podem tolerar pequenos overspend em casos extremos
    if (creditsBalance <= 0) {
      return c.json({ error: "No credits remaining. Run /upgrade to buy more credits." }, 402);
    }

    await next(); // Créditos OK, continua
  } catch {
    // Erro ao verificar saldo: permite a requisição (fail-open)
    return c.json({ error: "Unable to verify credits balance right now." }, 503);
  }
});
