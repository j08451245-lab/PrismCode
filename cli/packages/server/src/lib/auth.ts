// =============================================================================
// Autenticação OAuth via Clerk - PrismCode
// Fornece funções para autenticar requisições usando o Clerk.
// O Clerk é um provedor de autenticação que gerencia login, OAuth, JWT, etc.
// =============================================================================

import { createClerkClient } from "@clerk/backend"; // Cliente oficial do Clerk

// Cria o cliente Clerk se as chaves estiverem configuradas
// Retorna null se as chaves não estiverem presentes (modo local)
function getClerk() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY;
  if (!secretKey || !publishableKey) return null; // Sem chaves = sem auth
  return createClerkClient({ secretKey, publishableKey });
}

// ---------------------------------------------------------------------------
// Autentica uma requisição OAuth
// Verifica se o token (session_token ou oauth_token) é válido
// Retorna o userId se autenticado, null caso contrário
// ---------------------------------------------------------------------------

export async function authenticateOAuthRequest(request: Request) {
  const clerkClient = getClerk();
  if (!clerkClient) return null; // Clerk não configurado

  // Valida o token na requisição (aceita session_token ou oauth_token)
  const requestState = await clerkClient.authenticateRequest(request, {
    acceptsToken: ["session_token", "oauth_token"],
  });

  // Se não estiver autenticado, loga o motivo e retorna null
  if (!requestState.isAuthenticated) {
    console.error("Auth failed. Reason:", requestState.reason, "Message:", requestState.message);
    return null;
  }

  // Extrai os dados de autenticação do estado da requisição
  const auth = requestState.toAuth();

  // Verifica se há um userId no token
  if (!auth.userId) {
    console.error("Auth failed: no userId in token. Token type:", auth.tokenType);
    return null;
  }

  // Retorna o ID do usuário autenticado
  return { userId: auth.userId };
};
