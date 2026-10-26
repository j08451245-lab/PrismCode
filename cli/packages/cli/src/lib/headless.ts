// =============================================================================
// Modo headless do CLI - PrismCode
// Executa o agente sem interface interativa (modo automático).
// Tenta usar o servidor primeiro (se autenticado), depois fallback
// para modo local com BYOK (Bring Your Own Key).
// =============================================================================

import { streamText } from "ai";              // Streaming de texto do AI SDK
import { getAuth } from "./auth";
import {
  resolveLocalModel,
  hasLocalKey,
  getDefaultModel,
  type Provider,
} from "./local-model";

// ---------------------------------------------------------------------------
// Função principal: executa o modo headless
// 1. Tenta usar o servidor (se autenticado)
// 2. Fallback para modo local com BYOK
// ---------------------------------------------------------------------------

export async function runHeadless(prompt: string) {
  const auth = getAuth();

  // Tenta usar o servidor primeiro (se autenticado)
  if (auth) {
    try {
      const apiUrl = process.env.API_URL ?? "http://localhost:3001";
      const response = await fetch(`${apiUrl}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${auth.token}`,
        },
        body: JSON.stringify({
          id: crypto.randomUUID(),
          messages: [{ id: crypto.randomUUID(), role: "user", parts: [{ type: "text", text: prompt }] }],
          mode: "plan",
          model: "claude-sonnet-4-6",
        }),
      });

      if (response.ok) {
        // Lê e imprime o stream de resposta
        const reader = response.body?.getReader();
        if (reader) {
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            process.stdout.write(decoder.decode(value));
          }
          process.stdout.write("\n");
          return;
        }
      }
    } catch {
      // Servidor indisponível, continua para modo local
    }
  }

  // Modo local: usa BYOK diretamente
  const { provider, modelId } = getDefaultModel();

  if (!hasLocalKey(provider)) {
    console.error(`No API key found for ${provider}. Configure one via:\n  prismcode config set ${provider}_api_key <key>`);
    process.exit(1);
  }

  try {
    const model = resolveLocalModel(provider, modelId);
    const result = streamText({
      model,
      system: "You are PrismCode, a terminal AI coding assistant. Answer concisely and accurately.",
      messages: [{ role: "user", content: prompt }]
    });

    // Imprime cada chunk do stream
    for await (const chunk of result.textStream) {
      process.stdout.write(chunk);
    }
    process.stdout.write("\n");
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
