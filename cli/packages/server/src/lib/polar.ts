// =============================================================================
// Integração com Polar.sh - PrismCode
// Polar.sh é o processador de pagamentos e gerenciamento de assinaturas.
// Este módulo fornece funções para criar checkout, portal do cliente,
// verificar saldo de créditos, e registrar uso de IA para cobrança.
// =============================================================================

import { Polar } from "@polar-sh/sdk"; // SDK oficial do Polar.sh

// Tipo do ambiente Polar: sandbox (testes) ou production (produção)
type PolarServer = "sandbox" | "production";

// Obtém o token de acesso do Polar das variáveis de ambiente
export function getPolarAccessToken() {
  return process.env.POLAR_ACCESS_TOKEN;
}

// Verifica se as credenciais do Polar estão configuradas
export function hasPolarCredentials() {
  return !!getPolarAccessToken();
}

// Obtém o ID do produto Polar com base no plano
export function getPolarProductId(planId?: string) {
  if (planId === "pro") return process.env.POLAR_PRO_PRODUCT_ID;
  if (planId === "enterprise") return process.env.POLAR_ENTERPRISE_PRODUCT_ID;
  return process.env.POLAR_PRODUCT_ID; // Produto padrão
}

// Obtém o ID do medidor de créditos do Polar
export function getPolarCreditsMeterId() {
  return process.env.POLAR_CREDITS_METER_ID;
}

// Obtém o ambiente Polar (sandbox ou production)
export function getPolarServer(): PolarServer {
  const server = process.env.POLAR_SERVER;
  if (!server) return "sandbox"; // Padrão: sandbox
  if (server !== "sandbox" && server !== "production") {
    throw new Error("POLAR_SERVER must be either 'sandbox' or 'production'");
  }
  return server;
}

// ---------------------------------------------------------------------------
// Instância singleton do cliente Polar
// Criada sob demanda na primeira chamada
// ---------------------------------------------------------------------------

let _polar: Polar | null = null;

function getPolar() {
  if (!_polar) {
    const token = getPolarAccessToken();
    if (!token) throw new Error("POLAR_ACCESS_TOKEN is not configured");
    _polar = new Polar({ accessToken: token, server: getPolarServer() });
  }
  return _polar;
}

// Type guard: verifica se um erro tem a propriedade statusCode
function hasStatusCode(error: unknown): error is { statusCode: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  );
}

// Parâmetros para criar URL de checkout
type CreateCheckoutUrlParams = {
  customerExternalId: string; // ID do usuário no sistema
  planId?: string;            // Plano a assinar
  requestUrl: string;         // URL da requisição (para montar successUrl)
};

// ---------------------------------------------------------------------------
// Cria URL de checkout para assinar um plano
// Redireciona o usuário para a página de pagamento do Polar
// ---------------------------------------------------------------------------

export async function createCheckoutUrl({
  customerExternalId,
  planId,
  requestUrl,
}: CreateCheckoutUrlParams) {
  const productId = getPolarProductId(planId);
  if (!productId) throw new Error(`No Polar product configured for plan: ${planId}`);

  // Cria o checkout no Polar
  const result = await getPolar().checkouts.create({
    products: [productId],
    successUrl: new URL("/billing/success", requestUrl).toString(), // URL de sucesso
    externalCustomerId: customerExternalId,
    metadata: { source: "PrismCode CLI" }, // Origem do checkout
  });

  return result.url; // URL para redirecionar o usuário
};

// ---------------------------------------------------------------------------
// Cria URL do portal do cliente
// Permite ao usuário gerenciar sua assinatura (cancelar, mudar plano, etc.)
// ---------------------------------------------------------------------------

export async function createCustomerPortalUrl({
  customerExternalId,
  requestUrl,
}: CreateCheckoutUrlParams) {
  const result = await getPolar().customerSessions.create({
    externalCustomerId: customerExternalId,
    returnUrl: new URL("/billing/success", requestUrl).toString(),
  });

  return result.customerPortalUrl;
};

// ---------------------------------------------------------------------------
// Verifica o saldo de créditos disponível do cliente
// Retorna Infinity se não houver medidor configurado (sem limite)
// Retorna 0 se o cliente não for encontrado (404)
// ---------------------------------------------------------------------------

export async function getAvailableCreditsBalance(customerExternalId: string) {
  const creditsMeterId = getPolarCreditsMeterId();

  // Se não tem medidor, retorna infinito (sem limite de créditos)
  if (!creditsMeterId) return Infinity;

  try {
    // Busca o estado do cliente no Polar
    const customerState = await getPolar().customers.getStateExternal({
      externalId: customerExternalId,
    });

    // Filtra os medidores ativos para encontrar o de créditos
    const matchingMeters = customerState.activeMeters.filter(
      (meter) => meter.meterId === creditsMeterId,
    );

    // Deve haver exatamente um medidor de créditos
    if (matchingMeters.length > 1) {
      throw new Error("Expected exactly one matching Polar credits meter");
    }

    const creditsMeter = matchingMeters[0];
    return creditsMeter?.balance ?? 0; // Retorna saldo ou 0
  } catch (error) {
    // Se o cliente não foi encontrado (404), retorna 0
    if (hasStatusCode(error) && error.statusCode === 404) return 0;
    throw error; // Outros erros são propagados
  }
};

// Parâmetros para registrar uso de IA
type IngestAiUsageParams = {
  externalCustomerId: string; // ID do usuário
  eventId: string;           // ID único do evento (para evitar duplicatas)
  credits: number;           // Quantidade de créditos a cobrar
};

// ---------------------------------------------------------------------------
// Registra uso de IA no Polar para cobrança
// Envia um evento "PrismCode_usage" com a quantidade de créditos
// O Polar desconta automaticamente do saldo do cliente
// ---------------------------------------------------------------------------

export async function ingestAiUsage({
  externalCustomerId,
  eventId,
  credits
}: IngestAiUsageParams) {
  if (credits <= 0) return; // Não registra uso zero

  await getPolar().events.ingest({
    events: [
      {
        name: "PrismCode_usage",     // Nome do evento
        externalId: eventId,          // ID único (evita duplicatas)
        externalCustomerId,           // ID do cliente
        metadata: { credits },        // Dados extras
      },
    ],
  });
};
