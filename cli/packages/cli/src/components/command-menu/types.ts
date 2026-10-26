// =============================================================================
// Tipos do menu de comandos - PrismCode
// Define os tipos para comandos do palette (Ctrl+P) e seu contexto.
// =============================================================================

import type { DialogContextValue } from "../../providers/dialog";
import type { ToastContextValue } from "../../providers/toast";
import type { ModeType, SupportedChatModelId } from "@prismcode543/shared";

// Contexto disponível para executar um comando
export type CommandContext = {
  exit: () => void;                    // Sai da aplicação
  toast: ToastContextValue;            // Mostra notificações
  dialog: DialogContextValue;          // Abre diálogos modais
  navigate: (path: string) => void;    // Navega entre telas
  mode: ModeType;                      // Modo atual
  setMode: (mode: ModeType) => void;   // Muda o modo
  setModel: (model: SupportedChatModelId) => void; // Muda o modelo
};

// Definição de um comando
export type Command = {
  name: string;        // Nome exibido no menu
  description: string; // Descrição curta
  value: string;       // Valor inserido na barra de entrada
  action?: (ctx: CommandContext) => void | Promise<void>; // Ação executada
};
