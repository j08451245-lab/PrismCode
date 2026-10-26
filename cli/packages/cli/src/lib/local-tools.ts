// =============================================================================
// Ferramentas locais do CLI - PrismCode
// Implementação local de todas as ferramentas que o agente pode usar.
// Estas rodam no CLI (não no servidor) e interagem diretamente com o
// sistema de arquivos e comandos shell do usuário.
// =============================================================================

import { lstatSync, realpathSync } from "node:fs";
import { mkdir, readFile, readdir, stat, writeFile } from "fs/promises";
import { basename, dirname, isAbsolute, join, relative, resolve } from "path";
import { toolInputSchemas, Mode, type ModeType } from "@prismcode543/shared";

// ---------------------------------------------------------------------------
// Constantes de limite e segurança
// ---------------------------------------------------------------------------

const MAX_FILE_SIZE = 10_000;      // Tamanho máximo de arquivo lido (10k chars)
const MAX_RESULTS = 200;           // Máximo de resultados em buscas
const MAX_MATCHES = 50;            // Máximo de matches no grep
const MAX_OUTPUT = 20_000;         // Máximo de saída de comandos
const DEFAULT_TIMEOUT = 30_000;    // Timeout padrão: 30 segundos

// Segmentos de caminho protegidos (não podem ser lidos/escritos)
const SENSITIVE_PATH_SEGMENTS = new Set([".git", "node_modules"]);

// Padrões de arquivos sensíveis (chaves, credenciais, .env)
const SENSITIVE_FILE_PATTERNS = [
  /(^|[/\\])\.env($|\.)/i,            // .env, apps/web/.env.local, etc.
  /(^|[/\\])id_(rsa|dsa|ecdsa|ed25519)$/i, // Chaves SSH
  /(^|[/\\]).*\.pem$/i,              // Certificados PEM
  /(^|[/\\]).*\.key$/i,              // Chaves privadas
  /(^|[/\\]).*credentials.*$/i,      // Arquivos de credenciais
];

// Padrões de comandos perigosos que devem ser bloqueados
const DANGEROUS_COMMAND_PATTERNS = [
  /\brm\s+(-[a-zA-Z]*[rR][a-zA-Z]*\b|--recursive\b)/i, // rm recursivo (-r, -rf, -fr, --recursive)
  /\bgit\s+reset\s+--hard\b/i,        // git reset --hard
  /\bgit\s+clean\s+-[^\s]*[fdx][^\s]*/i, // git clean -fdx
  /\bgit\s+restore\b/i,               // git restore (descarta mudanças)
  /\bgit\s+checkout\s+(--\s|\.[\s]|\.$|-f\b)/i, // git checkout -- ., git checkout ., git checkout -f
  /\bgit\s+push\b[\s\S]*\s(--force(-with-lease)?|-f)(\s|$)/i, // git push --force / -f
  /\bfind\b[\s\S]*\s-delete\b/i,      // find ... -delete
  /\b(del|erase)\s+\/[sfq]/i,         // del /s (Windows)
  /\b(rd|rmdir)\s+\/s/i,              // rd /s (Windows)
  /\b(Remove-Item|ri)\b[\s\S]*\s-(recurse|r)\b/i, // Remove-Item -Recurse (PowerShell)
  /\b(curl|wget)\b[\s\S]*(\||;|&&)\s*(sh|bash|zsh|powershell|pwsh|cmd)\b/i, // pipe para shell
  /\b(Invoke-WebRequest|iwr|irm|Invoke-RestMethod)\b[\s\S]*\|\s*(iex|Invoke-Expression)\b/i, // PowerShell eval
  /\bchmod\s+-R\s+777\b/i,           // chmod 777
  /\bmkfs(\.|$|\s)/i,                // mkfs (formatar disco)
  /\bdd\s+if=.*\s+of=\/dev\//i,      // dd para device
];

// ---------------------------------------------------------------------------
// Funções de validação de caminho
// ---------------------------------------------------------------------------

// Verifica se um caminho não contém segmentos ou padrões sensíveis
export function assertPathAllowed(path: string, operation: "read" | "write") {
  const normalized = path.replace(/\\/g, "/");
  const segments = normalized.split("/").filter(Boolean);

  for (const segment of segments) {
    if (SENSITIVE_PATH_SEGMENTS.has(segment)) {
      throw new Error(`Refusing to ${operation} protected path segment: ${segment}`);
    }
  }

  if (SENSITIVE_FILE_PATTERNS.some((pattern) => pattern.test(normalized))) {
    throw new Error(`Refusing to ${operation} sensitive file path: ${path}`);
  }
}

// Resolve o alvo (ou o ancestral existente mais próximo) para impedir que
// symlinks apontem para fora do projeto. Devolve o caminho canônico.
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

// Resolve um caminho relativo para dentro do diretório de trabalho
// Lança erro se o caminho escapar do projeto (path traversal ou symlink)
export function resolveInsideCwd(path: string, operation: "read" | "write" = "read") {
  const cwd = realpathSync(process.cwd());
  const resolved = resolve(cwd, path);
  const rel = relative(cwd, resolved);

  if (rel.startsWith("..") || isAbsolute(rel)) {
    throw new Error("Path is outside the project directory");
  }

  assertPathAllowed(rel || ".", operation);

  return { cwd, resolved: canonicalInside(cwd, resolved) };
}

// Padrões de glob não podem ser absolutos nem subir com "..".
export function assertSafeGlobPattern(pattern: string) {
  const normalized = pattern.replace(/\\/g, "/");
  const segments = normalized.split("/");

  if (isAbsolute(pattern) || /^[a-zA-Z]:/.test(pattern) || segments.includes("..")) {
    throw new Error("Glob pattern must stay inside the project directory");
  }
}

// Trunca texto longo para não sobrecarregar o agente
function truncate(value: string, limit: number) {
  return value.length > limit
    ? `${value.slice(0, limit)}\n... (truncated, ${value.length} total chars)`
    : value;
}

// Obtém um resumo rápido do estado do working tree git
async function getWorkingTreeSummary() {
  const cwd = process.cwd();
  const statusProc = Bun.spawn(["git", "status", "--short"], { cwd, stdout: "pipe", stderr: "pipe" });
  const statProc = Bun.spawn(["git", "diff", "--stat"], { cwd, stdout: "pipe", stderr: "pipe" });

  const [statusOut, statusErr, statOut, statErr] = await Promise.all([
    new Response(statusProc.stdout).text(),
    new Response(statusProc.stderr).text(),
    new Response(statProc.stdout).text(),
    new Response(statProc.stderr).text(),
  ]);
  const [statusCode, statCode] = await Promise.all([statusProc.exited, statProc.exited]);

  if (statusCode !== 0 || statCode !== 0) {
    return { available: false as const, error: truncate((statusErr || statErr || "git summary unavailable").trim(), 500) };
  }

  return {
    available: true as const,
    status: statusOut.trim() || "Working tree clean",
    diffStat: statOut.trim() || "(no unstaged diff)",
  };
}

// Verifica se um comando shell é seguro para executar
export function assertSafeShellCommand(command: string) {
  const compact = command.replace(/\s+/g, " ").trim();

  if (!compact) {
    throw new Error("Refusing to run an empty shell command");
  }

  for (const pattern of DANGEROUS_COMMAND_PATTERNS) {
    if (pattern.test(compact)) {
      throw new Error(`Refusing to run high-risk shell command: ${compact.slice(0, 180)}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Função principal: executa uma ferramenta local
// Recebe nome da ferramenta, input, e modo atual
// ---------------------------------------------------------------------------

export async function executeLocalTool(toolName: string, input: unknown, mode: ModeType) {
  // No modo PLAN, só permite ferramentas de leitura
  if (mode === Mode.PLAN && !["readFile", "listDirectory", "glob", "grep", "webSearch", "gitStatus", "gitLog", "gitDiff"].includes(toolName)) {
    throw new Error(`Tool ${toolName} is not available in PLAN mode`);
  }

  switch (toolName) {
    // Lê conteúdo de um arquivo
    case "readFile": {
      const { path } = toolInputSchemas.readFile.parse(input);
      const { resolved } = resolveInsideCwd(path);
      const content = await readFile(resolved, "utf-8");
      return content.length > MAX_FILE_SIZE
        ? { content: content.slice(0, MAX_FILE_SIZE), truncated: true, totalLength: content.length }
        : { content };
    }

    // Lista entradas de um diretório
    case "listDirectory": {
      const { path } = toolInputSchemas.listDirectory.parse(input);
      const { cwd, resolved } = resolveInsideCwd(path);
      const entries = await readdir(resolved);
      const results: { name: string; type: "file" | "directory" }[] = [];

      for (const entry of entries) {
        if (entry.startsWith(".") || entry === "node_modules") continue; // Ignora ocultos
        const info = await stat(join(resolved, entry));
        results.push({ name: entry, type: info.isDirectory() ? "directory" : "file" });
      }

      // Ordena: diretórios primeiro, depois por nome
      results.sort((a, b) =>
        a.type !== b.type ? (a.type === "directory" ? -1 : 1) : a.name.localeCompare(b.name),
      );
      return { path: relative(cwd, resolved) || ".", entries: results };
    }

    // Busca arquivos por padrão glob
    case "glob": {
      const { pattern, path } = toolInputSchemas.glob.parse(input);
      assertSafeGlobPattern(pattern);
      const { cwd, resolved } = resolveInsideCwd(path);
      const glob = new Bun.Glob(pattern);
      const files: string[] = [];
      let truncated = false;

      for await (const match of glob.scan({ cwd: resolved, dot: false, onlyFiles: true })) {
        if (match.includes("node_modules")) continue;
        if (files.length >= MAX_RESULTS) { truncated = true; break; }

        // Um symlink dentro do projeto pode apontar para fora; só lista o alvo real.
        let real: string;
        try {
          real = realpathSync(resolve(resolved, match));
        } catch {
          continue;
        }
        const rel = relative(cwd, real);
        if (rel.startsWith("..") || isAbsolute(rel)) continue;
        files.push(rel);
      }

      files.sort();
      return { files, ...(truncated ? { truncated: true } : {}) };
    }

    // Busca conteúdo em arquivos com regex (usa grep do sistema)
    case "grep": {
      const { pattern, path, include } = toolInputSchemas.grep.parse(input);
      const { cwd, resolved } = resolveInsideCwd(path);
      const args = ["-rn", "--color=never", "--exclude-dir=node_modules", "--exclude-dir=.git", "-E"];
      if (include) args.push(`--include=${include}`);
      args.push(pattern, resolved);

      const proc = Bun.spawn(["grep", ...args], { cwd, stdout: "pipe", stderr: "pipe" });
      const [stdout, stderr] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);
      const exitCode = await proc.exited;

      if (exitCode !== 0 && exitCode !== 1) throw new Error(`grep failed: ${stderr.trim()}`);
      if (!stdout.trim()) return { matches: [], message: "No matches found" };

      const lines = stdout.trim().split("\n");
      const matches: { file: string; line: number; content: string }[] = [];
      let truncated = false;

      for (const line of lines) {
        if (matches.length >= MAX_MATCHES) { truncated = true; break; }
        const match = line.match(/^(.+?):(\d+):(.*)$/);
        if (match) {
          matches.push({ file: relative(cwd, match[1]!), line: Number(match[2]), content: match[3]! });
        }
      }

      return { matches, ...(truncated ? { truncated: true, totalMatches: lines.length } : {}) };
    }

    // Cria ou sobrescreve um arquivo
    case "writeFile": {
      const { path, content } = toolInputSchemas.writeFile.parse(input);
      const { cwd, resolved } = resolveInsideCwd(path, "write");
      await mkdir(dirname(resolved), { recursive: true }); // Cria diretórios pai
      await writeFile(resolved, content, "utf-8");
      return { success: true as const, path: relative(cwd, resolved), bytesWritten: Buffer.byteLength(content, "utf-8"), workingTree: await getWorkingTreeSummary() };
    }

    // Substitui texto específico em um arquivo
    case "editFile": {
      const { path, oldString, newString } = toolInputSchemas.editFile.parse(input);
      const { cwd, resolved } = resolveInsideCwd(path, "write");
      const content = await readFile(resolved, "utf-8");
      const occurrences = content.split(oldString).length - 1;

      if (occurrences === 0) throw new Error("oldString not found in file");
      if (occurrences > 1) throw new Error(`oldString is ambiguous; found ${occurrences} matches`);

      await writeFile(resolved, content.replace(oldString, newString), "utf-8");
      return { success: true as const, path: relative(cwd, resolved), workingTree: await getWorkingTreeSummary() };
    }

    // Executa comando no shell
    case "bash": {
      const { command, timeout = DEFAULT_TIMEOUT } = toolInputSchemas.bash.parse(input);
      assertSafeShellCommand(command); // Verifica se é seguro
      const proc = Bun.spawn(["bash", "-c", command], {
        cwd: resolveInsideCwd(".").resolved,
        stdout: "pipe",
        stderr: "pipe",
        env: { ...process.env, TERM: "dumb" },
      });
      const timer = setTimeout(() => proc.kill(), timeout); // Timeout
      const [stdout, stderr] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
      ]);
      const exitCode = await proc.exited;
      clearTimeout(timer);
      return { stdout: truncate(stdout, MAX_OUTPUT), stderr: truncate(stderr, MAX_OUTPUT), exitCode, workingTree: await getWorkingTreeSummary() };
    }

    // Comandos Git
    case "gitStatus": {
      const proc = Bun.spawn(["git", "status", "--short"], { cwd: process.cwd(), stdout: "pipe", stderr: "pipe" });
      const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
      const exitCode = await proc.exited;
      if (exitCode !== 0) throw new Error(`git status failed: ${stderr.trim()}`);
      return { status: stdout || "Working tree clean" };
    }

    case "gitLog": {
      const { maxCount } = toolInputSchemas.gitLog.parse(input);
      const proc = Bun.spawn(["git", "log", `--max-count=${maxCount}`, "--oneline", "--decorate"], { cwd: process.cwd(), stdout: "pipe", stderr: "pipe" });
      const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
      const exitCode = await proc.exited;
      if (exitCode !== 0) throw new Error(`git log failed: ${stderr.trim()}`);
      return { log: stdout || "(no commits)" };
    }

    case "gitDiff": {
      const { path, staged } = toolInputSchemas.gitDiff.parse(input);
      const args = ["git", "diff"];
      if (staged) args.push("--staged");
      if (path) args.push("--", resolveInsideCwd(path).resolved);
      const proc = Bun.spawn(args, { cwd: process.cwd(), stdout: "pipe", stderr: "pipe" });
      const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
      const exitCode = await proc.exited;
      if (exitCode !== 0) throw new Error(`git diff failed: ${stderr.trim()}`);
      return { diff: stdout || "(no changes)" };
    }

    case "gitCommit": {
      const { message, addAll } = toolInputSchemas.gitCommit.parse(input);
      if (addAll) {
        const add = Bun.spawn(["git", "add", "-A"], { cwd: process.cwd(), stdout: "pipe", stderr: "pipe" });
        await add.exited;
      }
      const proc = Bun.spawn(["git", "commit", "-m", message], { cwd: process.cwd(), stdout: "pipe", stderr: "pipe" });
      const [stdout, stderr] = await Promise.all([new Response(proc.stdout).text(), new Response(proc.stderr).text()]);
      const exitCode = await proc.exited;
      if (exitCode !== 0) throw new Error(`git commit failed: ${stderr.trim()}`);
      return { success: true, output: stdout.trim() };
    }

    // Busca na web (usa DuckDuckGo)
    case "webSearch": {
      const { query, numResults } = toolInputSchemas.webSearch.parse(input);
      const maxResults = Math.min(Math.max(1, numResults), 10);

      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const response = await fetch(searchUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; PrismCode/1.0)" },
        signal: AbortSignal.timeout(15000),
      });
      const html = await response.text();

      // Parseia o HTML do DuckDuckGo para extrair resultados
      const results: { title: string; snippet: string; url: string }[] = [];
      const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
      let match: RegExpExecArray | null;

      while ((match = resultRegex.exec(html)) !== null && results.length < maxResults) {
        const rawUrl = match[1]!.replace(/\/\/duckduckgo\.com\/l\/\?uddg=/, "").replace(/&rut=.*$/, "");
        const title = match[2]!.replace(/<[^>]+>/g, "").trim();
        const snippet = match[3]!.replace(/<[^>]+>/g, "").trim();
        let url = rawUrl;
        try {
          url = decodeURIComponent(rawUrl);
        } catch {
          // Percent-encoding inválido no HTML: mantém a URL como veio.
        }
        results.push({ url, title, snippet });
      }

      return { query, results, totalResults: results.length };
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`);
  }
};

