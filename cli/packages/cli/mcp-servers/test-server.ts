import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "test-server",
  version: "1.0.0",
});

server.tool("get_date", "Returns the current date", {}, () => {
  return {
    content: [{ type: "text", text: new Date().toISOString().split("T")[0]! }],
  };
});

server.tool("get_time", "Returns the current time", {}, () => {
  return {
    content: [{ type: "text", text: new Date().toLocaleTimeString("pt-BR") }],
  };
});

server.tool("echo", "Echos back the message", { message: z.string() }, ({ message }) => {
  return {
    content: [{ type: "text", text: `Echo: ${message}` }],
  };
});

server.tool(
  "add",
  "Adds two numbers",
  { a: z.number(), b: z.number() },
  ({ a, b }) => ({
    content: [{ type: "text", text: String(a + b) }],
  }),
);

const transport = new StdioServerTransport();
await server.connect(transport);
