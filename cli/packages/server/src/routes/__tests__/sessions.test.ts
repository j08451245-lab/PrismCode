import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { TEST_CLERK_ID, createTestApp, ensureTestUser, cleanupTestUser } from "./test-utils";

let app: ReturnType<typeof createTestApp>;

beforeAll(async () => {
  await ensureTestUser();
  app = createTestApp();
  app.route("/sessions", (await import("../sessions")).default);
  // Clean up any stale sessions from previous runs
  const { db } = await import("@prismcode543/database/client");
  await db.session.deleteMany({ where: { userId: TEST_CLERK_ID } });
});

afterAll(async () => {
  await cleanupTestUser();
});

describe("Sessions API", () => {
  test("GET /sessions returns empty list for new user", async () => {
    const res = await app.request("/sessions");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(0);
  });

  test("POST /sessions creates a session", async () => {
    const res = await app.request("/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Test Session" }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.title).toBe("Test Session");
    expect(body.id).toBeDefined();
  });

  test("GET /sessions returns created sessions", async () => {
    const res = await app.request("/sessions");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.length).toBeGreaterThanOrEqual(1);
    expect(body[0].title).toBe("Test Session");
  });

  test("GET /sessions/:id returns a specific session", async () => {
    const listRes = await app.request("/sessions");
    const sessions = await listRes.json();
    const sessionId = sessions[0].id;

    const res = await app.request(`/sessions/${sessionId}`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.id).toBe(sessionId);
    expect(body.title).toBe("Test Session");
  });

  test("GET /sessions/:id returns 404 for unknown session", async () => {
    const res = await app.request("/sessions/nonexistent-id");
    expect(res.status).toBe(404);
  });
});
