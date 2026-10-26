// =============================================================================
// Caracteres de borda customizados - PrismCode
// Define estilos de borda para componentes de interface.
// EmptyBorder: borda totalmente vazia (apenas espaço horizontal).
// SplitBorderChars: borda com separador vertical (┃).
// =============================================================================

// Borda completamente vazia (usada para espaçamento)
export const EmptyBorder = {
  topLeft: "",
  bottomLeft: "",
  vertical: "",       // Sem linha vertical
  topRight: "",
  bottomRight: "",
  horizontal: " ",    // Espaço horizontal
  bottomT: "",
  topT: "",
  cross: "",
  leftT: "",
  rightT: "",
};

// Borda com separador vertical (┃) para dividir seções
export const SplitBorderChars = {
  ...EmptyBorder,
  vertical: "┃",      // Linha vertical contínua
};
