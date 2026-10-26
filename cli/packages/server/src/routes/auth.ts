// =============================================================================
// Rota de callback OAuth - PrismCode
// Recebe o callback do OAuth após o usuário autenticar.
// Redireciona o código de autorização e state para a porta local
// do CLI, que completou o fluxo OAuth.
// =============================================================================

import { Hono } from "hono";
import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../config";

// Valida o state assinado pelo CLI com HMAC-SHA256.
// Formato: base64url(payload JSON).base64url(hmac)
// O segredo é o client secret do OAuth, conhecido pelo CLI e pelo servidor.
function parseState(state: string): { port: number } | null {
  const secret = config.clerk.oauthClientSecret;
  if (!secret) return null;

  const [payload, signature] = state.split(".");
  if (!payload || !signature) return null;

  const expected = createHmac("sha256", secret).update(payload).digest("base64url");
  const given = Buffer.from(signature, "base64url");
  const wanted = Buffer.from(expected, "base64url");
  if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null) return null;

  const port = (parsed as { port?: unknown }).port;
  if (typeof port !== "number" || !Number.isInteger(port) || port < 1 || port > 65535) {
    return null;
  }

  return { port };
}

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

  // O state é JSON (base64url) assinado com HMAC-SHA256; contém a porta do CLI
  const verified = parseState(state);
  if (!verified) {
    return c.text("Invalid authentication state", 400);
  }

  // Redireciona para o callback local do CLI na porta correta
  const redirectUrl = `http://localhost:${verified.port}/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;

  return c.redirect(redirectUrl);
});

export default app;
