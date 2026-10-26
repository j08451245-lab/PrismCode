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

  const preview = formatToolPreview(pending.toolName, pending.input);
  const previewHeight = Math.min(Math.max(preview.split("\n").length, 1), 8);

  return (
    <box width="100%" backgroundColor="#5a3e00" paddingX={1} flexDirection="column">
      <box height={1}>
        <text attributes={TextAttributes.BOLD} selectable={false}>
          {" "}Allow {pending.toolName}?
        </text>
      </box>
      <scrollbox height={previewHeight} focused>
        <text selectable={false}>{preview}</text>
      </scrollbox>
      <box height={1}>
        <text selectable={false} attributes={TextAttributes.DIM}>
          {" "}Y = Allow  N = Deny  ↑↓ = scroll
        </text>
      </box>
    </box>
  );
}

// Mostra o comando/conteúdo completo (sem cortar em 200 chars). Escapa
// controles do terminal para que o texto não possa falsificar a própria UI.
function formatToolPreview(toolName: string, input: unknown): string {
  const record = typeof input === "object" && input !== null ? input as Record<string, unknown> : undefined;
  let text: string;

  if (toolName === "bash" && typeof record?.command === "string") {
    text = record.command;
  } else if (toolName === "writeFile" && typeof record?.path === "string" && typeof record.content === "string") {
    text = `${record.path}\n\n${record.content}`;
  } else if (toolName === "editFile" && typeof record?.path === "string") {
    text = `${record.path}\n\n--- old\n${String(record.oldString ?? "")}\n+++ new\n${String(record.newString ?? "")}`;
  } else if (toolName === "gitCommit" && typeof record?.message === "string") {
    text = record.message;
  } else {
    text = typeof input === "object" && input !== null ? JSON.stringify(input, null, 2) : String(input);
  }

  // Mantém \n e \t; escapa demais caracteres de controle (inclui ESC/ANSI).
  return text.replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, (char) =>
    `\\x${char.charCodeAt(0).toString(16).padStart(2, "0")}`,
  );
}
