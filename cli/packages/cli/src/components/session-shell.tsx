// =============================================================================
// Shell da sessão - PrismCode
// Layout base para telas de sessão de chat.
// Combina: área de scroll (mensagens), barra de confirmação de ferramentas,
// barra de entrada, e indicador de status (spinner + atalhos).
// =============================================================================

import { TextAttributes } from "@opentui/core";
import type { ReactNode } from "react";
import { InputBar } from "./input-bar";
import { Spinner } from "./spinner";
import { usePromptConfig } from "../providers/prompt-config";
import type { ImageAttachment } from "../hooks/use-chat";
import { ToolConfirmBanner } from "./tool-confirm-banner";

type Props = {
  children?: ReactNode;             // Mensagens da sessão
  onSubmit: (text: string, images?: ImageAttachment[]) => void; // Callback de envio
  inputDisabled?: boolean;          // Se a entrada está desabilitada
  loading?: boolean;                // Se está carregando
  interruptible?: boolean;          // Se pode interromper com ESC
};

export function SessionShell({
  children,
  onSubmit,
  inputDisabled = false,
  loading = false,
  interruptible = false,
}: Props) {
  const { mode } = usePromptConfig();

  return (
    <box flexDirection="column" flexGrow={1} width="100%" height="100%" paddingY={1} paddingX={2} gap={1}>
      <scrollbox flexGrow={1} width="100%" stickyScroll stickyStart="bottom">
        <box>{children}</box>
      </scrollbox>

      <ToolConfirmBanner />

      <box flexShrink={0}>
        <InputBar onSubmit={onSubmit} disabled={inputDisabled} />
      </box>

      <box flexShrink={0} flexDirection="row" justifyContent="space-between" width="100%" height={1} gap={2} paddingLeft={1}>
        <box flexDirection="row" alignItems="center" gap={2}>
          {loading ? (
            <>
              <Spinner mode={mode} />
              {interruptible ? <text>esc to interrupt</text> : null}
            </>
          ) : null}
        </box>
        <box flexDirection="row" gap={1} flexShrink={0} marginLeft="auto">
          <text>tab</text>
          <text attributes={TextAttributes.DIM}>agents</text>
        </box>
      </box>
    </box>
  );
};
