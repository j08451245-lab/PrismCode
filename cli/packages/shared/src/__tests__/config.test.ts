import { describe, it, expect } from "vitest";
import { prismCodeConfigSchema } from "../config";

describe("prismCodeConfigSchema", () => {
  it("accepts empty config (all defaults)", () => {
    const result = prismCodeConfigSchema.parse({});
    expect(result.maxSteps).toBe(10);
    expect(result.toolConfirmation).toBe(true);
    expect(result.costEstimation).toBe(true);
    expect(result.ignore).toEqual(["node_modules", ".git", "dist", "build", ".next"]);
  });

  it("accepts valid model config", () => {
    const result = prismCodeConfigSchema.parse({ model: "gpt-4" });
    expect(result.model).toBe("gpt-4");
  });

  it("accepts valid mode", () => {
    const result = prismCodeConfigSchema.parse({ mode: "PLAN" });
    expect(result.mode).toBe("PLAN");
  });

  it("rejects invalid mode", () => {
    expect(() =>
      prismCodeConfigSchema.parse({ mode: "INVALID" })
    ).toThrow();
  });

  it("rejects maxSteps > 50", () => {
    expect(() => prismCodeConfigSchema.parse({ maxSteps: 100 })).toThrow();
  });

  it("rejects maxSteps < 1", () => {
    expect(() => prismCodeConfigSchema.parse({ maxSteps: 0 })).toThrow();
  });

  it("accepts provider configs", () => {
    const result = prismCodeConfigSchema.parse({
      providers: {
        anthropic: { apiKey: "sk-ant-xxx" },
        openai: { apiKey: "sk-xxx" },
      },
    });
    expect(result.providers?.anthropic?.apiKey).toBe("sk-ant-xxx");
    expect(result.providers?.openai?.apiKey).toBe("sk-xxx");
  });

  it("accepts mcpServers config", () => {
    const result = prismCodeConfigSchema.parse({
      mcpServers: [
        { name: "test", command: "node", args: ["server.js"] },
      ],
    });
    expect(result.mcpServers).toHaveLength(1);
    expect(result.mcpServers![0]!.name).toBe("test");
  });

  it("accepts custom timeout", () => {
    const result = prismCodeConfigSchema.parse({
      timeout: { bash: 60000, readFile: 5000 },
    });
    expect(result.timeout?.bash).toBe(60000);
    expect(result.timeout?.readFile).toBe(5000);
  });

  it("rejects non-object", () => {
    expect(() => prismCodeConfigSchema.parse("string")).toThrow();
  });
});
