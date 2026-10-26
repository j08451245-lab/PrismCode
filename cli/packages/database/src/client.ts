// =============================================================================
// Cliente do banco de dados - PrismCode
// Configura e exporta o PrismaClient com adapter LibSQL (SQLite compatível).
// Carrega variáveis de ambiente de múltiplos locais e resolve caminhos
// relativos para o arquivo do banco de dados.
// =============================================================================

import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { PrismaLibSql } from "@prisma/adapter-libsql"; // Adapter SQLite/LibSQL
import { PrismaClient } from "../generated/prisma/client.ts"; // Cliente gerado pelo Prisma

// Carrega .env de múltiplos locais (prioridade: cwd → raiz → diretório do módulo)
dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
const _moduleDir = import.meta.dirname
  ?? path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(_moduleDir, "../../../.env") });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set");
}

// Resolve caminhos relativos do diretório packages/database
// Detecta se está em dist/ ou src/ e ajusta o caminho
const currentDir = path.resolve(_moduleDir);
const parentDir = path.resolve(currentDir, "..");
const dbDir = path.basename(parentDir) === "dist"
  ? path.resolve(parentDir, "..")   // Se em dist/, sobe um nível
  : parentDir;                      // Se em src/, usa o diretório atual
const dbPath = databaseUrl.replace(/^file:/, ""); // Remove prefixo "file:"
const resolvedUrl = `file:${path.resolve(dbDir, dbPath)}`; // Caminho absoluto

// Cria o adapter LibSQL com a URL resolvida
const adapter = new PrismaLibSql({ url: resolvedUrl });

// Exporta a instância do PrismaClient para uso em toda a aplicação
export const db = new PrismaClient({ adapter });
