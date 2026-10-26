import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { TEST_CLERK_ID, createTestApp, ensureTestUser, cleanupTestUser } from "./test-utils";

let app: ReturnType<typeof createTestApp>;

beforeAll(async () => {
  await ensureTestUser();
  app = createTestApp();
  app.route("/billing", (await import("../billing")).default);
});

afterAll(async () => {
  await cleanupTestUser();
});

describe("Billing API", () => {
  test("GET /billing/plans returns all plans", async () => {
    const res = await app.request("/billing/plans");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.plans).toHaveLength(3);
    const freePlan = body.plans.find((p: { id: string }) => p.id === "free");
    expect(freePlan).toBeDefined();
    expect(freePlan.priceUsd).toBe(0);
  });

  test("GET /billing/plan returns user plan", async () => {
    const res = await app.request("/billing/plan");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.planId).toBe("pro");
    expect(body.planName).toBe("Pro");
    expect(body.isUnlimited).toBe(true);
  });

  test("POST /billing/checkout with free plan returns message", async () => {
    const res = await app.request("/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "free" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.url).toBeNull();
    expect(body.message).toContain("Free");
  });

  test("POST /billing/checkout with pro plan fails without Polar", async () => {
    const res = await app.request("/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "pro" }),
    });
    // Without POLAR_ACCESS_TOKEN, it should throw
    expect(res.status).toBe(500);
  });

  test("POST /billing/checkout with invalid plan returns 400", async () => {
    const res = await app.request("/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan: "invalid" }),
    });
    expect(res.status).toBe(400);
  });
});
