// =============================================================================
// Middleware de autenticação - PrismCode
// Verifica se a requisição tem um token OAuth válido do Clerk.
// Se autenticado, injeta o userId no contexto Hono para uso nas rotas.
// Se não, retorna 401 Unauthorized.
// =============================================================================

import { createMiddleware } from "hono/factory"; // Factory de middlewares do Hono
import { authenticateOAuthRequest } from "../lib/auth";

// Tipo do contexto Hono após autenticação
// Garante que c.get("userId") sempre retorna string
export type AuthenticatedEnv = {
  Variables: {
    userId: string; // ID do usuário autenticado (clerkId)
  };
};

// Middleware que exige autenticação
export const requireAuth = createMiddleware<AuthenticatedEnv>(async (c, next) => {
  try {
    // Tenta autenticar a requisição via Clerk
    const auth = await authenticateOAuthRequest(c.req.raw);
    if (!auth) {
      // Não autenticado: retorna 401 com instrução para logar
      return c.json({ error: "Unauthorized. Run /login to continue." }, 401);
    }

    // Injeta o userId no contexto para uso pelas rotas seguintes
    c.set("userId", auth.userId);
    await next(); // Continua para a próxima função/rota
  } catch {
    // Erro inesperado na autenticação: retorna 401
    return c.json({ error: "Unauthorized. Run /login to continue." }, 401);
  }
});

