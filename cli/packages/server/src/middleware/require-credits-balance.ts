// =============================================================================
// Middleware de verificação de saldo de créditos - PrismCode
// Verifica se o usuário tem créditos suficientes antes de processar
// uma requisição. Retorna 402 (Payment Required) se não tiver créditos.
// O plano Free não passa por aqui: ele é limitado por mensagens/dia.
// =============================================================================

import { createMiddleware } from "hono/factory";
import { db } from "@prismcode543/database/client";
import type { AuthenticatedEnv } from "./require-auth";
import { getAvailableCreditsBalance } from "../lib/polar";

// Middleware que verifica saldo de créditos no Polar
export const requireCreditsBalance = createMiddleware<AuthenticatedEnv>(async (c, next) => {
  const userId = c.get("userId");

  // Sem medidor configurado o saldo é infinito, mas o lookup do plano ainda
  // evita cobrar créditos de quem usa o allowance diário do Free.
  const user = await db.user.findUnique({
    where: { clerkId: userId },
    select: { planId: true },
  });
  if (!user || user.planId === "free") {
    await next();
    return;
  }

  let creditsBalance: number;
  try {
    // Busca o saldo de créditos do usuário no Polar
    creditsBalance = await getAvailableCreditsBalance(userId);
  } catch (error) {
    // Indisponibilidade do Polar não derruba o chat: os limites do plano
    // continuam valendo mesmo sem o medidor de créditos disponível.
    console.warn("Could not verify credits balance; continuing with plan limits", {
      error,
      userId,
    });
    await next();
    return;
  }

  // Portão simples de lançamento: só inicia trabalho se ainda tiver créditos
  // Não reserva o custo total da requisição, então apps de baixo volume
  // podem tolerar pequenos overspend em casos extremos
  if (creditsBalance <= 0) {
    return c.json({ error: "No credits remaining. Run /upgrade to buy more credits." }, 402);
  }

  await next(); // Créditos OK, continua
});
