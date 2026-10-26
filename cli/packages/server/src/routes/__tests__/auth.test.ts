import { expect, test, describe, beforeAll } from "bun:test";
import { createHmac } from "node:crypto";
import { Hono } from "hono";

// O servidor verifica o state com o client secret do OAuth; define antes de
// importar a rota para que o config carregue o mesmo valor.
process.env.CLERK_OAUTH_CLIENT_SECRET = "test-oauth-secret";

function signState(payload: string) {
  return createHmac("sha256", process.env.CLERK_OAUTH_CLIENT_SECRET!)
    .update(payload)
    .digest("base64url");
}

describe("Auth API", () => {
  let app: Hono;

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

  test("GET /auth/callback rejects an unsigned state", async () => {
    const payload = Buffer.from(JSON.stringify({ port: 3000 })).toString("base64url");
    const res = await app.request(`/auth/callback?code=test&state=${payload}.signature`);
    expect(res.status).toBe(400);
  });

  test("GET /auth/callback redirects with valid state", async () => {
    const payload = Buffer.from(JSON.stringify({ port: 3000 })).toString("base64url");
    const state = `${payload}.${signState(payload)}`;
    const res = await app.request(`/auth/callback?code=test&state=${state}`);
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toContain("localhost:3000/callback");
  });

  test("GET /auth/callback rejects an out-of-range port", async () => {
    const payload = Buffer.from(JSON.stringify({ port: 99999 })).toString("base64url");
    const state = `${payload}.${signState(payload)}`;
    const res = await app.request(`/auth/callback?code=test&state=${state}`);
    expect(res.status).toBe(400);
  });
});
