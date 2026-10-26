// =============================================================================
// Gerenciamento de assinaturas - PrismCode
// Sincroniza assinaturas do Polar.sh com o banco de dados local.
// Quando o status de uma assinatura muda (webhook), atualiza o plano
// do usuário e o registro de assinatura no banco.
// =============================================================================

import { db } from "@prismcode543/database/client";
import { logger } from "@prismcode543/shared";

// Mapeamento de IDs de produto Polar para IDs de plano interno
export type PlanMapping = {
  free: string | null;    // Free não tem produto Polar (é gratuito)
  pro: string;            // ID do produto Pro no Polar
  enterprise: string;     // ID do produto Enterprise no Polar
};

// Obtém o mapeamento de planos das variáveis de ambiente
function getPlanMapping(): PlanMapping {
  return {
    free: null,
    pro: process.env.POLAR_PRO_PRODUCT_ID || "",
    enterprise: process.env.POLAR_ENTERPRISE_PRODUCT_ID || "",
  };
}

// Resolve qual plano interno corresponde a um produto Polar
export function resolvePlanFromProduct(productId: string): string {
  const mapping = getPlanMapping();
  if (productId === mapping.pro) return "pro";
  if (productId === mapping.enterprise) return "enterprise";
  return "free"; // Default se não encontrar
}

// Parâmetros para sincronizar uma assinatura
export type SyncSubscriptionParams = {
  polarSubscriptionId: string;     // ID da assinatura no Polar
  customerExternalId: string;      // ID do usuário (clerkId)
  productId: string;               // ID do produto no Polar
  status: string;                  // Status da assinatura (active, canceled, etc.)
  currentPeriodStart: string;      // Início do período atual
  currentPeriodEnd: string;        // Fim do período atual
  cancelAtPeriodEnd: boolean;      // Se será cancelada ao fim do período
};

// ---------------------------------------------------------------------------
// Sincroniza uma assinatura do Polar com o banco local
// Chamada pelo webhook quando o status da assinatura muda
// ---------------------------------------------------------------------------

export async function syncSubscription(params: SyncSubscriptionParams) {
  // Resolve o plano interno a partir do produto Polar
  const planId = resolvePlanFromProduct(params.productId);

  // Busca o usuário pelo clerkId
  const user = await db.user.findUnique({ where: { clerkId: params.customerExternalId } });
  if (!user) {
    logger.warn(`Webhook: user not found for externalId ${params.customerExternalId}`);
    return;
  }

  // Atualiza o plano do usuário
  await db.user.update({
    where: { id: user.id },
    data: { planId },
  });

  // Busca se já existe um registro de assinatura
  const existing = await db.subscription.findUnique({ where: { userId: user.id } });

  // Dados da assinatura para salvar
  const subData = {
    planId,
    polarSubscriptionId: params.polarSubscriptionId,
    status: params.status,
    currentPeriodStart: new Date(params.currentPeriodStart),
    currentPeriodEnd: new Date(params.currentPeriodEnd),
    cancelAtPeriodEnd: params.cancelAtPeriodEnd,
  };

  if (existing) {
    // Atualiza assinatura existente
    await db.subscription.update({ where: { id: existing.id }, data: subData });
  } else {
    // Cria nova assinatura
    await db.subscription.create({ data: { userId: user.id, ...subData } });
  }

  logger.info(`Subscription synced for user ${params.customerExternalId}: ${planId} (${params.status})`);
}

// ---------------------------------------------------------------------------
// Cancela a assinatura de um usuário
// Reverte o plano para free e marca a assinatura como canceled
// ---------------------------------------------------------------------------

export async function cancelSubscription(customerExternalId: string) {
  const user = await db.user.findUnique({ where: { clerkId: customerExternalId } });
  if (!user) return;

  // Reverte para plano free
  await db.user.update({
    where: { id: user.id },
    data: { planId: "free" },
  });

  // Marca todas as assinaturas como canceled
  await db.subscription.updateMany({
    where: { userId: user.id },
    data: { status: "canceled" },
  });

  logger.info(`Subscription canceled for user ${customerExternalId}`);
}
