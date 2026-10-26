// =============================================================================
// Gerenciamento de autenticação local - PrismCode
// Salva, lê e limpa o token de autenticação no disco.
// O token é armazenado em ~/.prismcode/auth.json com permissões restritas.
// =============================================================================

import { existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// Tipo dos dados de autenticação
type AuthData = {
  token: string; // Token de acesso JWT
};

// Diretório e arquivo de autenticação
const AUTH_DIR = join(homedir(), ".prismcode");
const AUTH_FILE = join(AUTH_DIR, "auth.json");

// Lê o token de autenticação do disco
// Retorna null se não existir ou for inválido
export function getAuth(): AuthData | null {
  try {
    const data = readFileSync(AUTH_FILE, "utf-8");
    const parsed = JSON.parse(data) as Partial<AuthData>;
    return typeof parsed.token === "string" ? { token: parsed.token } : null;
  } catch {
    return null;
  }
};

// Salva o token de autenticação no disco
// Cria o diretório com permissões restritas (só o dono pode acessar)
export function saveAuth(data: AuthData) {
  if (!existsSync(AUTH_DIR)) {
    // Permissões 0o700: só o dono pode ler/escrever/executar
    mkdirSync(AUTH_DIR, { mode: 0o700 });
  }
  // Permissões 0o600: só o dono pode ler/escrever
  writeFileSync(AUTH_FILE, JSON.stringify(data), { mode: 0o600 });
}

// Remove o arquivo de autenticação (logout)
export function clearAuth() {
  try {
    unlinkSync(AUTH_FILE);
  } catch {
    // Arquivo não existe, ignora
  }
}