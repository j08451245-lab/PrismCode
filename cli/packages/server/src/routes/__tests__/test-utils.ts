import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(import.meta.dirname ?? process.cwd(), "../../../../../.env") });

import { Hono } from "hono";
import type { AuthenticatedEnv } from "../../middleware/require-auth";

export const TEST_CLERK_ID = "test-user-clerk-123";

export function createTestApp() {
  const app = new Hono();

  // Bypass auth: set a fixed userId (clerkId)
  app.use("*", async (c, next) => {
    c.set("userId", TEST_CLERK_ID);
    await next();
  });

  return app;
}

export async function ensureTestUser() {
  const { db } = await import("@prismcode543/database/client");
  const user = await db.user.findUnique({ where: { clerkId: TEST_CLERK_ID } });
  if (!user) {
    return db.user.create({ data: { clerkId: TEST_CLERK_ID, planId: "pro" } });
  }
  return user;
}

export async function cleanupTestUser() {
  const { db } = await import("@prismcode543/database/client");
  const user = await db.user.findUnique({ where: { clerkId: TEST_CLERK_ID } });
  if (user) {
    await db.session.deleteMany({ where: { userId: user.id } });
    await db.usageRecord.deleteMany({ where: { userId: user.id } });
    await db.subscription.deleteMany({ where: { userId: user.id } });
    await db.user.delete({ where: { id: user.id } });
  }
}
