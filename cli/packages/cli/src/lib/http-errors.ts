// =============================================================================
// Utilitário de erros HTTP - PrismCode
// Extrai mensagens de erro legíveis de respostas HTTP.
// Tenta parsear o body JSON para obter a mensagem de erro,
// e faz fallback para o statusText se não conseguir.
// =============================================================================

// Tipo de uma resposta de erro HTTP
type ErrorResponse = {
  json: () => Promise<unknown>;
  status: number;
  statusText: string;
};

// Extrai a mensagem de erro de uma resposta HTTP
export async function getErrorMessage(response: ErrorResponse) {
  try {
    const data = (await response.json()) as { error?: string };
    // Se o body JSON tem uma string "error", retorna ela
    if (typeof data.error === "string" && data.error.length > 0) {
      return data.error;
    }
  } catch {
    // Body não é JSON válido, ignora e usa fallback
  }

  // Fallback: usa statusText ou mensagem genérica
  return response.statusText || `Request failed with status ${response.status}`;
};
