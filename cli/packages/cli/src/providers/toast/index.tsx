// =============================================================================
// Provider de toast - PrismCode
// Sistema de notificações temporárias que aparecem no canto da tela.
// Cada toast tem: mensagem, variante (sucesso/erro/info), e duração.
// =============================================================================

import { createContext, useContext, useRef, useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import { useTerminalDimensions } from "@opentui/react";
import type { ToastOptions, ToastVariant } from "./types";
import { DEFAULT_DURATION } from "./types";
import { SplitBorderChars } from "../../components/border";
import { useTheme } from "../theme";

// Tipo do contexto de toast
export type ToastContextValue = {
  show: (options: ToastOptions) => void; // Exibe um toast
};

// Contexto React para o toast
const ToastContext = createContext<ToastContextValue | null>(null);

// Hook para usar o toast (deve estar dentro de ToastProvider)
export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used within a ToastProvider");
  return value;
};

// Provider que gerencia o estado do toast
export function ToastProvider({ children }: { children: ReactNode }) {
  const [currentToast, setCurrentToast] = useState<ToastOptions | null>(null);
  const timeoutHandleRef = useRef<NodeJS.Timeout | null>(null);

  // Limpa o timeout anterior
  const clearCurrentTimeout = useCallback(() => {
    if (timeoutHandleRef.current) {
      clearTimeout(timeoutHandleRef.current);
      timeoutHandleRef.current = null;
    }
  }, []);

  // Exibe um novo toast (substitui o anterior)
  const show = useCallback((options: ToastOptions) => {
    const duration = options.duration ?? DEFAULT_DURATION;
    clearCurrentTimeout();
    setCurrentToast({ variant: options.variant ?? "info", ...options, duration });
    // Auto-remove após a duração
    timeoutHandleRef.current = setTimeout(() => { setCurrentToast(null); }, duration).unref();
  }, [clearCurrentTimeout]);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <Toast currentToast={currentToast} />
    </ToastContext.Provider>
  );
};

// Componente visual do toast
function Toast({ currentToast }: { currentToast: ToastOptions | null }) {
  const { width } = useTerminalDimensions();
  const { colors } = useTheme();

  if (!currentToast) return null;

  // Cor da borda baseada na variante
  const variantColors: Record<ToastVariant, string> = {
    success: colors.success,
    error: colors.error,
    info: colors.info,
  };
  const borderColor = currentToast.variant ? variantColors[currentToast.variant] : variantColors.info;

  return (
    <box
      position="absolute" justifyContent="center" alignItems="flex-start"
      top={2} right={2}
      width={Math.max(1, Math.min(60, width - 6))}
      paddingLeft={2} paddingRight={2} paddingTop={1} paddingBottom={1}
      backgroundColor={colors.surface} borderColor={borderColor}
      border={["left", "right"]} customBorderChars={SplitBorderChars}
    >
      <box flexDirection="column" gap={1} width="100%">
        <text fg="#E1E1E1" wrapMode="word" width="100%">
          {currentToast.message}
        </text>
      </box>
    </box>
  );
};
