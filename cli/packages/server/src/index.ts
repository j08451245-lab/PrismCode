// =============================================================================
// Ponto de entrada do servidor - PrismCode
// Cria a aplicação Hono (framework HTTP minimalista), configura rotas,
// middleware de autenticação, e tratamento de erros globais.
// O servidor roda na porta 3001.
// =============================================================================

import { Hono } from "hono";               // Framework HTTP leve e rápido
import { HTTPException } from "hono/http-exception"; // Exceção HTTP padronizada

import { requireAuth } from "./middleware/require-auth"; // Middleware de autenticação
import sessions from "./routes/sessions";  // Rotas de sessões (CRUD)
import chat from "./routes/chat";          // Rotas de chat (envio de mensagens)
import auth from "./routes/auth";          // Rotas de autenticação (OAuth callback)
import billing from "./routes/billing";    // Rotas de billing (checkout, portal)

// ---------------------------------------------------------------------------
// Criação da aplicação Hono com configurações globais
// ---------------------------------------------------------------------------

const app = new Hono()
  // Handler global de erros: captura todas as exceções não tratadas
  .onError((error, c) => {
    // Se for uma HTTPException, retorna o status code e mensagem corretos
    if (error instanceof HTTPException) {
      return c.json({ 
        error: error.message || "Request failed",
      }, error.status);
    };

    // Para outros erros, loga no console e retorna 500
    console.error("Unhandled server error", error);
    return c.json({ error: "Internal server error" }, 500);
  })

  // Aplica middleware de autenticação em rotas protegidas
  .use("/sessions/*", requireAuth)    // Todas as rotas de sessões precisam de auth
  .use("/chat/*", requireAuth)        // Todas as rotas de chat precisam de auth
  .use("/billing/checkout", requireAuth) // Checkout precisa de auth
  .use("/billing/portal", requireAuth)   // Portal de billing precisa de auth

  // Registra sub-rotas sob seus respectivos prefixos
  .route("/auth", auth)         // /auth/* → callbacks OAuth
  .route("/billing", billing)   // /billing/* → planos, checkout, portal
  .route("/sessions", sessions) // /sessions/* → CRUD de sessões
  .route("/chat", chat);        // /chat/* → envio de mensagens ao modelo

// Tipo exportado para o cliente HTTP (usado pelo CLI para tipar requisições)
export type AppType = typeof app;

// Exporta o servidor Bun na porta 3001
// idleTimeout alto (255s) para evitar timeout em chamadas de ferramentas do LLM
export default { port: 3001, fetch: app.fetch, idleTimeout: 255 };
