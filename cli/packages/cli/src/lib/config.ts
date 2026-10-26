// =============================================================================
// Configuração do CLI - PrismCode
// Define a URL da API e detecta se está rodando em cloud ou local.
// =============================================================================

import { loadGlobalConfig } from "@prismcode543/shared";

export const config = {
  // URL da API: verifica PRISMCODE_API_URL, depois global config, depois API_URL
  get apiUrl() {
    const globalConfig = loadGlobalConfig();
    return process.env.PRISMCODE_API_URL
      ?? globalConfig.apiUrl
      ?? process.env.API_URL
      ?? "http://localhost:3001";
  },

  // Retorna true se a API NÃO é localhost (modo cloud)
  get isCloud() {
    return !this.apiUrl.includes("localhost") && !this.apiUrl.includes("127.0.0.1");
  },

  // Retorna true se a API É localhost (modo desenvolvimento)
  get isDev() {
    return this.apiUrl.includes("localhost") || this.apiUrl.includes("127.0.0.1");
  },
};
