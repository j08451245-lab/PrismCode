// =============================================================================
// Banner de confirmação de ferramenta - PrismCode
// Exibe um banner de confirmação quando o agente tenta usar uma ferramenta
// destrutiva (ex: bash, writeFile). O usuário pode aceitar (Y) ou negar (N).
// =============================================================================

import { useCallback, useEffect } from "react";
import { useKeyboard } from "@opentui/react";
import { TextAttributes } from "@opentui/core";
import { useToolConfirm } from "../providers/tool-confirm";
import { useKeyboardLayer } from "../providers/keyboard-layer";

export function ToolConfirmBanner() {
  const { pending, respond } = useToolConfirm(); // Ferramenta pendente e função de resposta
  const { isTopLayer, push, pop } = useKeyboardLayer(); // Camada de teclado

  // Gerencia a camada de teclado: sobe quando tem pendência, desce quando não
  useEffect(() => {
    if (!pending) {
      pop("tool-confirm");
      return;
    }
    push("tool-confirm");
    return () => pop("tool-confirm");
  }, [pending, push, pop]);

  // Lida com teclas Y/N/Enter/Escape para responder
  const handleKey = useCallback((key: { name: string; preventDefault: () => void }) => {
    if (!pending) return;
    if (!isTopLayer("tool-confirm")) return;

    if (key.name === "y" || key.name === "return" || key.name === "enter") {
      key.preventDefault();
      respond(true);  // Aceita
    } else if (key.name === "n" || key.name === "escape") {
      key.preventDefault();
      respond(false); // Nega
    }
  }, [pending, respond, isTopLayer]);

  useKeyboard(handleKey);

  if (!pending) return null; // Sem pendência, não renderiza nada

  // Formata o input da ferramenta para exibição (máx. 200 chars)
  const safeInput = typeof pending.input === "object" && pending.input !== null
    ? JSON.stringify(pending.input, null, 1).slice(0, 200)
    : String(pending.input).slice(0, 200);

  return (
    <box width="100%" backgroundColor="#5a3e00" paddingX={1} height={3} flexDirection="column">
      <box height={1}>
        <text attributes={TextAttributes.BOLD} selectable={false}>
          {" "}Allow {pending.toolName}?
        </text>
      </box>
      <box height={1} overflow="hidden">
        <text selectable={false}>{" "}{safeInput}</text>
      </box>
      <box height={1}>
        <text selectable={false} attributes={TextAttributes.DIM}>
          {" "}Y = Allow  N = Deny
        </text>
      </box>
    </box>
  );
}
