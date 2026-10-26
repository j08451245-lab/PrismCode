// =============================================================================
// Webhook do Polar.sh - PrismCode
// Recebe notificações do Polar quando o status de uma assinatura muda.
// Processa eventos como: assinatura ativa, criada, atualizada, cancelada,
// pagamento realizado, etc. Sincroniza com o banco de dados local.
// =============================================================================

import { Hono } from "hono";
import { validateEvent } from "@polar-sh/sdk/webhooks"; // Valida assinatura do webhook
import { syncSubscription, cancelSubscription } from "../lib/subscription";
import { logger } from "@prismcode543/shared";

const app = new Hono();

// POST /polar/webhook - Recebe notificações do Polar
app.post("/polar/webhook", async (c) => {
  // Verifica se o segredo do webhook está configurado
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) {
    return c.json({ error: "POLAR_WEBHOOK_SECRET not configured" }, 500);
  }

  // Lê o body como texto (para validação de assinatura)
  const body = await c.req.text();

  // Extrai todos os headers da requisição
  const headers: Record<string, string> = {};
  for (const [key, value] of c.req.raw.headers.entries()) {
    headers[key] = value;
  }

  // Valida a assinatura do webhook (HMAC) para garantir que veio do Polar
  let event: ReturnType<typeof validateEvent>;
  try {
    event = validateEvent(body, headers, secret);
  } catch {
    return c.json({ error: "Invalid webhook signature" }, 401);
  }

  // Processa o evento baseado no tipo
  try {
    switch (event.type) {
      // Eventos de assinatura: sincroniza com o banco
      case "subscription.active":
      case "subscription.created":
      case "subscription.updated":
      case "subscription.past_due":
      case "subscription.uncanceled": {
        const sub = event.data;
        await syncSubscription({
          polarSubscriptionId: sub.id,
          customerExternalId: sub.customer.externalId || sub.customer.id,
          productId: sub.product.id,
          status: sub.status,
          currentPeriodStart: sub.currentPeriodStart.toISOString(),
          currentPeriodEnd: sub.currentPeriodEnd.toISOString(),
          cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
        });
        break;
      }

      // Eventos de cancelamento: reverte para plano free
      case "subscription.canceled":
      case "subscription.revoked": {
        const sub = event.data;
        await cancelSubscription(sub.customer.externalId || sub.customer.id);
        break;
      }

      // Pagamento realizado: sincroniza se tiver assinatura associada
      case "order.paid": {
        const order = event.data;
        const customerExternalId = order.customer.externalId || order.customer.id;
        if (order.subscription) {
          await syncSubscription({
            polarSubscriptionId: order.subscription.id,
            customerExternalId,
            productId: order.product?.id ?? "",
            status: "active",
            currentPeriodStart: order.subscription.currentPeriodStart.toISOString(),
            currentPeriodEnd: order.subscription.currentPeriodEnd.toISOString(),
            cancelAtPeriodEnd: order.subscription.cancelAtPeriodEnd,
          });
        }
        break;
      }

      default:
        // Eventos não tratados são logados em modo debug
        logger.debug(`Unhandled webhook event type: ${event.type}`);
    }
  } catch (error) {
    logger.error("Webhook handler error", error);
    return c.json({ error: "Webhook processing failed" }, 500);
  }

  return c.json({ ok: true }); // Polar espera 200 OK
});

export default app;
