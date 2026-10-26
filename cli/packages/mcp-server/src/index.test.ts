import { describe, expect, test } from "bun:test";

describe("MCP server", () => {
  test("package exports are defined", async () => {
    const mod = await import("./index");
    expect(mod).toBeDefined();
  });
});
