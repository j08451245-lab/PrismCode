// =============================================================================
// Gerenciador MCP (Model Context Protocol) - PrismCode
// Conecta a servidores MCP locais via stdio, descobre ferramentas
// disponíveis, e executa chamadas de ferramenta MCP.
// MCP permite adicionar ferramentas customizadas ao agente.
// =============================================================================

import { createMCPClient, type MCPClient } from "@ai-sdk/mcp"; // Cliente MCP
import { Experimental_StdioMCPTransport } from "@ai-sdk/mcp/mcp-stdio"; // Transporte via stdio
import type { ToolSet } from "ai";
import type { PrismCodeConfig } from "@prismcode543/shared";

// Definição de uma ferramenta MCP
export type McpToolDefinition = {
  name: string;              // Nome da ferramenta
  description: string;       // Descrição
  inputSchema: unknown;      // Schema do input
};

// Gerenciador de conexões MCP
export class McpManager {
  // Mapa de servidores: nome → cliente + ferramentas descobertas
  private servers: Map<string, { client: MCPClient; tools: Record<string, any> }> = new Map();

  // Inicializa conexões com todos os servidores MCP configurados
  async init(config: PrismCodeConfig): Promise<void> {
    for (const cfg of config.mcpServers ?? []) {
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
        const tools = await client.tools();

        this.servers.set(cfg.name, { client, tools });
      } catch (err) {
        console.error(`Failed to connect MCP server "${cfg.name}":`, err);
      }
    }
  }

  // Ferramentas no formato do AI SDK, sem execute: a execução passa pela
  // confirmação do usuário (onToolCall) antes de chamar o servidor MCP.
  getTools(): ToolSet {
    const tools: ToolSet = {};
    for (const entry of this.servers.values()) {
      for (const [name, tool] of Object.entries(entry.tools)) {
        tools[name] = {
          description: tool.description,
          inputSchema: tool.inputSchema,
        } as ToolSet[string];
      }
    }
    return tools;
  }

  // Retorna todas as definições de ferramentas de todos os servidores
  getDefinitions(): McpToolDefinition[] {
    const all: McpToolDefinition[] = [];
    for (const entry of this.servers.values()) {
      for (const [name, tool] of Object.entries(entry.tools)) {
        all.push({
          name,
          description: tool.description ?? "",
          inputSchema: tool.inputSchema,
        });
      }
    }
    return all;
  }

  // Verifica se um nome de ferramenta é MCP
  isMcpTool(name: string): boolean {
    for (const entry of this.servers.values()) {
      if (name in entry.tools) return true;
    }
    return false;
  }

  // Executa uma ferramenta MCP no servidor que a declarou
  async executeTool(name: string, args: unknown): Promise<unknown> {
    for (const entry of this.servers.values()) {
      if (!(name in entry.tools)) continue;
      return entry.client.callTool({
        name,
        arguments: (args ?? {}) as Record<string, unknown>,
      });
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
