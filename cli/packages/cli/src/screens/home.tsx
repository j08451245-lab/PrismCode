// =============================================================================
// Tela inicial - PrismCode
// Exibe o cabeçalho e a barra de entrada. Quando o usuário envia uma mensagem,
// navega para a tela de nova sessão com a mensagem, modo e modelo selecionados.
// =============================================================================

import { useCallback, useEffect } from "react";
import { useNavigate } from "react-router";
import { Header } from "../components/header";
import { InputBar } from "../components/input-bar";
import { usePromptConfig } from "../providers/prompt-config";
import { TextAttributes } from "@opentui/core";

export function Home({ initialMessage }: { initialMessage?: string }) {
  const navigate = useNavigate();
  const { mode, model } = usePromptConfig(); // Obtém modo e modelo atuais

  // Callback chamado quando o usuário envia uma mensagem
  const handleSubmit = useCallback(
    (text: string, _images?: unknown) => {
      // Navega para tela de nova sessão com os dados da mensagem
      navigate("/sessions/new", { state: { message: text, mode, model } });
    },
    [navigate, mode, model],
  );

  // Se veio mensagem inicial da linha de comando, envia automaticamente
  useEffect(() => {
    if (initialMessage && initialMessage.trim().length > 0) {
      handleSubmit(initialMessage);
    }
  }, [initialMessage, handleSubmit]);

  // Renderiza o layout da tela inicial
  return (
    <box
      alignItems="center"
      justifyContent="center"
      flexGrow={1}
      gap={2}
      position="relative"
      width="100%"
      height="100%"
    >
      <Header />
      <box width="100%" maxWidth={78} paddingX={2} flexDirection="column" gap={1}>
        <InputBar onSubmit={handleSubmit} />
        <box flexDirection="row" gap={1} flexShrink={0} marginLeft="auto">
          <text>tab</text>
          <text attributes={TextAttributes.DIM}>agents</text>
        </box>
      </box>
    </box>
  );
};
