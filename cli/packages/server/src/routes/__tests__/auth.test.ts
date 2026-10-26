import { expect, test, describe, beforeAll } from "bun:test";
import { Hono } from "hono";

describe("Auth API", () => {
  let app: ReturnType<typeof Hono>;

  beforeAll(async () => {
    app = new Hono();
    app.route("/auth", (await import("../auth")).default);
  });

  test("GET /auth/callback returns 400 without code", async () => {
    const res = await app.request("/auth/callback");
    expect(res.status).toBe(400);
  });

  test("GET /auth/callback returns 400 with invalid state", async () => {
    const res = await app.request("/auth/callback?code=test&state=invalid");
    expect(res.status).toBe(400);
  });

  test("GET /auth/callback redirects with valid state", async () => {
    const payload = Buffer.from(JSON.stringify({ port: 3000 })).toString("base64url");
    const state = `${payload}.signature`;
    const res = await app.request(`/auth/callback?code=test&state=${state}`);
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain("localhost:3000/callback");
  });
});
