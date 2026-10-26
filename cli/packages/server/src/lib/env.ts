// =============================================================================
// Validação de variáveis de ambiente - PrismCode
// Usa Zod para validar que todas as variáveis de ambiente obrigatórias
// estão presentes e com formato correto. Roda na inicialização do servidor.
// Se faltar uma variável obrigatória, o servidor é encerrado com mensagem de erro.
// =============================================================================

import { z } from "zod";

// Schema que define quais variáveis são obrigatórias e opcionais
const envSchema = z.object({
  // URL de conexão com o banco de dados (obrigatória)
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  // URL pública da API
  API_URL: z.string().url().default("http://localhost:3001"),
  
  // Chaves de API dos provedores de IA (opcionais - pelo menos uma deve existir
  // para funcionar, mas são verificadas em runtime, não no schema)
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  GROQ_API_KEY: z.string().optional(),
  OPENROUTER_API_KEY: z.string().optional(),

  // Chaves do Clerk (autenticação) - obrigatórias
  CLERK_SECRET_KEY: z.string().min(1, "CLERK_SECRET_KEY is required"),
  CLERK_PUBLISHABLE_KEY: z.string().min(1, "CLERK_PUBLISHABLE_KEY is required"),
  
  // Chave secreta para JWT (tokens de sessão) - obrigatória
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
});

// ---------------------------------------------------------------------------
// Função de validação: roda na inicialização do servidor
// Se encontrar erros, exibe quais variáveis estão faltando e encerra o processo
// ---------------------------------------------------------------------------

export function validateEnv() {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    // Extrai e formata os erros de forma legível
    const errors = result.error.flatten().fieldErrors;
    console.error("\n❌ Invalid environment variables:");
    Object.entries(errors).forEach(([field, messages]) => {
      console.error(`  - ${field}: ${messages?.join(", ")}`);
    });
    console.error("\nPlease check your .env file.\n");
    process.exit(1); // Encerra o processo com código de erro
  }

  return result.data; // Retorna as variáveis validadas
}
