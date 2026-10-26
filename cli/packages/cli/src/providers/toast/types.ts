// =============================================================================
// Tipos do sistema de toast - PrismCode
// Define os tipos para notificações toast (mensagens temporárias).
// =============================================================================

// Variantes de toast: sucesso, erro, ou informação
export type ToastVariant = "success" | "error" | "info";

// Opções para exibir um toast
export type ToastOptions = {
  message: string;        // Mensagem exibida
  variant?: ToastVariant; // Variante visual (padrão: "info")
  duration?: number;      // Duração em ms (padrão: 3000)
};

// Duração padrão: 3 segundos
export const DEFAULT_DURATION = 3000;
