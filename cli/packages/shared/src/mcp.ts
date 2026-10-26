// =============================================================================
// Cliente MCP (Model Context Protocol) - PrismCode
// Fornece funções para se comunicar com servidores MCP.
// MCP é um protocolo que permite adicionar ferramentas extras ao agente
// através de servidores externos (ex: banco de dados, APIs específicas).
// =============================================================================

import { homedir } from "node:os";     // Diretório home do usuário
import { join } from "node:path";      // Junta partes de caminho
import { readFileSync, existsSync } from "node:fs"; // Operações de arquivo
import { logger } from "./logger";     // Logger do projeto

// Tipo que representa um servidor MCP configurado
export type McpServer = {
  name: string; // Nome identificador do servidor
  url: string;  // URL do endpoint JSON-RPC do servidor
};

// Tipo que representa uma ferramenta disponível em um servidor MCP
export type McpTool = {
  name: string;              // Nome da ferramenta
  description: string;       // Descrição do que a ferramenta faz
  inputSchema: Record<string, unknown>; // Schema JSON do input da ferramenta
};

// Caminho do arquivo de configuração de servidores MCP
// Localizado em ~/.prismcode/mcp-servers.json
function getServersPath(): string {
  return join(homedir(), ".prismcode", "mcp-servers.json");
}

// ---------------------------------------------------------------------------
// Carrega a lista de servidores MCP do arquivo de configuração
// Retorna array vazio se o arquivo não existir ou tiver erro
// ---------------------------------------------------------------------------

function loadMcpServers(): McpServer[] {
  try {
    const path = getServersPath();
    if (!existsSync(path)) return []; // Arquivo não existe
    const raw = readFileSync(path, "utf-8");
    return JSON.parse(raw) as McpServer[];
  } catch {
    return []; // Erro ao ler/parsear
  }
}

// Função pública para obter a lista de servidores MCP
export function getMcpServers(): McpServer[] {
  return loadMcpServers();
}

// ---------------------------------------------------------------------------
// Busca as ferramentas disponíveis em um servidor MCP
// Usa o método "tools/list" do protocolo JSON-RPC 2.0
// ---------------------------------------------------------------------------

export async function fetchMcpTools(server: McpServer): Promise<McpTool[]> {
  try {
    // Envia requisição POST com JSON-RPC para listar ferramentas
    const response = await fetch(server.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",    // Versão do protocolo JSON-RPC
        id: 1,             // ID da requisição
        method: "tools/list", // Método: listar ferramentas
        params: {},        // Sem parâmetros extras
      }),
    });

    // Se o servidor retornou erro HTTP, loga aviso e retorna vazio
    if (!response.ok) {
      logger.warn(`MCP server ${server.name} returned ${response.status}`);
      return [];
    }

    // Parseia a resposta e extrai a lista de ferramentas
    const data = (await response.json()) as { result?: { tools?: McpTool[] } };
    return data.result?.tools ?? []; // Retorna ferramentas ou array vazio
  } catch (error) {
    // Erro de conexão ou parse
    logger.warn(`Failed to fetch tools from MCP server ${server.name}:`, error);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Chama uma ferramenta específica em um servidor MCP
// Usa o método "tools/call" do protocolo JSON-RPC 2.0
// ---------------------------------------------------------------------------

export async function callMcpTool(
  server: McpServer,
  toolName: string,
  input: Record<string, unknown>,
): Promise<unknown> {
  // Envia requisição POST com JSON-RPC para chamar a ferramenta
  const response = await fetch(server.url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/call",      // Método: chamar ferramenta
      params: {
        name: toolName,          // Nome da ferramenta a chamar
        arguments: input,        // Argumentos de entrada
      },
    }),
  });

  // Se o servidor retornou erro HTTP, lança exceção
  if (!response.ok) {
    throw new Error(`MCP call failed: ${response.statusText}`);
  }

  // Parseia a resposta
  const data = (await response.json()) as { result?: unknown; error?: { message: string } };

  // Se o servidor retornou erro no JSON-RPC, lança exceção
  if (data.error) throw new Error(`MCP error: ${data.error.message}`);

  // Retorna o resultado da chamada
  return data.result;
}
