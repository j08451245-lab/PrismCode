import { useMemo } from "react";
import { useChat as useAiChat } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  convertToModelMessages,
  type InferUITools,
  lastAssistantMessageIsCompleteWithToolCalls,
  type LanguageModelUsage,
  type ToolSet,
  type UIMessage,
  type UIMessageChunk,
  type ChatTransport,
} from "ai";
import { loadConfig, type ModeType, type SupportedChatModelId, type ToolContracts } from "@prismcode543/shared";
import { apiClient } from "../lib/api-client";
import { getAuth } from "../lib/auth";
import { executeLocalTool } from "../lib/local-tools";
import { useToolConfirm } from "../providers/tool-confirm";
import { hasLocalKey, getDefaultModel, resolveLocalModel } from "../lib/local-model";
import { streamText } from "ai";
import { localTools } from "../lib/local-tool-defs";
import { McpManager } from "../lib/mcp-manager";

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

function convertToCoreMessages(uiMessages: Message[], tools: ToolSet) {
  return convertToModelMessages(uiMessages, { tools });
}

// Conexões MCP são criadas uma vez por processo (spawn de servidores é caro)
let mcpManager: Promise<McpManager> | null = null;

function getMcpManager(): Promise<McpManager> {
  if (!mcpManager) {
    const manager = new McpManager();
    mcpManager = manager.init(loadConfig(process.cwd())).then(() => manager);
  }
  return mcpManager;
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
      const mcp = await getMcpManager();
      const tools: ToolSet = { ...localTools, ...mcp.getTools() };
      const coreMessages = await convertToCoreMessages(messages, tools);

      const result = streamText({
        model,
        tools,
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
                    input: event.input as Record<string, unknown>,
                    providerExecuted: false,
                  });
                  break;
                case "tool-result":
                  controller.enqueue({
                    type: "tool-output-available",
                    toolCallId: event.toolCallId,
                    output: event.output,
                  });
                  break;
                case "tool-error":
                  controller.enqueue({
                    type: "tool-output-error",
                    toolCallId: event.toolCallId,
                    errorText: event.error instanceof Error ? event.error.message : String(event.error),
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
    async sendMessages(options) {
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
      return serverTransport.sendMessages(options);
    },

    async reconnectToStream(options) {
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
      return serverTransport.reconnectToStream(options);
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

      void (async () => {
        const mcp = await getMcpManager();
        const isMcp = mcp.isMcpTool(toolCall.toolName);
        const confirmed = await confirmTool(toolCall.toolName, toolCall.input, isMcp);
        if (!confirmed) {
          throw new Error(`User denied ${toolCall.toolName}`);
        }

        if (isMcp) {
          return mcp.executeTool(toolCall.toolName, toolCall.input);
        }

        return executeLocalTool(toolCall.toolName, toolCall.input, mode);
      })()
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
