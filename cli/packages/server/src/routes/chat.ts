// =============================================================================
// Rota de chat - PrismCode
// Endpoint principal que recebe mensagens do usuário, envia para o modelo
// de IA, e retorna a resposta em streaming. Salva o histórico de mensões
// no banco e registra cobrança de créditos via Polar.sh.
// =============================================================================

import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import {
  convertToModelMessages,   // Converte mensagens UI para formato do modelo
  streamText,               // Envia texto ao modelo e retorna stream
  validateUIMessages,       // Valida mensagens UI
  type InferUITools,        // Infere tipos das ferramentas
  type LanguageModelUsage,  // Tipo de uso de tokens
  type UIMessage,           // Tipo de mensagem UI
} from "ai";
import { db } from "@prismcode543/database/client";
import type { Prisma } from "@prismcode543/database";
import {
  getToolContracts,   // Obtém ferramentas disponíveis para o modo
  modeSchema,         // Schema de validação do modo
  isModelAllowed,     // Verifica restrições de modelo por plano
  type ModeType,
  type ToolContracts
} from "@prismcode543/shared";
import { buildSystemPrompt } from "../system-prompt";
import type { AuthenticatedEnv } from "../middleware/require-auth";
import { requireCreditsBalance } from "../middleware/require-credits-balance";
import { calculateCreditsForUsage } from "../lib/credits";
import { ingestAiUsage, hasPolarCredentials } from "../lib/polar";
import { getUserPlan, trackUsage } from "../lib/plans";
import { isSupportedChatModel, resolveChatModel } from "../lib/models";

// Tipo de metadados anexados a cada mensagem
type ChatMessageMetadata = {
  mode?: ModeType;        // Modo usado quando a mensagem foi enviada
  model?: string;         // Modelo usado
  durationMs?: number;    // Duração da resposta em milissegundos
  usage?: LanguageModelUsage; // Uso de tokens
};

// Tipo de mensagem UI do PrismCode (extende UIMessage do AI SDK)
type PrismCodeUIMessage = UIMessage<ChatMessageMetadata, never, InferUITools<ToolContracts>>;

// Limites do payload: o body já tem teto global, mas mensagens/partes
// individuais precisam de caps para não estourar memória e tokens.
const MAX_MESSAGES = 200;
const MAX_PARTS_PER_MESSAGE = 100;
const MAX_PART_TEXT_LENGTH = 200_000;

// Schema de validação do body da requisição POST /chat
const submitSchema = z.object({
  id: z.string().min(1).max(100), // ID da sessão
  messages: z               // Array de mensagens do usuário
    .array(
      z.custom<PrismCodeUIMessage>((value) => {
        if (value == null || typeof value !== "object") return false;
        if (!("id" in value) || typeof value.id !== "string") return false;
        if (!("parts" in value) || !Array.isArray(value.parts)) return false;
        if (value.parts.length > MAX_PARTS_PER_MESSAGE) return false;

        return value.parts.every((part) => {
          if (part == null || typeof part !== "object") return false;
          const text = (part as { text?: unknown }).text;
          return typeof text !== "string" || text.length <= MAX_PART_TEXT_LENGTH;
        });
      }),
    )
    .min(1)                 // Pelo menos 1 mensagem
    .max(MAX_MESSAGES),     // Teto de mensagens por requisição
  mode: modeSchema,         // Modo de operação (BUILD, PLAN, ASK, etc.)
  model: z.string().refine(isSupportedChatModel, "Unsupported model"), // Modelo de IA
});

// Rate limit por usuário (janela fixa em memória, por processo).
// O limite diário do plano não impede rajadas de requisições concorrentes.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 60;
const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(userId);

  if (!bucket || bucket.resetAt <= now) {
    rateLimitBuckets.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });

    // Poda janelas expiradas para o mapa não crescer sem limite
    if (rateLimitBuckets.size > 10_000) {
      for (const [key, value] of rateLimitBuckets) {
        if (value.resetAt <= now) rateLimitBuckets.delete(key);
      }
    }

    return false;
  }

  bucket.count += 1;
  return bucket.count > RATE_LIMIT_MAX_REQUESTS;
}

// Validator que valida o body JSON
const submitValidator = zValidator("json", submitSchema, (result, c) => {
  if (!result.success) {
    return c.json({ error: "Invalid request body" }, 400);
  }
});

// Verifica se uma parte é uma chamada de ferramenta
function isToolPart(part: PrismCodeUIMessage["parts"][number]) {
  return part.type === "dynamic-tool" || part.type.startsWith("tool-");
}

// Remove chamadas de ferramenta que ficaram sem resultado (stream abortado ou
// cliente que não continuou após o tool call). Sem isso, convertToModelMessages
// gera um tool-call "solto" e o provedor rejeita a conversa inteira.
function sanitizePendingToolCalls(messages: PrismCodeUIMessage[]): PrismCodeUIMessage[] {
  const sanitized: PrismCodeUIMessage[] = [];

  for (const message of messages) {
    if (message.role !== "assistant") {
      sanitized.push(message);
      continue;
    }

    const parts = message.parts.filter((part) => {
      if (!isToolPart(part)) return true;
      const state = (part as { state?: string }).state;
      return state === "output-available" || state === "output-error";
    });

    // Mensagem só com tool calls pendentes não tem como ser convertida
    if (parts.length > 0) {
      sanitized.push({ ...message, parts } as PrismCodeUIMessage);
    }
  }

  return sanitized;
}

// ---------------------------------------------------------------------------
// Rota POST /chat - Envia mensagem ao modelo de IA
// ---------------------------------------------------------------------------

const app = new Hono<AuthenticatedEnv>()
  .post(
    "/",
    requireCreditsBalance,    // Verifica saldo de créditos antes de processar
    submitValidator,          // Valida o body da requisição
    async (c) => {
      const userId = c.get("userId");
      const { id, messages, mode, model } = c.req.valid("json");

      if (isRateLimited(userId)) {
        return c.json({ error: "Too many requests. Please wait a moment and try again." }, 429);
      }

      // Aplica os limites do plano antes de gastar tokens
      const plan = await getUserPlan(userId);
      if (plan.remainingMessages === 0) {
        return c.json({ error: "Daily message limit reached. Run /upgrade to continue." }, 429);
      }
      if (!isModelAllowed(plan.planId, model)) {
        return c.json({ error: `Model ${model} is not available on the ${plan.planName} plan.` }, 403);
      }

      // Busca a sessão no banco (valida que pertence ao usuário)
      const session = await db.session.findUnique({
        where: { id, userId },
      });

      if (!session) {
        return c.json({ error: "Session not found" }, 404);
      }

      const startTime = Date.now(); // Marca tempo inicial

      // Obtém as ferramentas disponíveis para o modo atual
      const tools = getToolContracts(mode);

      // Resolve o modelo de ID para instância real do provedor
      const resolvedModel = resolveChatModel(model);

      // Carrega mensagens anteriores da sessão
      const previousMessages = Array.isArray(session.messages)
        ? (session.messages as unknown as PrismCodeUIMessage[])
        : [];

      // Mescla mensagens anteriores com as novas
      const mergedMessages = [...previousMessages];
      
      for (const message of messages) {
        const incomingMessage = {
          ...message,
          metadata: { ...message.metadata, mode, model }, // Adiciona metadados
        } satisfies PrismCodeUIMessage;

        // Se a mensagem já existe (atualização), substitui
        const existingMessageIndex = mergedMessages.findIndex((m) => m.id === incomingMessage.id);

        if (existingMessageIndex === -1) {
          mergedMessages.push(incomingMessage); // Nova mensagem
        } else {
          mergedMessages[existingMessageIndex] = incomingMessage; // Atualiza
        }
      }

      // Valida e converte mensagens para o formato do modelo
      const nextMessages = await validateUIMessages<PrismCodeUIMessage>({
        messages: sanitizePendingToolCalls(mergedMessages),
        tools,
      });
      const modelMessages = await convertToModelMessages(nextMessages, { tools });

      let completedUsage: LanguageModelUsage | null = null;

      // Envia texto ao modelo em streaming
      const result = streamText({
        model: resolvedModel.model,          // Modelo resolvido
        system: buildSystemPrompt({ mode }), // System prompt baseado no modo
        messages: modelMessages,             // Mensagens convertidas
        tools,                               // Ferramentas disponíveis
        providerOptions: resolvedModel.providerOptions, // Opções extras
        onFinish(event) {
          // Salva o uso quando o modelo terminar de responder
          completedUsage = event.totalUsage;
        },
      });

      // Retorna a resposta como stream de mensagens UI
      return result.toUIMessageStreamResponse<PrismCodeUIMessage>({
        originalMessages: nextMessages,
        // Metadados anexados a cada parte do stream
        messageMetadata({ part }) {
          if (part.type === "start") {
            return { mode, model }; // Início: retorna modo e modelo
          }

          if (part.type !== "finish") return undefined;

          // Fim: retorna modo, modelo, duração e uso de tokens
          return {
            mode,
            model,
            durationMs: Date.now() - startTime,
            ...(completedUsage ? { usage: completedUsage } : {}),
          };
        },
        // Quando terminar completamente, salva no banco e cobra créditos
        async onFinish(event) {
          // Persiste mesmo quando o cliente aborta: o que foi gerado já foi
          // consumido e precisa continuar no histórico. Chamadas de ferramenta
          // sem resultado são removidas na próxima leitura (sanitize).
          try {
            if (event.messages.length > 0) {
              await db.session.update({
                where: { id, userId },
                data: {
                  messages: event.messages as unknown as Prisma.InputJsonValue,
                },
              });
            }
          } catch (error) {
            console.error("Failed to persist chat session", { error, sessionId: id, userId });
          }

          if (!completedUsage) return;

          // Calcula e registra o uso local (planos e estatísticas).
          // Cobra mesmo que a resposta tenha terminado em tool call pendente.
          try {
            const billableUsage = calculateCreditsForUsage({
              provider: resolvedModel.provider,
              model: resolvedModel.modelId,
              usage: completedUsage,
            });

            await trackUsage(
              userId,
              completedUsage.inputTokens ?? 0,
              completedUsage.outputTokens ?? 0,
              billableUsage.credits,
            );

            // Espelha o consumo no Polar quando o billing está configurado
            if (hasPolarCredentials()) {
              await ingestAiUsage({
                externalCustomerId: userId,
                eventId: `chat-message:${event.responseMessage.id}`,
                credits: billableUsage.credits,
              });
            }
          } catch (error) {
            console.error("Failed to record usage for chat message", {
              error,
              sessionId: id,
              messageId: event.responseMessage.id,
              userId,
            });
          }
        },
        onError(error) {
          // Detalhes do provedor ficam no log do servidor, não na resposta
          console.error("Chat stream error", { error, sessionId: id, userId });
          return "Something went wrong while generating the response. Please try again.";
        },
      });
    },
  );

export default app;

