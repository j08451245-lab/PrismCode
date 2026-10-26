// =============================================================================
// Rota de callback OAuth - PrismCode
// Recebe o callback do OAuth após o usuário autenticar.
// Redireciona o código de autorização e state para a porta local
// do CLI, que completou o fluxo OAuth.
// =============================================================================

import { Hono } from "hono";

const app = new Hono().get("/callback", (c) => {
  // Extrai os parâmetros da query string
  const code = c.req.query("code");     // Código de autorização OAuth
  const state = c.req.query("state");   // State token (contém porta do CLI)
  const error = c.req.query("error");   // Erro retornado pelo provedor

  const errorDescription = c.req.query("error_description");

  // Se houve erro no OAuth, retorna erro
  if (error) {
    return c.text(errorDescription ?? error, 400);
  }

  // Valida que code e state estão presentes
  if (!code || !state) {
    return c.text("Missing authorization code or state", 400);
  }

  try {
    // O state é um JWT codificado em base64url que contém a porta do CLI
    const [encoded] = state.split(".");
    if (!encoded) throw new Error("Invalid state");

    // Decodifica o payload do state para obter a porta
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString());
    const port = payload.port;

    if (!port || typeof port !== "number") {
      throw new Error("Invalid port in state");
    }

    // Redireciona para o callback local do CLI na porta correta
    const redirectUrl = `http://localhost:${port}/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;

    return c.redirect(redirectUrl);
  } catch {
    return c.text("Invalid authentication state", 400);
  }
});

export default app;
