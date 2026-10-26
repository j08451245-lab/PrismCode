// =============================================================================
// Schemas de modos e ferramentas - PrismCode
// Define os modos de operação do agente IA e os schemas de entrada
// para todas as ferramentas que o agente pode usar.
// =============================================================================

import { z } from "zod"; // Biblioteca de validação de schemas
import { tool } from "ai"; // Função tool da Vercel AI SDK para definir ferramentas

// ---------------------------------------------------------------------------
// Modos de operação do agente
// Cada modo define quais ferramentas o agente tem acesso
// ---------------------------------------------------------------------------
export const Mode = {
  BUILD: "BUILD",   // Modo de construção: pode editar arquivos, rodar comandos
  PLAN: "PLAN",     // Modo de planejamento: só leitura, sem modificação
  ASK: "ASK",       // Modo de pergunta: só leitura, foco em responder
  DEBUG: "DEBUG",   // Modo de debug: leitura + execução de comandos
  REVIEW: "REVIEW", // Modo de revisão: só leitura, foco em analisar código
} as const;

// Schema Zod que valida se um valor é um dos modos válidos
export const modeSchema = z.enum([Mode.BUILD, Mode.PLAN, Mode.ASK, Mode.DEBUG, Mode.REVIEW]);

// Tipo TypeScript derivado do enum Mode - permite usar os valores como tipo
export type ModeType = (typeof Mode)[keyof typeof Mode];

// ---------------------------------------------------------------------------
// Schemas de entrada para cada ferramenta (validação com Zod)
// Cada ferramenta define quais parâmetros aceita e seus tipos
// ---------------------------------------------------------------------------

export const toolInputSchemas = {
  // Lê o conteúdo de um arquivo pelo caminho relativo ao projeto
  readFile: z.object({
    path: z.string().describe("Relative path to the file to read"),
  }),

  // Lista os arquivos/pastas dentro de um diretório
  listDirectory: z.object({
    path: z.string().default(".").describe("Relative directory path to list"),
  }),

  // Busca arquivos usando padrões glob (ex: "**/*.ts")
  glob: z.object({
    pattern: z.string().describe("Glob pattern to match files"),
    path: z.string().default(".").describe("Directory to search from"),
  }),

  // Busca conteúdo dentro de arquivos usando regex
  grep: z.object({
    pattern: z.string().describe("Regex pattern to search for"),
    path: z.string().default(".").describe("Directory to search from"),
    include: z.string().optional().describe("Optional glob for files to include"),
  }),

  // Cria ou sobrescreve um arquivo com o conteúdo fornecido
  writeFile: z.object({
    path: z.string().describe("Relative path to write"),
    content: z.string().describe("File contents"),
  }),

  // Substitui texto específico em um arquivo (busca e substitui)
  editFile: z.object({
    path: z.string().describe("Relative path to edit"),
    oldString: z.string().describe("Exact text to replace; must be unique"),
    newString: z.string().describe("Replacement text"),
  }),

  // Executa um comando no shell (bash/powershell)
  bash: z.object({
    command: z.string().describe("Shell command to run"),
    description: z.string().optional().describe("Short description of the command"),
    timeout: z.number().optional().describe("Timeout in milliseconds"),
  }),

  // Busca na web por informações atualizadas
  webSearch: z.object({
    query: z.string().describe("Web search query"),
    numResults: z.number().default(5).describe("Number of search results to return (max 10)"),
  }),

  // Mostra o status do repositório git (arquivos modificados, staged, etc.)
  gitStatus: z.object({}).describe("Show the working tree status"),

  // Mostra o histórico de commits do git
  gitLog: z.object({
    maxCount: z.number().default(10).describe("Maximum number of commits to show"),
  }),

  // Mostra diferenças (diff) de arquivos no git
  gitDiff: z.object({
    path: z.string().optional().describe("Optional file path to show diff for"),
    staged: z.boolean().default(false).describe("Show staged changes instead of unstaged"),
  }),

  // Cria um commit no git com mensagem
  gitCommit: z.object({
    message: z.string().describe("Commit message"),
    addAll: z.boolean().default(false).describe("Stage all changes before committing"),
  }),
} as const;

// ---------------------------------------------------------------------------
// Contratos de ferramentas somente leitura (para modos PLAN, ASK, REVIEW)
// Estas são as ferramentas que o agente pode usar SEM modificar nada
// ---------------------------------------------------------------------------

export const readOnlyToolContracts = {
  // Lê o conteúdo de um arquivo
  readFile: tool({
    description: "Read a file from the current project directory.",
    inputSchema: toolInputSchemas.readFile,
  }),

  // Lista entradas de um diretório
  listDirectory: tool({
    description: "List entries in a directory under the current project directory.",
    inputSchema: toolInputSchemas.listDirectory,
  }),

  // Busca arquivos por padrão glob
  glob: tool({
    description: "Find files matching a glob pattern under the current project directory.",
    inputSchema: toolInputSchemas.glob,
  }),

  // Busca conteúdo em arquivos com regex
  grep: tool({
    description:
      "Search file contents with a regular expression under the current project directory.",
    inputSchema: toolInputSchemas.grep,
  }),

  // Busca na web
  webSearch: tool({
    description: "Search the web for current information. Use this when you need up-to-date data, documentation, or answers to questions outside the local codebase.",
    inputSchema: toolInputSchemas.webSearch,
  }),

  // Mostra status do git
  gitStatus: tool({
    description: "Show the working tree status using git status --short.",
    inputSchema: toolInputSchemas.gitStatus,
  }),

  // Mostra histórico de commits
  gitLog: tool({
    description: "Show recent commit history using git log --oneline.",
    inputSchema: toolInputSchemas.gitLog,
  }),

  // Mostra diferenças no git
  gitDiff: tool({
    description: "Show changes in the working tree or staged changes using git diff.",
    inputSchema: toolInputSchemas.gitDiff,
  }),
} as const;

// ---------------------------------------------------------------------------
// Contratos de ferramentas de escrita (para modos BUILD e DEBUG)
// Estas incluem todas as ferramentas de leitura + ferramentas de modificação
// ---------------------------------------------------------------------------

export const buildToolContracts = {
  ...readOnlyToolContracts, // Herda todas as ferramentas de leitura

  // Cria ou sobrescreve um arquivo
  writeFile: tool({
    description: "Create or overwrite a file under the current project directory.",
    inputSchema: toolInputSchemas.writeFile,
  }),

  // Edita um arquivo substituindo texto específico
  editFile: tool({
    description: "Replace exact text in a file under the current project directory.",
    inputSchema: toolInputSchemas.editFile,
  }),

  // Executa comando no shell
  bash: tool({
    description: "Run a shell command in the current project directory.",
    inputSchema: toolInputSchemas.bash,
  }),

  // Busca na web
  webSearch: tool({
    description: "Search the web for current information. Use this when you need up-to-date data, documentation, or answers to questions outside the local codebase.",
    inputSchema: toolInputSchemas.webSearch,
  }),

  // Cria um commit no git
  gitCommit: tool({
    description: "Stage and commit changes to the git repository.",
    inputSchema: toolInputSchemas.gitCommit,
  }),
} as const;

// Tipo que representa todas as ferramentas de escrita disponíveis
export type ToolContracts = typeof buildToolContracts;

// ---------------------------------------------------------------------------
// Função que retorna as ferramentas disponíveis baseado no modo atual
// Modos de leitura (PLAN, ASK, REVIEW) → apenas ferramentas de leitura
// Modos de escrita (BUILD, DEBUG) → todas as ferramentas
// ---------------------------------------------------------------------------

export function getToolContracts(mode: ModeType) {
  if (mode === Mode.PLAN || mode === Mode.ASK || mode === Mode.REVIEW) {
    return readOnlyToolContracts;
  }
  return buildToolContracts;
};
