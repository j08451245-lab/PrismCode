// =============================================================================
// Filtro de comandos - PrismCode
// Filtra a lista de comandos disponíveis baseado na query do usuário.
// =============================================================================

import type { Command } from "./types";
import { COMMANDS } from "./commands";

// Filtra comandos cujo nome começa com a query (case-insensitive)
export function getFilteredCommands(query: string): Command[] {
  if (query.length === 0) return COMMANDS; // Sem filtro: retorna todos
  return COMMANDS
    .filter((cmd) => cmd.name.toLowerCase().startsWith(query.toLowerCase()));
};
