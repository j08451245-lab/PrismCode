import { describe, it, expect } from "vitest";
import { getPlan, getPlanByPrice, isModelAllowed, isProviderAllowed, getRemainingMessages, PLANS } from "../plans";

describe("PLANS", () => {
  it("free plan has correct defaults", () => {
    const free = PLANS.free;
    expect(free.priceUsd).toBe(0);
    expect(free.limits.messagesPerDay).toBe(20);
    expect(free.limits.maxSessions).toBe(2);
    expect(free.features).toContain("20 mensagens/dia");
  });

  it("pro plan has no per-day limit", () => {
    const pro = PLANS.pro;
    expect(pro.priceUsd).toBe(20);
    expect(pro.limits.messagesPerDay).toBeNull();
    expect(pro.limits.maxSessions).toBeNull();
    expect(pro.highlight).toBe(true);
  });

  it("enterprise plan has team seats", () => {
    const enterprise = PLANS.enterprise;
    expect(enterprise.priceUsd).toBe(100);
    expect(enterprise.limits.teamSeats).toBe(10);
  });
});

describe("getPlan", () => {
  it("returns free plan for unknown id", () => {
    expect(getPlan("invalid").id).toBe("free");
  });

  it("returns correct plan for valid ids", () => {
    expect(getPlan("pro").id).toBe("pro");
    expect(getPlan("enterprise").id).toBe("enterprise");
  });
});

describe("getPlanByPrice", () => {
  it("finds plan by price", () => {
    expect(getPlanByPrice(0).id).toBe("free");
    expect(getPlanByPrice(20).id).toBe("pro");
    expect(getPlanByPrice(100).id).toBe("enterprise");
  });

  it("returns free for unknown price", () => {
    expect(getPlanByPrice(999).id).toBe("free");
  });
});

describe("isModelAllowed", () => {
  it("allows any model for pro/enterprise", () => {
    expect(isModelAllowed("pro", "any-model")).toBe(true);
    expect(isModelAllowed("enterprise", "any-model")).toBe(true);
  });

  it("restricts models for free plan", () => {
    expect(isModelAllowed("free", "claude-haiku-4-5")).toBe(true);
    expect(isModelAllowed("free", "claude-sonnet-4-6")).toBe(false);
  });
});

describe("isProviderAllowed", () => {
  it("allows any provider for pro/enterprise", () => {
    expect(isProviderAllowed("pro", "openai")).toBe(true);
    expect(isProviderAllowed("enterprise", "openai")).toBe(true);
  });

  it("restricts providers for free plan", () => {
    expect(isProviderAllowed("free", "anthropic")).toBe(true);
    expect(isProviderAllowed("free", "openai")).toBe(false);
  });
});

describe("getRemainingMessages", () => {
  it("returns -1 for unlimited plans", () => {
    expect(getRemainingMessages(100, "pro")).toBe(-1);
    expect(getRemainingMessages(100, "enterprise")).toBe(-1);
  });

  it("calculates remaining for free plan", () => {
    expect(getRemainingMessages(0, "free")).toBe(20);
    expect(getRemainingMessages(15, "free")).toBe(5);
    expect(getRemainingMessages(20, "free")).toBe(0);
    expect(getRemainingMessages(50, "free")).toBe(0);
  });
});
