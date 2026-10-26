import { expect, test, describe, beforeAll, afterAll } from "bun:test";
import { TEST_CLERK_ID, createTestApp, ensureTestUser, cleanupTestUser } from "./test-utils";

type SessionBody = { id: string; title: string };

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
    const body = (await res.json()) as SessionBody[];
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
    const body = (await res.json()) as SessionBody;
    expect(body.title).toBe("Test Session");
    expect(body.id).toBeDefined();
  });

  test("GET /sessions returns created sessions", async () => {
    const res = await app.request("/sessions");
    expect(res.status).toBe(200);
    const body = (await res.json()) as SessionBody[];
    expect(body.length).toBeGreaterThanOrEqual(1);
    expect(body[0]?.title).toBe("Test Session");
  });

  test("GET /sessions/:id returns a specific session", async () => {
    const listRes = await app.request("/sessions");
    const sessions = (await listRes.json()) as SessionBody[];
    const sessionId = sessions[0]!.id;

    const res = await app.request(`/sessions/${sessionId}`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as SessionBody;
    expect(body.id).toBe(sessionId);
    expect(body.title).toBe("Test Session");
  });

  test("GET /sessions/:id returns 404 for unknown session", async () => {
    const res = await app.request("/sessions/nonexistent-id");
    expect(res.status).toBe(404);
  });

  test("GET /sessions/search filters by message content", async () => {
    const { db } = await import("@prismcode543/database/client");
    const listRes = await app.request("/sessions");
    const sessions = (await listRes.json()) as SessionBody[];
    const sessionId = sessions[0]!.id;

    await db.session.update({
      where: { id: sessionId },
      data: {
        messages: [
          {
            id: "m1",
            role: "user",
            parts: [{ type: "text", text: "Please find the NEEDLE in this message" }],
          },
        ],
      },
    });

    const res = await app.request("/sessions/search?q=needle");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      sessionId: string;
      matchCount: number;
      matches: { preview: string }[];
    }[];
    expect(body).toHaveLength(1);
    expect(body[0]!.sessionId).toBe(sessionId);
    expect(body[0]!.matchCount).toBe(1);
    expect(body[0]!.matches[0]!.preview).toContain("NEEDLE");

    const emptyRes = await app.request("/sessions/search?q=absent-term");
    expect(emptyRes.status).toBe(200);
    expect((await emptyRes.json()) as unknown[]).toHaveLength(0);
  });

  test("DELETE /sessions/:id removes the session", async () => {
    const created = await app.request("/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "To Delete" }),
    });
    expect(created.status).toBe(201);
    const { id } = (await created.json()) as SessionBody;

    const deleted = await app.request(`/sessions/${id}`, { method: "DELETE" });
    expect(deleted.status).toBe(204);

    const res = await app.request(`/sessions/${id}`);
    expect(res.status).toBe(404);
  });

  test("DELETE /sessions/:id returns 404 for unknown session", async () => {
    const res = await app.request("/sessions/unknown-id", { method: "DELETE" });
    expect(res.status).toBe(404);
  });

  test("POST /sessions enforces the free plan session limit", async () => {
    const { db } = await import("@prismcode543/database/client");
    await db.user.update({ where: { clerkId: TEST_CLERK_ID }, data: { planId: "free" } });

    // O teste acima já deixou 1 sessão; o Free permite 2
    const second = await app.request("/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Second Session" }),
    });
    expect(second.status).toBe(201);

    const third = await app.request("/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Third Session" }),
    });
    expect(third.status).toBe(403);
    const body = (await third.json()) as { error: string };
    expect(body.error).toContain("2 saved sessions");
  });
});
