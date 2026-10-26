// =============================================================================
// Configuração do PrismCode - PrismCode
// Gerencia o arquivo prismcode.json (config do projeto) e a config global
// (~/.prismcode/config.json). Define o schema de configuração válido,
// valores padrão, e funções para ler/salvar configurações.
// =============================================================================

import { readFileSync, writeFileSync, mkdirSync } from "node:fs"; // Operações de arquivo do Node.js
import { join } from "node:path";  // Junta partes de caminho de arquivo
import { homedir } from "node:os"; // Obtém o diretório home do usuário
import { z } from "zod";           // Biblioteca de validação de schemas
import { Mode } from "./schemas";  // Modos de operação (BUILD, PLAN)

// ---------------------------------------------------------------------------
// Schema de configuração do PrismCode (validado com Zod)
// Define todas as opções aceitas no arquivo prismcode.json
// ---------------------------------------------------------------------------

export const prismCodeConfigSchema = z.object({
  // Modelo de IA padrão (ex: "claude-sonnet-4-6")
  model: z.string().optional().describe("Default AI model ID"),

  // Modo padrão de operação (BUILD ou PLAN)
  mode: z.enum([Mode.BUILD, Mode.PLAN]).optional().describe("Default mode"),

  // Máximo de passos autônomos que o agente pode dar antes de pedir confirmação
  maxSteps: z.number().min(1).max(50).optional().default(10).describe("Max autonomous agent steps"),

  // Se deve pedir confirmação antes de executar ferramentas destrutivas
  toolConfirmation: z.boolean().optional().default(true).describe("Require confirmation for destructive tools"),

  // Se deve mostrar estimativa de custo antes de executar
  costEstimation: z.boolean().optional().default(true).describe("Show cost estimation before execution"),

  // Timeouts para operações perigosas
  timeout: z.object({
    bash: z.number().optional().default(30000),       // Timeout para comandos bash (30s)
    readFile: z.number().optional().default(10000),    // Timeout para leitura de arquivo (10s)
  }).optional(),

  // System prompt customizado que sobrescreve o padrão
  systemPrompt: z.string().optional().describe("Custom system prompt override"),

  // Chaves de API para cada provedor (BYOK - Bring Your Own Key)
  providers: z.object({
    anthropic: z.object({ apiKey: z.string().optional() }).optional(),
    openai: z.object({ apiKey: z.string().optional() }).optional(),
    google: z.object({ apiKey: z.string().optional() }).optional(),
    groq: z.object({ apiKey: z.string().optional() }).optional(),
    openrouter: z.object({ apiKey: z.string().optional() }).optional(),
    opencode: z.object({ apiKey: z.string().optional() }).optional(),
  }).optional(),

  // Servidores MCP (Model Context Protocol) para ferramentas extras
  mcpServers: z.array(z.object({
    name: z.string(),           // Nome do servidor MCP
    command: z.string(),        // Comando para iniciar o servidor
    args: z.array(z.string()).optional(),  // Argumentos do comando
    env: z.record(z.string(), z.string()).optional(), // Variáveis de ambiente
  })).optional(),

  // Padrões de ignorados (pastas/arquivos que o agente não deve acessar)
  ignore: z.array(z.string()).optional().default(["node_modules", ".git", "dist", "build", ".next"]),

  // URL do servidor API (para comunicação com o backend)
  apiUrl: z.string().optional().describe("API server URL"),

  // Aliases para model/mode (compatibilidade)
  defaultModel: z.string().optional().describe("Default AI model ID (alias for model)"),
  defaultMode: z.enum([Mode.BUILD, Mode.PLAN]).optional().describe("Default mode (alias for mode)"),

  // Configuração do Ollama (LLMs locais)
  ollama: z.object({
    apiKey: z.string().optional(),
    baseUrl: z.string().optional(),
    defaultModel: z.string().optional(),
  }).optional().describe("Ollama configuration"),

  // Chaves de API BYOK por provedor (chave alternativa ao providers)
  byok: z.record(z.string(), z.object({
    apiKey: z.string().optional(),
  })).optional().describe("BYOK API keys per provider"),
});

// Tipo TypeScript derivado do schema de configuração
export type PrismCodeConfig = z.infer<typeof prismCodeConfigSchema>;

// ---------------------------------------------------------------------------
// Configuração padrão usada quando não há prismcode.json ou valores faltando
// ---------------------------------------------------------------------------

export const DEFAULT_CONFIG: PrismCodeConfig = {
  maxSteps: 10,           // Máximo de 10 passos autônomos
  toolConfirmation: true, // Pedir confirmação para ferramentas destrutivas
  costEstimation: true,   // Mostrar estimativa de custo
  timeout: {
    bash: 30000,          // 30 segundos para comandos bash
    readFile: 10000,      // 10 segundos para leitura de arquivo
  },
  ignore: ["node_modules", ".git", "dist", "build", ".next", ".cache"], // Pastas ignoradas
};

// ---------------------------------------------------------------------------
// Função para obter chave de API BYOK de um provedor
// Tenta buscar primeiro da config local, depois de variáveis de ambiente
// Ex: process.env.ANTHROPIC_API_KEY, process.env.OPENAI_API_KEY
// ---------------------------------------------------------------------------

export function getByokKey(provider: string): string | undefined {
  try {
    // Tenta carregar a config do projeto atual
    const config = loadConfig(process.cwd());
    // Busca a chave do provedor na seção providers do config
    const providerConfig = config.providers?.[provider as keyof typeof config.providers];
    // Retorna a chave do config ou da variável de ambiente
    return providerConfig?.apiKey || process.env[`${provider.toUpperCase()}_API_KEY`];
  } catch {
    return undefined; // Se der erro, retorna undefined
  }
}

// Caminho do arquivo de configuração global (~/.prismcode/config.json)
export const GLOBAL_CONFIG_PATH = join(homedir(), ".prismcode", "config.json");

// ---------------------------------------------------------------------------
// Função para SALVAR a configuração global
// Cria o diretório ~/.prismcode se não existir e escreve o JSON
// ---------------------------------------------------------------------------

export function saveConfig(
  config: Partial<PrismCodeConfig> & Record<string, unknown>,
): void {
  const dir = join(homedir(), ".prismcode");
  mkdirSync(dir, { recursive: true }); // Cria diretório recursivamente
  writeFileSync(join(dir, "config.json"), JSON.stringify(config, null, 2)); // Salva com formatação
}

// ---------------------------------------------------------------------------
// Função para CARREGAR a configuração global
// Retorna objeto vazio se o arquivo não existir ou tiver erro
// ---------------------------------------------------------------------------

export function loadGlobalConfig(): Partial<PrismCodeConfig> {
  try {
    const raw = readFileSync(GLOBAL_CONFIG_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {}; // Arquivo não existe ou é inválido
  }
}

// ---------------------------------------------------------------------------
// Função para CARREGAR a configuração do projeto
// Lê prismcode.json do diretório de trabalho atual
// Valida com o schema e mescla com os valores padrão
// ---------------------------------------------------------------------------

export function loadConfig(cwd: string): PrismCodeConfig {
  try {
    // Monta o caminho para prismcode.json no diretório informado
    const path = join(cwd, "prismcode.json");
    const content = readFileSync(path, "utf-8");
    const parsed = JSON.parse(content);

    // Valida o JSON parseado contra o schema
    const result = prismCodeConfigSchema.safeParse(parsed);
    if (result.success) {
      // Se válido, mescla com defaults (defaults são usados para campos faltantes)
      return { ...DEFAULT_CONFIG, ...result.data };
    }
    // Se inválido, avisa e usa apenas defaults
    console.warn("prismcode.json has invalid config, using defaults:", result.error.message);
    return { ...DEFAULT_CONFIG };
  } catch {
    // Arquivo não existe ou não é JSON válido → usa defaults
    return { ...DEFAULT_CONFIG };
  }
}
