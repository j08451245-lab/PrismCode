// =============================================================================
// Fluxo OAuth do CLI - PrismCode
// Implementa o login OAuth PKCE (Proof Key for Code Exchange) com o Clerk.
// Cria um servidor temporário para receber o callback, gera PKCE challenge,
// abre o navegador do usuário para autenticação, e salva o token.
// =============================================================================

import open from "open";           // Abre URLs no navegador padrão
import { saveAuth } from "./auth"; // Salva o token no disco
import { config } from "./config"; // Configuração do CLI

// Timeout do login: 5 minutos
const LOGIN_TIMEOUT_MS = 5 * 60 * 1000;

// Estado do OAuth: nonce para segurança e porta do servidor temporário
type OAuthState = {
  nonce: string;  // Valor aleatório para prevenir ataques CSRF
  port: number;   // Porta do servidor de callback
};

// Converte bytes/string para base64url (sem +, /, ou =)
function toBase64Url(input: Uint8Array | string) {
  return Buffer.from(input).toString("base64url");
}

// Cria um PKCE code challenge a partir do code verifier
// Usa SHA-256 para criptografar o verifier
async function createPkceChallenge(verifier: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return toBase64Url(new Uint8Array(digest));
}

// Codifica o estado do OAuth em base64url
function encodeState(state: OAuthState) {
  return toBase64Url(JSON.stringify(state));
}

// Decodifica o estado do OAuth de base64url
function decodeState(state: string) {
  const [encoded] = state.split(".");
  if (!encoded) {
    throw new Error("Invalid state");
  }
  return JSON.parse(Buffer.from(encoded, "base64url").toString()) as OAuthState;
}

// Extrai mensagem de erro de qualquer tipo
function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

// ---------------------------------------------------------------------------
// Função principal: realiza o fluxo de login OAuth
// 1. Cria servidor temporário na porta aleatória
// 2. Gera PKCE code verifier e challenge
// 3. Monta URL de autorização com state (porta + nonce)
// 4. Abre navegador do usuário
// 5. Espera callback com código de autorização
// 6. Troca código por token de acesso
// 7. Salva token no disco
// ---------------------------------------------------------------------------

export async function performLogin() {
  const clerkFrontendDomain = process.env.CLERK_FRONTEND_DOMAIN;
  const clientId = process.env.CLERK_OAUTH_CLIENT_ID;
  const apiUrl = config.apiUrl;

  // Valida variáveis de ambiente obrigatórias
  if (!clerkFrontendDomain) throw new Error("CLERK_FRONTEND_DOMAIN not set");
  if (!clientId) throw new Error("CLERK_OAUTH_CLIENT_ID not set");

  const clerkApiBase = `https://${clerkFrontendDomain}`;

  // Gera nonce e PKCE challenge para segurança
  const nonce = crypto.randomUUID();
  const codeVerifier = toBase64Url(crypto.getRandomValues(new Uint8Array(32)));
  const codeChallenge = await createPkceChallenge(codeVerifier);

  let settled = false; // Flag para evitar respostas duplas

  return new Promise<{ token: string }>((resolve, reject) => {
    // Cria servidor temporário para receber o callback do OAuth
    const server = Bun.serve({
      port: 0, // Porta aleatória
      async fetch(req: any) {
        const url = new URL(req.url);

        // Só aceita rotas /callback
        if (url.pathname !== "/callback") {
          return new Response("Not found", { status: 404 });
        }

        // Verifica se houve erro no OAuth
        const error = url.searchParams.get("error");
        if (error) {
          const msg = url.searchParams.get("error_description") ?? error;
          settled = true;
          reject(new Error(msg));
          setTimeout(() => server.stop(), 500);
          return new Response(`Authentication failed: ${msg}`, { status: 400 });
        }

        // Extrai código e state da query string
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");

        if (!code || !state) {
          settled = true;
          reject(new Error("Missing code or state"));
          setTimeout(() => server.stop(), 500);
          return new Response("Bad request", { status: 400 });
        }

        // Verifica o nonce no state (previne CSRF)
        try {
          const payload = decodeState(state);
          if (payload.nonce !== nonce) throw new Error("State mismatch");
        } catch (err) {
          settled = true;
          reject(err);
          setTimeout(() => server.stop(), 500);
          return new Response("Invalid state", { status: 400 });
        }

        try {
          // Troca o código de autorização por tokens
          const redirectUri = `${apiUrl}/auth/callback`;

          const tokenRes = await fetch(`${clerkApiBase}/oauth/token`, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              "Authorization": "Basic " + Buffer.from(`${clientId}:${process.env.CLERK_OAUTH_CLIENT_SECRET}`).toString("base64")
            },
            body: new URLSearchParams({
              grant_type: "authorization_code",
              code,
              redirect_uri: redirectUri,
              client_id: clientId,
              client_secret: process.env.CLERK_OAUTH_CLIENT_SECRET!,
              code_verifier: codeVerifier, // PKCE verifier
            }),
          });

          if (!tokenRes.ok) {
            const details = await tokenRes.text();
            throw new Error(details || "Failed to exchange authorization code");
          }

          const tokenData = (await tokenRes.json()) as { access_token: string };

          // Login bem-sucedido: salva token e resolve a promise
          settled = true;
          saveAuth({ token: tokenData.access_token });
          resolve({ token: tokenData.access_token });
          setTimeout(() => server.stop(), 500);
          return new Response("Authenticated! You can close this tab.");
        } catch (err) {
          settled = true;
          reject(err);
          const message = getErrorMessage(err);
          setTimeout(() => server.stop(), 500);
          return new Response(`Authentication failed: ${message}`, { status: 400 });
        }
      },
    });

    // Monta a porta e nonce no state
    const port = server.port;
    if (typeof port !== "number") {
      server.stop();
      reject(new Error("Failed to start callback server"));
      return;
    }

    const state = encodeState({ port, nonce });
    const redirectUri = `${apiUrl}/auth/callback`;

    // Monta a URL de autorização do Clerk
    const authorizeUrl = new URL(`${clerkApiBase}/oauth/authorize`);
    authorizeUrl.searchParams.set("response_type", "code");
    authorizeUrl.searchParams.set("client_id", clientId);
    authorizeUrl.searchParams.set("redirect_uri", redirectUri);
    authorizeUrl.searchParams.set("scope", "openid email profile");
    authorizeUrl.searchParams.set("state", state);
    authorizeUrl.searchParams.set("prompt", "login");
    authorizeUrl.searchParams.set("code_challenge", codeChallenge);
    authorizeUrl.searchParams.set("code_challenge_method", "S256");

    // Abre o navegador do usuário na URL de autorização
    void open(authorizeUrl.toString());

    // Timeout: se não autenticar em 5 minutos, rejeita
    setTimeout(() => {
      if (!settled) {
        settled = true;
        server.stop();
        reject(new Error("Login timed out"));
      }
    }, LOGIN_TIMEOUT_MS)
  });
}
