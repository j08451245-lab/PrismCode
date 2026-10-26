import { useMemo } from "react";
import { useChat as useAiChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  type InferUITools,
  lastAssistantMessageIsCompleteWithToolCalls,
  type LanguageModelUsage,
  type UIMessage,
  type UIMessageChunk,
  type ChatTransport,
} from "ai";
import { type ModeType, type SupportedChatModelId, type ToolContracts } from "@prismcode543/shared";
import { apiClient } from "../lib/api-client";
import { getAuth } from "../lib/auth";
import { executeLocalTool } from "../lib/local-tools";
import { useToolConfirm } from "../providers/tool-confirm";
import { hasLocalKey, getDefaultModel, resolveLocalModel } from "../lib/local-model";
import { streamText } from "ai";
import { localTools } from "../lib/local-tool-defs";
import type { CoreMessage } from "ai";

export type ChatMessageMetadata = {
  mode?: ModeType;
  model?: SupportedChatModelId | string;
  durationMs?: number;
  usage?: LanguageModelUsage;
};

type ChatTools = {
  [Name in keyof InferUITools<ToolContracts>]: {
    input: InferUITools<ToolContracts>[Name]["input"];
    output: unknown;
  };
};

export type Message = UIMessage<ChatMessageMetadata, never, ChatTools>;

export type ImageAttachment = {
  path: string;
  dataUrl: string;
  mimeType: string;
};

function shouldUseLocal(): boolean {
  const auth = getAuth();
  if (auth) return false;
  try {
    const { provider } = getDefaultModel();
    return hasLocalKey(provider);
  } catch {
    return false;
  }
}

function convertToCoreMessages(uiMessages: Message[]): CoreMessage[] {
  const result: CoreMessage[] = [];

  for (const m of uiMessages) {
    const textParts = m.parts?.filter((p: any) => p.type === "text") ?? [];
    const textContent = textParts.map((p: any) => p.text).join("");
    const toolCallParts = m.parts?.filter((p: any) => p.type === "tool-call") ?? [];
    const toolResultParts = m.parts?.filter((p: any) => p.type === "tool-result") ?? [];

    for (const tr of toolResultParts) {
      const resultContent = typeof tr.result === "string" ? tr.result : JSON.stringify(tr.result);
      result.push({ role: "tool", content: resultContent, toolCallId: tr.toolCallId } as CoreMessage);
    }

    if (m.role === "assistant" && (textContent || toolCallParts.length)) {
      const parts: any[] = [];
      if (textContent) parts.push({ type: "text" as const, text: textContent });
      for (const tc of toolCallParts) {
        parts.push({ type: "tool-call" as const, toolCallId: tc.toolCallId, toolName: tc.toolName, args: tc.args as Record<string, unknown> });
      }
      result.push({ role: "assistant", content: parts });
      continue;
    }

    if (m.role === "user" && textContent) {
      result.push({ role: "user", content: textContent });
    }
  }

  return result;
}

const SYSTEM_PROMPT = `You are PrismCode, a terminal AI coding assistant running in the user's project directory.

You have access to tools that let you:
- Read and write files in the project
- Execute shell commands (with safety restrictions)
- Search code with glob and regex
- Run git commands
- Search the web for information

Rules:
1. First understand the user's request thoroughly before taking action
2. Prefer reading files before editing them
3. Show relevant code/output when explaining changes
4. Ask for clarification when requirements are ambiguous
5. Never run dangerous commands (rm -rf, etc.)
6. When writing code, write complete, working implementations`;

function createLocalTransport(sessionId: string): ChatTransport<Message> {
  return {
    async sendMessages({ messages, abortSignal }) {
      const { provider, modelId } = getDefaultModel();
      const model = resolveLocalModel(provider, modelId);
      const coreMessages = convertToCoreMessages(messages);

      const result = streamText({
        model,
        tools: localTools,
        system: SYSTEM_PROMPT,
        messages: coreMessages,
        abortSignal,
      });

      return new ReadableStream<UIMessageChunk>({
        async start(controller) {
          controller.enqueue({ type: "start" });

          try {
            for await (const event of result.fullStream) {
              if (abortSignal?.aborted) break;

              switch (event.type) {
                case "text-start":
                  controller.enqueue({ type: "text-start", id: event.id });
                  break;
                case "text-delta":
                  controller.enqueue({ type: "text-delta", id: event.id, delta: event.text });
                  break;
                case "text-end":
                  controller.enqueue({ type: "text-end", id: event.id });
                  break;
                case "tool-input-start":
                  controller.enqueue({
                    type: "tool-input-start",
                    toolCallId: event.id,
                    toolName: event.toolName,
                  });
                  break;
                case "tool-input-delta":
                  controller.enqueue({
                    type: "tool-input-delta",
                    toolCallId: event.id,
                    inputTextDelta: event.delta,
                  });
                  break;
                case "tool-call":
                  controller.enqueue({
                    type: "tool-input-available",
                    toolCallId: event.toolCallId,
                    toolName: event.toolName,
                    input: event.args as Record<string, unknown>,
                    providerExecuted: false,
                  });
                  break;
                case "tool-result":
                  controller.enqueue({
                    type: "tool-result",
                    toolCallId: event.toolCallId,
                    result: event.result as Record<string, unknown>,
                  });
                  break;
                case "error":
                  controller.enqueue({
                    type: "error",
                    errorText: event.error instanceof Error ? event.error.message : String(event.error),
                  });
                  break;
                case "start-step":
                case "finish-step":
                  break;
                case "finish":
                  controller.enqueue({ type: "finish" });
                  break;
              }
            }
          } catch (e) {
            controller.enqueue({
              type: "error",
              errorText: e instanceof Error ? e.message : String(e),
            });
          }

          controller.close();
        },
      });
    },

    async reconnectToStream() {
      return null;
    },
  };
}

function createServerTransport(sessionId: string): ChatTransport<Message> {
  return {
    async sendMessages({ messages, abortSignal }) {
      const serverTransport = new DefaultChatTransport<Message>({
        api: apiClient.chat.$url().toString(),
        headers() {
          const auth = getAuth();
          return auth ? { Authorization: `Bearer ${auth.token}` } : new Headers();
        },
        prepareSendMessagesRequest({ messages: msgs }: { messages: any[] }) {
          const message = msgs[msgs.length - 1];
          if (!message) throw new Error("No message to send");

          const metadata = msgs.findLast(
            (m: any) => m.metadata?.mode && m.metadata?.model,
          )?.metadata;
          const previousMessage = msgs[msgs.length - 2];
          const requestMessages =
            message.role === "assistant" && previousMessage?.role === "user"
              ? [previousMessage, message]
              : [message];

          return {
            body: {
              id: sessionId,
              messages: requestMessages,
              mode: message.metadata?.mode ?? metadata?.mode,
              model: message.metadata?.model ?? metadata?.model,
            },
          }
        }
      });
      return serverTransport.sendMessages({ messages, abortSignal });
    },

    async reconnectToStream() {
      const serverTransport = new DefaultChatTransport<Message>({
        api: apiClient.chat.$url().toString(),
        headers() {
          const auth = getAuth();
          return auth ? { Authorization: `Bearer ${auth.token}` } : new Headers();
        },
        prepareSendMessagesRequest({ messages: msgs }: { messages: any[] }) {
          return { body: { id: sessionId, messages: msgs } }
        }
      });
      return serverTransport.reconnectToStream();
    },
  };
}

function createTransport(sessionId: string): ChatTransport<Message> {
  if (shouldUseLocal()) {
    return createLocalTransport(sessionId);
  }
  return createServerTransport(sessionId);
}

export function useChat(sessionId: string, initialMessages: Message[]) {
  const { confirmTool } = useToolConfirm();
  const transport = useMemo(() => createTransport(sessionId), [sessionId]);

  const chat = useAiChat<Message>({
    id: sessionId,
    messages: initialMessages,
    transport,
    onToolCall({ toolCall }) {
      const mode = chat.messages.at(-1)?.metadata?.mode ?? "BUILD";

      void confirmTool(toolCall.toolName, toolCall.input)
        .then((confirmed) => {
          if (!confirmed) {
            throw new Error(`User denied ${toolCall.toolName}`);
          }

          return executeLocalTool(toolCall.toolName, toolCall.input, mode);
        })
        .then((output) =>
          chat.addToolOutput({
            tool: toolCall.toolName as keyof ChatTools,
            toolCallId: toolCall.toolCallId,
            output,
          }),
        )
        .catch((error) =>
          chat.addToolOutput({
            tool: toolCall.toolName as keyof ChatTools,
            toolCallId: toolCall.toolCallId,
            state: "output-error",
            errorText: error instanceof Error ? error.message : String(error),
          }),
        );
    },
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
  });

  return {
    messages: chat.messages,
    status: chat.status,
    error: chat.error,
    submit: (params: {
      userText: string;
      images?: ImageAttachment[];
      mode: ModeType;
      model: SupportedChatModelId;
    }) => {
      if (params.images && params.images.length > 0) {
        return chat.sendMessage({
          text: params.userText,
          files: params.images.map((img) => ({
            type: "file" as const,
            mediaType: img.mimeType,
            url: img.dataUrl,
            filename: img.path,
          })),
          metadata: { mode: params.mode, model: params.model },
        });
      }

      return chat.sendMessage({
        text: params.userText,
        metadata: {
          mode: params.mode,
          model: params.model,
        },
      });
    },
    abort: chat.stop,
    interrupt: chat.stop,
  };
};
