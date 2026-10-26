// =============================================================================
// Configuração do servidor - PrismCode
// Centraliza todas as variáveis de ambiente e configurações do servidor.
// Lê de process.env e fornece valores padrão para desenvolvimento.
// =============================================================================

export const config = {
  // Porta do servidor (padrão: 3001)
  port: parseInt(process.env.PORT ?? "3001", 10),
  // URL pública da API (usada pelo CLI para fazer requisições)
  apiUrl: process.env.API_URL ?? "http://localhost:3001",
  // URL do frontend (usada para redirecionamentos OAuth)
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:3000",
  // Ambiente de execução (development/production)
  nodeEnv: process.env.NODE_ENV ?? "development",

  // Getter: retorna true se estiver em produção
  get isProduction() {
    return this.nodeEnv === "production";
  },

  // Getter: retorna true se a API não for localhost (cloud mode)
  get isCloud() {
    return this.apiUrl !== "http://localhost:3001";
  },

  // Configurações do Clerk (provedor de autenticação)
  clerk: {
    secretKey: process.env.CLERK_SECRET_KEY ?? "",           // Chave secreta do Clerk
    publishableKey: process.env.CLERK_PUBLISHABLE_KEY ?? "", // Chave pública
    frontendDomain: process.env.CLERK_FRONTEND_DOMAIN ?? "", // Domínio do Clerk
    oauthClientId: process.env.CLERK_OAUTH_CLIENT_ID ?? "",  // Client ID OAuth
    oauthClientSecret: process.env.CLERK_OAUTH_CLIENT_SECRET ?? "", // Client Secret
  },

  // Configuração do banco de dados
  database: {
    url: process.env.DATABASE_URL ?? "file:./prisma/prismcode.db", // URL de conexão
    // Detecta o provedor automaticamente: postgresql ou sqlite
    get provider() {
      return config.database.url.startsWith("postgres") ? "postgresql" : "sqlite";
    },
  },

  // Configurações do Polar.sh (processador de pagamentos)
  polar: {
    accessToken: process.env.POLAR_ACCESS_TOKEN,          // Token de acesso
    server: process.env.POLAR_SERVER ?? "sandbox",        // Ambiente: sandbox ou production
    creditsMeterId: process.env.POLAR_CREDITS_METER_ID,  // ID do medidor de créditos
    freeProductId: process.env.POLAR_FREE_PRODUCT_ID,     // ID do produto Free
    proProductId: process.env.POLAR_PRO_PRODUCT_ID,       // ID do produto Pro
  },
};
