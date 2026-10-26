// =============================================================================
// Rotas de sessões - PrismCode
// CRUD de sessões de chat. Cada sessão contém um título, data de criação,
// e um array de mensagens JSON. Inclui busca por conteúdo nas mensagens.
// =============================================================================

import { Hono } from "hono";
// import { HTTPException } from "hono/http-exception";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { db } from "@prismcode543/database/client";

import type { AuthenticatedEnv } from "../middleware/require-auth";
import { requireCreditsBalance } from "../middleware/require-credits-balance";

// Schema de validação para criar uma nova sessão
const createSessionSchema = z.object({
  title: z.string(), // Título da sessão
});

// Validator que valida o body JSON contra o schema
const createSessionValidator = zValidator(
  "json", createSessionSchema, (result, c) => {
  if (!result.success) {
    return c.json({ error: "Invalid request body" }, 400);
  }
});

// Schema de validação para busca
const searchSchema = z.object({
  q: z.string().min(1), // Query de busca (mínimo 1 caractere)
});

// Validator para query params de busca
const searchValidator = zValidator("query", searchSchema, (result, c) => {
  if (!result.success) {
    return c.json({ error: "Missing search query" }, 400);
  }
});

const app = new Hono<AuthenticatedEnv>()
  // GET /sessions - Lista todas as sessões do usuário (ordenadas por data)
  .get("/", async (c) => {
    const userId = c.get("userId");

    const sessions = await db.session.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }, // Mais recentes primeiro
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    });

    return c.json(sessions);
  })

  // GET /sessions/search - Busca conteúdo nas mensagens das sessões
  .get("/search", searchValidator, async (c) => {
    const userId = c.get("userId");
    const { q } = c.req.valid("query");
    const query = q.toLowerCase(); // Busca case-insensitive

    // Busca todas as sessões com suas mensagens
    const sessions = await db.session.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
        messages: true, // Array de mensagens JSON
      },
    });

    // Array de resultados da busca
    const results: {
      sessionId: string;
      sessionTitle: string;
      createdAt: string;
      matchCount: number;
      matches: { role: string; preview: string }[];
    }[] = [];

    // Para cada sessão, busca nas mensagens
    for (const session of sessions) {
      const messages = (session.messages as unknown as { role: string; parts: { type: string; text?: string }[] }[]) ?? [];
      const matches: { role: string; preview: string }[] = [];

      for (const msg of messages) {
        // Extrai texto das partes da mensagem (type === "text")
        const text = msg.parts
          ?.filter((p) => p.type === "text")
          .map((p) => p.text ?? "")
          .join(" ") ?? "";

        // Verifica se o texto contém a query
        if (text.toLowerCase().includes(query)) {
          // Extrai um trecho ao redor da correspondência (±60 caracteres)
          const idx = text.toLowerCase().indexOf(query);
          const start = Math.max(0, idx - 60);
          const end = Math.min(text.length, idx + query.length + 60);
          const preview = (start > 0 ? "..." : "") + text.slice(start, end) + (end < text.length ? "..." : "");
          matches.push({ role: msg.role, preview });
        }
      }

      // Só adiciona se encontrou correspondências
      if (matches.length > 0) {
        results.push({
          sessionId: session.id,
          sessionTitle: session.title,
          createdAt: session.createdAt.toISOString(),
          matchCount: matches.length,
          matches: matches.slice(0, 3), // Limita a 3 preview por sessão
        });
      }
    }

    return c.json(results);
  })

  // GET /sessions/:id - Retorna uma sessão específica com todas as mensagens
  .get("/:id", async (c) => {
    const id = c.req.param("id");
    const userId = c.get("userId");
    
    const session = await db.session.findUnique({
      where: { id, userId },
    });

    if (!session) {
      return c.json({ error: "Session not found" }, 404);
    }

    return c.json(session);
  })

  // POST /sessions - Cria uma nova sessão
  .post("/", requireCreditsBalance, createSessionValidator, async (c) => {
    const userId = c.get("userId");
    const data = c.req.valid("json");

    const session = await db.session.create({
      data: {
        ...data,
        userId,
      },
    });

    return c.json(session, 201); // 201 = Created
  });

export default app;

