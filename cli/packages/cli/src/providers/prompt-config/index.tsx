// =============================================================================
// Provider de configuração de prompt - PrismCode
// Gerencia o modo atual (BUILD/PLAN) e o modelo de IA selecionado.
// Essas configurações são usadas em todas as telas do app.
// =============================================================================

import { createContext, useContext, useState, useCallback } from "react";
import type { ReactNode } from "react";
import { 
  DEFAULT_CHAT_MODEL_ID, 
  Mode,
  type ModeType,
  type SupportedChatModelId,
} from "@prismcode543/shared";

// Tipo do contexto de configuração
type PromptConfigContextValue = {
  mode: ModeType;                                    // Modo atual (BUILD ou PLAN)
  toggleMode: () => void;                           // Alterna entre BUILD e PLAN
  setMode: (mode: ModeType) => void;                // Define o modo
  model: SupportedChatModelId;                       // Modelo atual
  setModel: (model: SupportedChatModelId) => void;  // Define o modelo
};

const PromptConfigContext = createContext<PromptConfigContextValue | null>(null);

// Hook para acessar a configuração
export function usePromptConfig(): PromptConfigContextValue {
  const value = useContext(PromptConfigContext);
  if (!value) throw new Error("usePromptConfig must be used within a PromptConfigProvider");
  return value;
};

// Provider que gerencia o estado
export function PromptConfigProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ModeType>(Mode.BUILD); // Padrão: BUILD
  const [model, setModel] = useState<SupportedChatModelId>(DEFAULT_CHAT_MODEL_ID);

  // Alterna entre BUILD e PLAN
  const toggleMode = useCallback(() => {
    setMode((m) => (m === Mode.BUILD ? Mode.PLAN : Mode.BUILD));
  }, []);

  return (
    <PromptConfigContext.Provider value={{ mode, toggleMode, setMode, model, setModel }}>
      {children}
    </PromptConfigContext.Provider>
  );
};

