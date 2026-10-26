// =============================================================================
// Gerenciador MCP (Model Context Protocol) - PrismCode
// Conecta a servidores MCP locais via stdio, descobre ferramentas
// disponíveis, e executa chamadas de ferramenta MCP.
// MCP permite adicionar ferramentas customizadas ao agente.
// =============================================================================

import { createMCPClient, type MCPClient } from "@ai-sdk/mcp"; // Cliente MCP
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio"; // Transporte via stdio
import type { PrismCodeConfig } from "@prismcode543/shared";

// Definição de uma ferramenta MCP
export type McpToolDefinition = {
  name: string;              // Nome da ferramenta
  description: string;       // Descrição
  inputSchema: Record<string, unknown>; // Schema do input
};

// Gerenciador de conexões MCP
export class McpManager {
  // Mapa de servidores: nome → cliente + ferramentas + executor
  private servers: Map<string, { client: MCPClient; executeTool: (name: string, args: unknown) => Promise<unknown>; definitions: McpToolDefinition[] }> = new Map();

  // Inicializa conexões com todos os servidores MCP configurados
  async init(config: PrismCodeConfig): Promise<void> {
    const serverConfigs = config.mcpServers ?? [];
    for (const cfg of serverConfigs) {
      try {
        // Cria transporte via stdio (comunicação por stdin/stdout)
        const transport = new Experimental_StdioMCPTransport({
          command: cfg.command,    // Comando para iniciar o servidor
          args: cfg.args ?? [],   // Argumentos do comando
          env: cfg.env as Record<string, string> | undefined, // Variáveis de ambiente
        });

        // Cria cliente MCP com o transporte
        const client = await createMCPClient({ transport });

        // Descobre as ferramentas disponíveis no servidor
        const toolSet = (await client.tools()) as Record<string, any>;
        const definitions: McpToolDefinition[] = [];
        const toolMap = new Map<string, (args: unknown) => Promise<unknown>>();

        // Registra cada ferramenta encontrada
        for (const [name, tool] of Object.entries(toolSet)) {
          definitions.push({
            name,
            description: tool.description ?? "",
            inputSchema: tool.parameters ?? tool.inputSchema ?? {},
          });
          if (typeof tool.execute === "function") {
            toolMap.set(name, (args: unknown) => tool.execute(args, { toolCallId: "", messages: [] }));
          }
        }

        // Salva o servidor no mapa
        this.servers.set(cfg.name, {
          client,
          executeTool: async (name: string, args: unknown) => {
            const fn = toolMap.get(name);
            if (!fn) throw new Error(`MCP tool "${name}" not found in server "${cfg.name}"`);
            return fn(args);
          },
          definitions,
        });
      } catch (err) {
        console.error(`Failed to connect MCP server "${cfg.name}":`, err);
      }
    }
  }

  // Retorna todas as definições de ferramentas de todos os servidores
  getDefinitions(): McpToolDefinition[] {
    const all: McpToolDefinition[] = [];
    for (const entry of this.servers.values()) {
      all.push(...entry.definitions);
    }
    return all;
  }

  // Verifica se um nome de ferramenta é MCP
  isMcpTool(name: string): boolean {
    for (const entry of this.servers.values()) {
      if (entry.definitions.some((d) => d.name === name)) return true;
    }
    return false;
  }

  // Executa uma ferramenta MCP em qualquer servidor que a tenha
  async executeTool(name: string, args: unknown): Promise<unknown> {
    for (const entry of this.servers.values()) {
      try {
        return await entry.executeTool(name, args);
      } catch {}
    }
    throw new Error(`MCP tool "${name}" not found in any connected server`);
  }

  // Fecha todas as conexões MCP
  async close(): Promise<void> {
    for (const entry of this.servers.values()) {
      try { await entry.client.close(); } catch {}
    }
    this.servers.clear();
  }
}
