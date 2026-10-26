// =============================================================================
// Gerenciamento de planos e uso no banco de dados - PrismCode
// Funções para consultar e atualizar informações de plano e uso
// dos usuários no banco de dados Prisma.
// =============================================================================

import { db } from "@prismcode543/database/client";      // Cliente Prisma do banco
import { getPlan, getRemainingMessages, type PlanId } from "@prismcode543/shared";

// Tipo de resultado da consulta de plano do usuário
type PlanResult = {
  planId: PlanId;           // ID do plano atual
  planName: string;         // Nome legível do plano
  remainingMessages: number; // Mensagens restantes no dia
  isUnlimited: boolean;     // Se o plano tem mensagens ilimitadas
};

// ---------------------------------------------------------------------------
// Busca o plano atual do usuário e quantas mensagens restam no dia
// Se o usuário não existir, retorna plano free com 20 mensagens
// ---------------------------------------------------------------------------

export async function getUserPlan(userId: string): Promise<PlanResult> {
  // Busca o usuário pelo clerkId (ID do Clerk)
  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) {
    // Usuário novo: retorna plano free com 20 mensagens
    return { planId: "free", planName: "Free", remainingMessages: 20, isUnlimited: false };
  }

  // Busca os dados do plano na definição compartilhada
  const plan = getPlan(user.planId);

  // Calcula o início do dia atual (meia-noite)
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Busca o registro de uso de hoje
  const usage = await db.usageRecord.findFirst({
    where: { userId: user.id, date: { gte: today } },
  });

  // Calcula mensagens restantes
  const messagesToday = usage?.messages ?? 0;
  const remaining = getRemainingMessages(messagesToday, user.planId as PlanId);

  return {
    planId: user.planId as PlanId,
    planName: plan.name,
    remainingMessages: remaining,
    isUnlimited: plan.limits.messagesPerDay === null,
  };
}

// ---------------------------------------------------------------------------
// Registra uso de tokens e créditos para um usuário
// Chamado após cada mensagem processada pelo modelo
// ---------------------------------------------------------------------------

export async function trackUsage(
  userId: string,
  tokensIn: number,
  tokensOut: number,
  credits: number,
): Promise<void> {
  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) return;

  // Início do dia atual
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Busca registro de uso existente de hoje
  const existing = await db.usageRecord.findFirst({
    where: { userId: user.id, date: { gte: today } },
  });

  if (existing) {
    // Se já existe registro hoje, incrementa os contadores
    await db.usageRecord.update({
      where: { id: existing.id },
      data: {
        messages: { increment: 1 },
        tokensIn: { increment: tokensIn },
        tokensOut: { increment: tokensOut },
        credits: { increment: credits },
      },
    });
  } else {
    // Primeiro uso do dia: cria novo registro
    await db.usageRecord.create({
      data: {
        userId: user.id,
        date: today,
        messages: 1,
        tokensIn,
        tokensOut,
        credits,
      },
    });
  }
}

// ---------------------------------------------------------------------------
// Sincroniza dados do usuário do Clerk com o banco local
// Cria o usuário se não existir, atualiza email/nome se já existir
// ---------------------------------------------------------------------------

export async function syncUser(clerkId: string, email?: string, name?: string): Promise<void> {
  const existing = await db.user.findUnique({ where: { clerkId } });
  if (existing) {
    // Usuário existe: atualiza dados
    await db.user.update({
      where: { id: existing.id },
      data: { email, name },
    });
  } else {
    // Usuário novo: cria com plano free
    await db.user.create({
      data: { clerkId, email, name, planId: "free" },
    });
  }
}

// ---------------------------------------------------------------------------
// Garante que o usuário existe no banco
// Cria com plano free se não existir
// Retorna o ID interno e o plano
// ---------------------------------------------------------------------------

export async function ensureUser(clerkId: string): Promise<{ id: string; planId: string }> {
  let user = await db.user.findUnique({ where: { clerkId } });
  if (!user) {
    user = await db.user.create({
      data: { clerkId, planId: "free" },
    });
  }
  return { id: user.id, planId: user.planId };
}

// ---------------------------------------------------------------------------
// Retorna estatísticas de uso do usuário
// Inclui uso de hoje, totais históricos, e contagem de sessões
// ---------------------------------------------------------------------------

export async function getUsageStats(userId: string) {
  const user = await db.user.findUnique({ where: { clerkId: userId } });
  if (!user) return null;

  // Início do dia atual
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Busca dados em paralelo para performance
  const [todayUsage, totalUsage, sessionCount] = await Promise.all([
    db.usageRecord.findFirst({ where: { userId: user.id, date: { gte: today } } }),
    db.usageRecord.aggregate({ where: { userId: user.id }, _sum: { credits: true, tokensIn: true, tokensOut: true } }),
    db.session.count({ where: { userId: user.id } }),
  ]);

  return {
    planId: user.planId,
    messagesToday: todayUsage?.messages ?? 0,
    creditsUsed: totalUsage._sum.credits ?? 0,
    tokensInTotal: Number(totalUsage._sum.tokensIn ?? 0),
    tokensOutTotal: Number(totalUsage._sum.tokensOut ?? 0),
    sessionCount,
  };
}
