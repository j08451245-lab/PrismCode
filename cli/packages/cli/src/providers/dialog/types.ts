// =============================================================================
// Tipos do sistema de diálogos - PrismCode
// Define a configuração de um diálogo modal.
// =============================================================================

import type { ReactNode } from "react";

// Configuração de um diálogo
export type DialogConfig = {
  title: string;     // Título exibido no cabeçalho
  children: ReactNode; // Conteúdo do diálogo
};
