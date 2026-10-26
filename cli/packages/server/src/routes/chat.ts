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
  type ModeType,
  type ToolContracts
} from "@prismcode543/shared";
import { buildSystemPrompt } from "../system-prompt";
import type { AuthenticatedEnv } from "../middleware/require-auth";
import { requireCreditsBalance } from "../middleware/require-credits-balance";
import { calculateCreditsForUsage } from "../lib/credits";
import { ingestAiUsage } from "../lib/polar";
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

// Schema de validação do body da requisição POST /chat
const submitSchema = z.object({
  id: z.string(),           // ID da sessão
  messages: z               // Array de mensagens do usuário
    .array(
      z.custom<PrismCodeUIMessage>((value) => {
        // Valida que cada mensagem tem id e parts
        return value != null && typeof value === "object" && "id" in value && "parts" in value;
      }),
    )
    .min(1),                // Pelo menos 1 mensagem
  mode: modeSchema,         // Modo de operação (BUILD, PLAN, ASK, etc.)
  model: z.string().refine(isSupportedChatModel, "Unsupported model"), // Modelo de IA
});

// Validator que valida o body JSON
const submitValidator = zValidator("json", submitSchema, (result, c) => {
  if (!result.success) {
    return c.json({ error: "Invalid request body" }, 400);
  }
});

// Verifica se há chamadas de ferramenta pendentes na mensagem
// (o modelo chamou uma ferramenta mas ainda não terminou)
function hasPendingToolCalls(message: PrismCodeUIMessage) {
  return message.parts.some((part) => {
    if (part.type === "dynamic-tool" || part.type.startsWith("tool-")) {
      const state = (part as { state?: string }).state;
      // Estado não é "output-available" ou "output-error" = ainda pendente
      return state !== "output-available" && state !== "output-error";
    }
    return false;
  });
};

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

      // Valida e converte mensões para o formato do modelo
      const nextMessages = await validateUIMessages<PrismCodeUIMessage>({
        messages: mergedMessages,
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
          if (event.isAborted) return; // Se abortado, não salva

          // Se ainda há chamadas de ferramenta pendentes, não salva ainda
          if (hasPendingToolCalls(event.responseMessage)) return;

          // Salva as mensagens na sessão
          await db.session.update({
            where: { id, userId },
            data: {
              messages: event.messages as unknown as Prisma.InputJsonValue,
            },
          });

          if (!completedUsage) return;

          // Calcula e cobra créditos via Polar
          try {
            const billableUsage = calculateCreditsForUsage({
              provider: resolvedModel.provider,
              model: resolvedModel.modelId,
              usage: completedUsage,
            });

            await ingestAiUsage({
              externalCustomerId: userId,
              eventId: `chat-message:${event.responseMessage.id}`,
              credits: billableUsage.credits,
            });
          } catch (error) {
            console.error("Failed to ingest Polar AI usage for chat message", {
              error,
              sessionId: id,
              messageId: event.responseMessage.id,
              userId,
            });
          }
        },
        onError(error) {
          // Retorna mensagem de erro legível
          return error instanceof Error ? error.message : String(error);
        },
      });
    },
  );

export default app;

