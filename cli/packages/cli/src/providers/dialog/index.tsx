// =============================================================================
// Provider de diálogos modais - PrismCode
// Gerencia a abertura e fechamento de diálogos modais sobre a interface.
// Cria uma sobreposição escura com um painel centralizável.
// =============================================================================

import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { TextAttributes, RGBA } from "@opentui/core";
import { useKeyboard, useTerminalDimensions } from "@opentui/react";
import type { DialogConfig } from "./types";
import { useKeyboardLayer } from "../keyboard-layer";
import { useTheme } from "../theme";

// Tipo do contexto de diálogos
export type DialogContextValue = {
  open: (config: DialogConfig) => void;  // Abre um diálogo
  close: () => void;                      // Fecha o diálogo atual
};

const DialogContext = createContext<DialogContextValue | null>(null);

// Hook para usar diálogos
export function useDialog(): DialogContextValue {
  const value = useContext(DialogContext);
  if (!value) throw new Error("useDialog must be used within a DialogProvider");
  return value;
};

// Provider que gerencia o estado do diálogo
export function DialogProvider({ children }: { children: ReactNode }) {
  const [currentDialog, setCurrentDialog] = useState<DialogConfig | null>(null);
  const { push, pop } = useKeyboardLayer();

  // Fecha o diálogo e remove a camada de teclado
  const close = useCallback(() => {
    setCurrentDialog(null);
    pop("dialog");
  }, [pop]);

  // Abre um novo diálogo e registra camada de teclado
  const open = useCallback(
    (config: DialogConfig) => {
      setCurrentDialog(config);
      push("dialog", () => { close(); return true; }); // ESC fecha
    },
    [push, close],
  );

  return (
    <DialogContext.Provider value={{ open, close }}>
      {children}
      <Dialog currentDialog={currentDialog} close={close} />
    </DialogContext.Provider>
  );
};

// Componente visual do diálogo
function Dialog({ currentDialog, close }: { currentDialog: DialogConfig | null; close: () => void }) {
  const { isTopLayer } = useKeyboardLayer();
  const dimensions = useTerminalDimensions();
  const { colors } = useTheme();

  // ESC fecha o diálogo
  useKeyboard((key) => {
    if (!currentDialog || !isTopLayer("dialog")) return;
    if (key.name === "escape") close();
  });

  if (!currentDialog) return null;

  const { title, children } = currentDialog;

  return (
    <box
      position="absolute" left={0} top={0}
      width={dimensions.width} height={dimensions.height}
      justifyContent="center" alignItems="center"
      backgroundColor={RGBA.fromInts(0, 0, 0, 150)} // Sobreposição escura
      zIndex={100}
      onMouseDown={() => close()} // Clique fora fecha
    >
      <box
        width={Math.min(60, dimensions.width - 4)} height="auto"
        backgroundColor={colors.dialogSurface}
        paddingX={4} paddingY={1} flexDirection="column" gap={1}
        onMouseDown={(e) => e.stopPropagation()} // Impede fechamento ao clicar dentro
      >
        <box paddingBottom={1} flexDirection="row" alignItems="center" justifyContent="space-between">
          <text attributes={TextAttributes.BOLD}>{title}</text>
          <text attributes={TextAttributes.DIM} onMouseDown={() => close()}>esc</text>
        </box>
        <box flexGrow={1}>{children}</box>
      </box>
    </box>
  );
};
