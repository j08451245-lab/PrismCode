import { describe, expect, test } from "bun:test";

describe("CLI config", () => {
  test("config has API URL defaults", async () => {
    const { config } = await import("./config");
    expect(config.apiUrl).toBeDefined();
    expect(typeof config.apiUrl).toBe("string");
  });

  test("apiClient is defined", async () => {
    const { apiClient } = await import("./api-client");
    expect(apiClient).toBeDefined();
  });

  test("auth utilities exist", async () => {
    const auth = await import("./auth");
    expect(auth.getAuth).toBeDefined();
    expect(auth.clearAuth).toBeDefined();
    expect(auth.saveAuth).toBeDefined();
  });
});
