import { expect, test, describe } from "bun:test";
import { calculateCreditsForUsage } from "./credits";

describe("calculateCreditsForUsage", () => {
  test("calculates credits for Claude Sonnet", () => {
    const result = calculateCreditsForUsage({
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      usage: { inputTokens: 1000, outputTokens: 500 },
    });
    expect(result.credits).toBeGreaterThan(0);
  });

  test("charges at least 1 credit for any non-zero usage", () => {
    const result = calculateCreditsForUsage({
      provider: "anthropic",
      model: "claude-haiku-4-5",
      usage: { inputTokens: 1, outputTokens: 1 },
    });
    expect(result.credits).toBe(1);
  });

  test("returns 0 credits for zero usage", () => {
    const result = calculateCreditsForUsage({
      provider: "anthropic",
      model: "claude-haiku-4-5",
      usage: { inputTokens: 0, outputTokens: 0 },
    });
    expect(result.credits).toBe(0);
  });

  test("throws for invalid token counts", () => {
    expect(() =>
      calculateCreditsForUsage({
        provider: "anthropic",
        model: "claude-haiku-4-5",
        usage: { inputTokens: -1, outputTokens: 0 },
      })
    ).toThrow();
  });

  test("throws for unknown model", () => {
    expect(() =>
      calculateCreditsForUsage({
        provider: "anthropic",
        model: "nonexistent-model",
        usage: { inputTokens: 100, outputTokens: 100 },
      })
    ).toThrow("Unsupported billing model");
  });

  test("throws for unknown provider", () => {
    expect(() =>
      calculateCreditsForUsage({
        provider: "unknown",
        model: "claude-haiku-4-5",
        usage: { inputTokens: 100, outputTokens: 100 },
      })
    ).toThrow("Unsupported billing provider");
  });

  test("GPT-5 usage costs more than Haiku", () => {
    const haiku = calculateCreditsForUsage({
      provider: "anthropic",
      model: "claude-haiku-4-5",
      usage: { inputTokens: 10000, outputTokens: 5000 },
    });
    const gpt5 = calculateCreditsForUsage({
      provider: "openai",
      model: "gpt-5.4",
      usage: { inputTokens: 10000, outputTokens: 5000 },
    });
    expect(gpt5.credits).toBeGreaterThan(haiku.credits);
  });
});
