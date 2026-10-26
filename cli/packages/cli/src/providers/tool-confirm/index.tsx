// =============================================================================
// Provider de confirmação de ferramentas - PrismCode
// Pede confirmação ao usuário antes de executar ferramentas destrutivas
// (bash, writeFile, editFile, gitCommit). No modo --auto, pula a confirmação.
// =============================================================================

import { createContext, useContext, useState, useCallback, useRef } from "react";
import type { ReactNode } from "react";

// Ferramenta pendente de confirmação
type PendingConfirmation = {
  toolName: string;              // Nome da ferramenta
  input: unknown;                // Argumentos da ferramenta
  resolve: (confirmed: boolean) => void; // Resolve a promise
};

// Tipo do contexto
type ToolConfirmContextValue = {
  pending: PendingConfirmation | null; // Ferramenta pendente (null = nenhuma)
  confirmTool: (toolName: string, input: unknown) => Promise<boolean>; // Pede confirmação
  respond: (confirmed: boolean) => void; // Responde à confirmação
};

const ToolConfirmContext = createContext<ToolConfirmContextValue | null>(null);

// Hook para usar confirmação de ferramentas
export function useToolConfirm(): ToolConfirmContextValue {
  const value = useContext(ToolConfirmContext);
  if (!value) throw new Error("useToolConfirm must be used within a ToolConfirmProvider");
  return value;
}

// Ferramentas que precisam de confirmação
const DESTRUCTIVE_TOOLS = new Set(["bash", "writeFile", "editFile", "gitCommit"]);

// Verifica se uma ferramenta é destrutiva
export function isDestructiveTool(toolName: string): boolean {
  return DESTRUCTIVE_TOOLS.has(toolName);
}

// Provider que gerencia o estado de confirmação
export function ToolConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirmation | null>(null);
  const pendingRef = useRef<PendingConfirmation | null>(null);

  // Pede confirmação: retorna Promise que resolve com true/false
  const confirmTool = useCallback(async (toolName: string, input: unknown): Promise<boolean> => {
    if (!isDestructiveTool(toolName)) return true; // Não destrutiva: auto-confirma
    if (process.env.PRISMCODE_AUTO === "1") return true; // Modo auto: pula confirmação

    // Mostra banner de confirmação e espera resposta
    return new Promise<boolean>((resolve) => {
      const entry: PendingConfirmation = { toolName, input, resolve };
      pendingRef.current = entry;
      setPending(entry);
    });
  }, []);

  // Responde à confirmação (Y ou N)
  const respond = useCallback((confirmed: boolean) => {
    const entry = pendingRef.current;
    if (!entry) return;
    pendingRef.current = null;
    setPending(null);
    entry.resolve(confirmed); // Resolve a promise
  }, []);

  return (
    <ToolConfirmContext.Provider value={{ pending, confirmTool, respond }}>
      {children}
    </ToolConfirmContext.Provider>
  );
}
