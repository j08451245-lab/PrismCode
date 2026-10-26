import { describe, it, expect } from "vitest";
import { SUPPORTED_CHAT_MODELS, findSupportedChatModel } from "../models";

describe("SUPPORTED_CHAT_MODELS", () => {
  it("contains Anthropic models", () => {
    const models = SUPPORTED_CHAT_MODELS.filter((m) => m.provider === "anthropic");
    expect(models.length).toBeGreaterThan(0);
    expect(models.map((m) => m.id)).toContain("claude-sonnet-4-6");
  });

  it("contains OpenAI models", () => {
    const models = SUPPORTED_CHAT_MODELS.filter((m) => m.provider === "openai");
    expect(models.length).toBeGreaterThan(0);
    expect(models.map((m) => m.id)).toContain("gpt-5.4");
  });

  it("contains Google models", () => {
    const models = SUPPORTED_CHAT_MODELS.filter((m) => m.provider === "google");
    expect(models.length).toBeGreaterThan(0);
    expect(models.map((m) => m.id)).toContain("gemini-2.5-flash");
  });

  it("contains Groq models", () => {
    const models = SUPPORTED_CHAT_MODELS.filter((m) => m.provider === "groq");
    expect(models.length).toBeGreaterThan(0);
    expect(models.map((m) => m.id)).toContain("llama-3.3-70b-versatile");
  });

  it("contains OpenRouter", () => {
    const models = SUPPORTED_CHAT_MODELS.filter((m) => m.provider === "openrouter");
    expect(models.length).toBeGreaterThan(0);
  });

  it("all models have valid pricing", () => {
    for (const model of SUPPORTED_CHAT_MODELS) {
      expect(model.pricing.inputUsdPerMillionTokens).toBeGreaterThanOrEqual(0);
      expect(model.pricing.outputUsdPerMillionTokens).toBeGreaterThanOrEqual(0);
    }
  });

  it("no duplicate model IDs", () => {
    const ids = SUPPORTED_CHAT_MODELS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("findSupportedChatModel", () => {
  it("finds existing model", () => {
    const model = findSupportedChatModel("claude-sonnet-4-6");
    expect(model).not.toBeNull();
    expect(model?.provider).toBe("anthropic");
  });

  it("returns undefined for unknown model", () => {
    expect(findSupportedChatModel("nonexistent")).toBeUndefined();
  });
});
