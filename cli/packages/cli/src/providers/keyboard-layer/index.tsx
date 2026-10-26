// =============================================================================
// Provider de camadas de teclado - PrismCode
// Sistema de pilha de camadas para gerenciar atalhos de teclado.
// Cada camada (base, dialog, mention, tool-confirm) pode ter seu próprio
// handler de Ctrl+C. Quando uma camada é pressionada, sobe na pilha.
// =============================================================================

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { useKeyboard, useRenderer } from "@opentui/react";

// Responder: função que tenta processar Ctrl+C. Retorna true se processou.
type Responder = () => boolean;

// Tipo do contexto de camadas de teclado
type KeyboardLayerContextValue = {
  push: (id: string, responder?: Responder) => void; // Adiciona camada
  pop: (id: string) => void;                          // Remove camada
  isTopLayer: (id: string) => boolean;                // Verifica se é o topo
  setResponder: (id: string, responder: Responder | null) => void; // Define responder
};

const KeyboardLayerContext = createContext<KeyboardLayerContextValue | null>(null);

// Provider que gerencia a pilha de camadas
export function KeyboardLayerProvider({ children }: { children: React.ReactNode }) {
  const [stack, setStack] = useState<string[]>(["base"]); // Camada base sempre presente
  const stackRef = useRef(stack);
  stackRef.current = stack;

  const responders = useRef<Map<string, Responder>>(new Map());
  const renderer = useRenderer();

  // Adiciona uma camada ao topo da pilha
  const push = useCallback((id: string, responder?: Responder) => {
    if (responder) responders.current.set(id, responder);
    setStack((prev) => {
      if (prev.includes(id)) return prev; // Evita duplicatas
      return [...prev, id];
    });
  }, []);

  // Remove uma camada da pilha
  const pop = useCallback((id: string) => {
    responders.current.delete(id);
    setStack((prev) => prev.filter((layer) => layer !== id));
  }, []);

  // Verifica se uma camada está no topo
  const isTopLayer = useCallback(
    (id: string) => stack.length === 0 || stack[stack.length - 1] === id,
    [stack],
  );

  // Define ou remove um responder para uma camada
  const setResponder = useCallback((id: string, responder: Responder | null) => {
    if (responder) responders.current.set(id, responder);
    else responders.current.delete(id);
  }, []);

  // Handler global de Ctrl+C: percorre a pilha de trás para frente
  useKeyboard((key) => {
    if (!key.ctrl || key.name !== "c") return;

    const currentStack = stackRef.current;
    for (let i = currentStack.length - 1; i >= 0; i--) {
      const layerId = currentStack[i]!;
      const responder = responders.current.get(layerId);
      if (responder && responder()) return; // Camada processou
    }

    // Nenhuma camada processou: sai da aplicação
    renderer.destroy();
  });

  return (
    <KeyboardLayerContext.Provider value={{ push, pop, isTopLayer, setResponder }}>
      {children}
    </KeyboardLayerContext.Provider>
  );
};

// Hook para usar camadas de teclado
export function useKeyboardLayer() {
  const context = useContext(KeyboardLayerContext);
  if (!context) throw new Error("useKeyboardLayer must be used within a KeyboardLayerProvider");
  return context;
};
