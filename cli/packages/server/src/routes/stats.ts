// =============================================================================
// Rota de estatísticas - PrismCode
// Retorna dados de uso e estatísticas do usuário para exibição
// no dashboard do CLI. Inclui totais, uso diário, e informações do plano.
// =============================================================================

import { Hono } from "hono";
import type { AuthenticatedEnv } from "../middleware/require-auth";
import { db } from "@prismcode543/database/client";
import { getUserPlan, getUsageStats } from "../lib/plans";

const app = new Hono<AuthenticatedEnv>();

// GET /stats - Retorna estatísticas completas do usuário
app.get("/stats", async (c) => {
  const clerkId = c.get("userId");

  // Busca o usuário no banco
  const user = await db.user.findUnique({ where: { clerkId } });
  if (!user) return c.json({ error: "User not found" }, 404);

  // Calcula início do dia atual
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Busca múltiplos dados em paralelo para performance
  const [totalSessions, todaySessions, plan, stats, usageRecords] = await Promise.all([
    db.session.count({ where: { userId: user.id } }),                    // Total de sessões
    db.session.count({ where: { userId: user.id, createdAt: { gte: todayStart } } }), // Sessões hoje
    getUserPlan(clerkId),        // Informações do plano
    getUsageStats(clerkId),      // Estatísticas de uso
    db.usageRecord.findMany({    // Últimos 90 dias de uso
      where: { userId: user.id },
      orderBy: { date: "desc" },
      take: 90,
    }),
  ]);

  // Calcula totais a partir dos registros de uso
  const totalCredits = usageRecords.reduce((sum, r) => sum + r.credits, 0);
  const totalTokensIn = usageRecords.reduce((sum, r) => sum + Number(r.tokensIn), 0);
  const totalTokensOut = usageRecords.reduce((sum, r) => sum + Number(r.tokensOut), 0);
  const totalMessages = usageRecords.reduce((sum, r) => sum + r.messages, 0);

  // Filtra uso dos últimos 7 dias para gráfico diário
  const daily = usageRecords
    .filter((r) => {
      const d = new Date(r.date);
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return d >= weekAgo;
    })
    .map((r) => ({
      date: r.date.toISOString(),
      messages: r.messages,
      credits: r.credits,
      tokensIn: Number(r.tokensIn),
      tokensOut: Number(r.tokensOut),
    }));

  return c.json({
    plan,           // Informações do plano
    stats,          // Estatísticas detalhadas
    totals: {       // Totais gerais
      sessions: totalSessions,
      sessionsToday: todaySessions,
      messages: totalMessages,
      credits: totalCredits,
      tokensIn: totalTokensIn,
      tokensOut: totalTokensOut,
    },
    daily: daily.reverse(), // Inverte para ordem cronológica
  });
});

export default app;
