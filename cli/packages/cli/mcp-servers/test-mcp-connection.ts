import { loadConfig } from "@prismcode543/shared";
import { McpManager } from "../src/lib/mcp-manager";

async function main() {
  const config = loadConfig(process.cwd());
  console.log("Config mcpServers:", JSON.stringify(config.mcpServers, null, 2));

  const manager = new McpManager();
  await manager.init(config);

  const defs = manager.getDefinitions();
  console.log("Discovered tools:", JSON.stringify(defs, null, 2));

  // Test execute a tool
  const result = await manager.executeTool("get_date", {});
  console.log("get_date result:", result);

  const result2 = await manager.executeTool("echo", { message: "hello mcp" });
  console.log("echo result:", result2);

  const result3 = await manager.executeTool("add", { a: 2, b: 3 });
  console.log("add result:", result3);

  await manager.close();
  console.log("MCP test passed!");
}

main().catch(console.error);
