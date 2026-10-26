// =============================================================================
// Layout raiz - PrismCode
// Envolva todas as telas com os providers globais necessários:
// - ThemeProvider: gerenciamento de temas visuais
// - ToastProvider: notificações toast
// - KeyboardLayerProvider: camada de atalhos de teclado
// - DialogProvider: gerenciamento de diálogos modais
// - PromptConfigProvider: configuração de modo e modelo
// - ToolConfirmProvider: confirmação de ferramentas destrutivas
// - ThemedRoot: aplica o tema atual ao terminal
// =============================================================================

import { Outlet } from "react-router";
import { ToastProvider } from "../providers/toast";
import { DialogProvider } from "../providers/dialog";
import { KeyboardLayerProvider } from "../providers/keyboard-layer";
import { ThemeProvider } from "../providers/theme";
import { ThemedRoot } from "./themed-root";
import { PromptConfigProvider } from "../providers/prompt-config";
import { ToolConfirmProvider } from "../providers/tool-confirm";

export function RootLayout() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <KeyboardLayerProvider>
          <DialogProvider>
            <PromptConfigProvider>
              <ToolConfirmProvider>
                <ThemedRoot>
                  {/* Renderiza a rota filha atual */}
                  <Outlet />
                </ThemedRoot>
              </ToolConfirmProvider>
            </PromptConfigProvider>
          </DialogProvider>
        </KeyboardLayerProvider>
      </ToastProvider>
    </ThemeProvider>
  );
};
