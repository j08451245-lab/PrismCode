// =============================================================================
// Cliente API do CLI - PrismCode
// Cria um cliente HTTP tipado usando Hono RPC.
// Injeta automaticamente o token de autenticação em cada requisição.
// Limpa a autenticação se o servidor retornar 401.
// =============================================================================

import { hc } from "hono/client";         // Cliente RPC do Hono
import { clearAuth, getAuth } from "./auth"; // Funções de autenticação
import { config } from "./config";

// Cria o cliente API com fetch customizado para autenticação
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const apiClient: any = hc(
  config.apiUrl, // URL do servidor
  {
    // Fetch customizado: injeta token de auth em cada requisição
    fetch: async (
      input: Parameters<typeof fetch>[0],
      init?: Parameters<typeof fetch>[1]
    ) => {
      const headers = new Headers(init?.headers);
      const auth = getAuth(); // Busca token salvo

      // Se tiver token, adiciona header Authorization
      if (auth) {
        headers.set("Authorization", `Bearer ${auth.token}`);
      }

      const response = await fetch(input, { ...init, headers });

      // Se retornar 401 (Unauthorized), limpa a autenticação
      if (response.status === 401) {
        clearAuth();
      }

      return response;
    }
  }
);

