#!/usr/bin/env node
// =============================================================================
// Servidor MCP (Model Context Protocol) - PrismCode
// Implementa um servidor MCP que fornece ferramentas de acesso a arquivos,
// execução de comandos, e manipulação de projeto via protocolo MCP.
// O MCP permite que agentes de IA acessem ferramentas externas de forma padronizada.
// =============================================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js"; // Servidor MCP
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js"; // Transporte via stdio
import { z } from "zod"; // Validação de schemas

import { readFile, writeFile, readdir, lstat, mkdir } from "node:fs/promises"; // Operações de arquivo
import { existsSync, lstatSync, realpathSync } from "node:fs";
import { relative, resolve, dirname, isAbsolute, join, basename } from "node:path"; // Manipulação de caminhos
import { execFileSync, execSync } from "node:child_process"; // Execução de comandos shell
import { homedir } from "node:os"; // Diretório home

// Cria o servidor MCP com nome e versão
const server = new McpServer({
  name: "@prismcode543/mcp-server",
  version: "0.1.0",
});

// Limites de segurança
const MAX_FILE_SIZE = 10_000;  // Tamanho máximo de arquivo lido
const MAX_OUTPUT = 20_000;     // Máximo de saída de comandos

// Trunca texto longo
function truncate(value: string, limit: number) {
  return value.length > limit
    ? `${value.slice(0, limit)}\n... (truncated, ${value.length} total chars)`
    : value;
}

// Segmentos e arquivos que nunca podem ser lidos/escritos pelas ferramentas.
const PROTECTED_SEGMENTS = new Set([".git", "node_modules"]);
const SENSITIVE_FILE_PATTERNS = [
  /(^|[/\\])\.env($|\.)/i,
  /(^|[/\\])id_(rsa|dsa|ecdsa|ed25519)$/i,
  /(^|[/\\]).*\.pem$/i,
  /(^|[/\\]).*\.key$/i,
  /(^|[/\\]).*credentials.*$/i,
];

function assertPathAllowed(rel: string, operation: "read" | "write") {
  const normalized = rel.replace(/\\/g, "/");

  for (const segment of normalized.split("/").filter(Boolean)) {
    if (PROTECTED_SEGMENTS.has(segment)) {
      throw new Error(`Refusing to ${operation} protected path segment: ${segment}`);
    }
  }

  if (SENSITIVE_FILE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    throw new Error(`Refusing to ${operation} sensitive file path: ${rel}`);
  }
}

// Resolve o alvo (ou o ancestral existente mais próximo) para impedir que
// symlinks apontem para fora do projeto.
function canonicalInside(root: string, target: string) {
  let probe = target;
  const suffix: string[] = [];

  for (;;) {
    try {
      const real = realpathSync(probe);
      const canonical = suffix.length ? join(real, ...suffix) : real;
      const rel = relative(root, canonical);

      if (rel.startsWith("..") || isAbsolute(rel)) {
        throw new Error("Path is outside the project directory");
      }

      return canonical;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;

      // Symlink quebrado não pode ser resolvido; recusar em vez de escrever através dele.
      try {
        if (lstatSync(probe).isSymbolicLink()) {
          throw new Error("Refusing to use a broken symlink");
        }
      } catch (lstatError) {
        if ((lstatError as NodeJS.ErrnoException).code !== "ENOENT") throw lstatError;
      }

      const parent = dirname(probe);
      if (parent === probe) throw new Error("Path is outside the project directory");
      suffix.unshift(basename(probe));
      probe = parent;
    }
  }
}

function resolveInsideProject(path: string, operation: "read" | "write" = "read") {
  const cwd = realpathSync(process.cwd());
  const resolved = resolve(cwd, path);
  const rel = relative(cwd, resolved);

  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error("Path is outside the project directory");
  }

  assertPathAllowed(rel || ".", operation);

  return { cwd, resolved: canonicalInside(cwd, resolved) };
}

function assertSafeGlobPattern(pattern: string) {
  const normalized = pattern.replace(/\\/g, "/");

  if (isAbsolute(pattern) || /^[a-zA-Z]:/.test(pattern) || normalized.split("/").includes("..")) {
    throw new Error("Glob pattern must stay inside the project directory");
  }
}

// ---------------------------------------------------------------------------
// Ferramenta: Lê conteúdo de um arquivo
// Valida que o caminho está dentro do projeto antes de ler
// ---------------------------------------------------------------------------

server.tool(
  "read_file",
  "Read the contents of a file from the project directory",
  { path: z.string().describe("Relative path to the file to read") },
  async ({ path }) => {
    const { resolved } = resolveInsideProject(path);
    const content = await readFile(resolved, "utf-8");
    const truncated = content.length > MAX_FILE_SIZE;
    return {
      content: [{
        type: "text",
        text: truncated
          ? `${content.slice(0, MAX_FILE_SIZE)}\n... (truncated, ${content.length} total chars)`
          : content,
      }],
    };
  },
);

// ---------------------------------------------------------------------------
// Ferramenta: Cria ou sobrescreve um arquivo
// Cria diretórios pai automaticamente se não existirem
// ---------------------------------------------------------------------------

server.tool(
  "write_file",
  "Create or overwrite a file in the project directory",
  {
    path: z.string().describe("Relative path to write"),
    content: z.string().describe("File contents"),
  },
  async ({ path, content }) => {
    const { cwd, resolved } = resolveInsideProject(path, "write");
    const rel = relative(cwd, resolved);
    await mkdir(dirname(resolved), { recursive: true }); // Cria diretórios pai
    await writeFile(resolved, content, "utf-8");
    return {
      content: [{ type: "text", text: `Written ${Buffer.byteLength(content, "utf-8")} bytes to ${rel}` }],
    };
  },
);

// ---------------------------------------------------------------------------
// Ferramenta: Substitui texto específico em um arquivo
// Valida que oldString existe e é única no arquivo
// ---------------------------------------------------------------------------

server.tool(
  "edit_file",
  "Replace exact text in a file. The oldString must be unique in the file",
  {
    path: z.string().describe("Relative path to edit"),
    oldString: z.string().describe("Exact text to replace"),
    newString: z.string().describe("Replacement text"),
  },
  async ({ path, oldString, newString }) => {
    const { cwd, resolved } = resolveInsideProject(path, "write");
    const rel = relative(cwd, resolved);
    const content = await readFile(resolved, "utf-8");
    const occurrences = content.split(oldString).length - 1;
    if (occurrences === 0) throw new Error("oldString not found in file");
    if (occurrences > 1) throw new Error(`oldString is ambiguous; found ${occurrences} matches`);
    await writeFile(resolved, content.replace(oldString, newString), "utf-8");
    return {
      content: [{ type: "text", text: `Replaced 1 occurrence in ${rel}` }],
    };
  },
);

// ---------------------------------------------------------------------------
// Ferramenta: Lista entradas de um diretório
// Filtra arquivos ocultos e node_modules
// ---------------------------------------------------------------------------

server.tool(
  "list_directory",
  "List entries in a directory under the project directory",
  { path: z.string().default(".").describe("Relative directory path to list") },
  async ({ path }) => {
    const { cwd, resolved } = resolveInsideProject(path);
    const rel = relative(cwd, resolved);
    const entries = await readdir(resolved);
    const results: { name: string; type: "file" | "directory" }[] = [];
    for (const entry of entries) {
      if (entry.startsWith(".") || entry === "node_modules") continue; // Ignora ocultos
      const info = await lstat(join(resolved, entry));
      if (info.isSymbolicLink()) continue;
      results.push({ name: entry, type: info.isDirectory() ? "directory" : "file" });
    }
    // Ordena: diretórios primeiro
    results.sort((a, b) =>
      a.type !== b.type ? (a.type === "directory" ? -1 : 1) : a.name.localeCompare(b.name),
    );
    return {
      content: [{ type: "text", text: JSON.stringify({ path: rel || ".", entries: results }, null, 2) }],
    };
  },
);

// ---------------------------------------------------------------------------
// Ferramenta: Busca arquivos por padrão glob
// Implementação manual: percorre diretórios recursivamente
// ---------------------------------------------------------------------------

server.tool(
  "glob",
  "Find files matching a glob pattern under the project directory",
  {
    pattern: z.string().describe("Glob pattern to match files (e.g. **/*.ts, src/**/*.css)"),
    path: z.string().default(".").describe("Directory to search from"),
  },
  async ({ pattern, path }) => {
    assertSafeGlobPattern(pattern);
    const { cwd, resolved } = resolveInsideProject(path);

    const files: string[] = [];
    const MAX_RESULTS = 200;
    const EXCLUDED_DIRS = new Set(["node_modules", ".git", ".next", "dist", "build", ".cache"]);

    // Converte padrão glob para regex
    function patternToRegex(pat: string): RegExp {
      const escaped = pat.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*").replace(/\?/g, ".");
      return new RegExp(`^${escaped}$`);
    }

    const parts = pattern.split("/");
    const hasDirWildcard = parts.some((p) => p.includes("**"));
    const filePattern = parts[parts.length - 1]!;
    const fileRegex = patternToRegex(filePattern);

    // Percorre diretórios recursivamente
    async function walk(dir: string, depth: number) {
      if (depth > 10) return; // Limite de profundidade
      let entries: string[];
      try { entries = await readdir(dir); } catch { return; }
      for (const entry of entries) {
        if (entry.startsWith(".")) continue;
        const full = join(dir, entry);
        let info;
        try { info = await lstat(full); } catch { continue; }
        if (info.isSymbolicLink()) continue;
        if (info.isDirectory()) {
          if (EXCLUDED_DIRS.has(entry)) continue;
          if (hasDirWildcard || depth > 0) {
            await walk(full, depth + 1);
          }
        } else if (fileRegex.test(entry)) {
          files.push(relative(cwd, full));
          if (files.length >= MAX_RESULTS) return;
        }
      }
    }

    await walk(resolved, 0);
    files.sort();
    return { content: [{ type: "text", text: JSON.stringify({ files }, null, 2) }] };
  },
);

// ---------------------------------------------------------------------------
// Ferramenta: Busca conteúdo em arquivos com regex
// Usa o comando grep do sistema operacional
// ---------------------------------------------------------------------------

server.tool(
  "grep",
  "Search file contents with a regular expression under the project directory",
  {
    pattern: z.string().describe("Regex pattern to search for"),
    path: z.string().default(".").describe("Directory to search from"),
    include: z.string().optional().describe("Optional glob for files to include"),
  },
  async ({ pattern, path, include }) => {
    const { cwd, resolved } = resolveInsideProject(path);
    const args = [
      "-rn", "--color=never", "--exclude-dir=node_modules", "--exclude-dir=.git",
      "--exclude=.env", "--exclude=.env.*", "--exclude=*.pem", "--exclude=*.key",
      "-E",
    ];
    if (include) args.push(`--include=${include}`);
    args.push("--", pattern, resolved);
    try {
      const stdout = execFileSync("grep", args, {
        cwd,
        encoding: "utf-8",
        maxBuffer: 1024 * 1024,
      });
      if (!stdout.trim()) {
        return { content: [{ type: "text", text: JSON.stringify({ matches: [], message: "No matches found" }) }] };
      }
      const lines = stdout.trim().split("\n");
      const matches: { file: string; line: number; content: string }[] = [];
      for (const line of lines) {
        if (matches.length >= 50) break;
        const match = line.match(/^(.+?):(\d+):(.*)$/);
        if (match) {
          matches.push({ file: relative(cwd, match[1]!), line: Number(match[2]), content: match[3]! });
        }
      }
      return { content: [{ type: "text", text: JSON.stringify({ matches, totalMatches: lines.length }, null, 2) }] };
    } catch (error) {
      // grep sai com 1 quando não há correspondências; qualquer outro código é erro real.
      if ((error as { status?: number }).status === 1) {
        return { content: [{ type: "text", text: JSON.stringify({ matches: [], message: "No matches found" }) }] };
      }
      const message = error instanceof Error ? error.message : String(error);
      return { content: [{ type: "text", text: `grep failed: ${message}` }], isError: true };
    }
  },
);

// ---------------------------------------------------------------------------
// Ferramenta: Executa comando no shell
// Retorna stdout, stderr e código de saída
// ---------------------------------------------------------------------------

server.tool(
  "bash",
  "Run a shell command in the project directory. Returns stdout, stderr, and exit code",
  {
    command: z.string().describe("Shell command to run"),
    description: z.string().optional().describe("Short description of the command"),
    timeout: z.number().optional().describe("Timeout in milliseconds"),
  },
  async ({ command, timeout = 30_000 }) => {
    const cwd = process.cwd();
    try {
      const stdout = execSync(command, {
        cwd,
        encoding: "utf-8",
        timeout,
        maxBuffer: 1024 * 1024,
        env: { ...process.env, TERM: "dumb" } as Record<string, string>,
      });
      return { content: [{ type: "text", text: truncate(stdout, MAX_OUTPUT) }] };
    } catch (err: unknown) {
      const execErr = err as Error & { stdout?: string; stderr?: string; status?: number };
      return {
        content: [{
          type: "text",
          text: truncate(
            [
              execErr.stdout ? `stdout:\n${execErr.stdout}` : "",
              execErr.stderr ? `stderr:\n${execErr.stderr}` : "",
              execErr.status !== undefined ? `exit code: ${execErr.status}` : "",
            ].filter(Boolean).join("\n"),
            MAX_OUTPUT,
          ),
        }],
      };
    }
  },
);

// ---------------------------------------------------------------------------
// Ferramenta: Lê metadados do projeto
// Lê package.json, tsconfig.json, prismcode.json, .gitignore, README
// ---------------------------------------------------------------------------

server.tool(
  "get_project_info",
  "Read key project metadata files (package.json, tsconfig, prismcode.json, .gitignore, README)",
  {},
  async () => {
    const cwd = process.cwd();
    const files = ["package.json", "tsconfig.json", "prismcode.json", ".gitignore", "README.md"];
    const result: Record<string, string | null> = {};
    for (const file of files) {
      const resolved = join(cwd, file);
      if (existsSync(resolved)) {
        try { result[file] = await readFile(resolved, "utf-8"); } catch { result[file] = null; }
      } else { result[file] = null; }
    }
    return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
  },
);

// ---------------------------------------------------------------------------
// Ferramenta: Árvore de diretórios recursiva (máx. 3 níveis)
// Mostra a estrutura do projeto
// ---------------------------------------------------------------------------

server.tool(
  "get_file_tree",
  "Get a recursive directory listing (max depth 3) showing the project structure",
  {},
  async () => {
    const cwd = process.cwd();
    const tree: Record<string, unknown> = {};
    const MAX_DEPTH = 3;

    async function walk(dir: string, obj: Record<string, unknown>, depth: number) {
      if (depth > MAX_DEPTH) return;
      const entries = await readdir(dir);
      entries.sort();
      for (const entry of entries) {
        if (entry.startsWith(".") || entry === "node_modules") continue;
        const full = join(dir, entry);
        let info;
        try { info = await lstat(full); } catch { continue; }
        if (info.isSymbolicLink()) continue;
        if (info.isDirectory()) {
          const sub: Record<string, unknown> = {};
          obj[entry] = sub;
          await walk(full, sub, depth + 1);
        } else {
          obj[entry] = "file";
        }
      }
    }

    await walk(cwd, tree, 0);
    return { content: [{ type: "text", text: JSON.stringify(tree, null, 2) }] };
  },
);

// Ferramentas utilitárias simples
server.tool("get_date", "Returns the current date", {},
  () => ({ content: [{ type: "text", text: new Date().toISOString().split("T")[0]! }] }));
server.tool("get_time", "Returns the current time", {},
  () => ({ content: [{ type: "text", text: new Date().toLocaleTimeString() }] }));
server.tool("echo", "Echos back the provided message", { message: z.string() },
  ({ message }) => ({ content: [{ type: "text", text: `Echo: ${message}` }] }));
server.tool("get_home_dir", "Returns the home directory path", {},
  () => ({ content: [{ type: "text", text: homedir() }] }));

// Conecta o servidor ao transporte stdio (comunicação via stdin/stdout)
const transport = new StdioServerTransport();
await server.connect(transport);
