// =============================================================================
// Indexador de projetos - PrismCode
// Escaneia o diretório do projeto para criar um índice completo:
// lista de arquivos, árvore de diretórios, linguagens usadas,
// e arquivos de configuração importantes.
// Usado para dar contexto ao agente IA sobre a estrutura do projeto.
// =============================================================================

import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, basename } from "node:path";

// Limites de segurança
const MAX_FILES = 500;  // Máximo de arquivos indexados
const MAX_DEPTH = 8;    // Profundidade máxima de扫描

// Extensões de arquivos binários (não são indexados como código)
const BINARY_EXTENSIONS = new Set([
  ".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".ico",  // Imagens
  ".woff", ".woff2", ".ttf", ".eot",                          // Fontes
  ".zip", ".gz", ".tar", ".rar", ".7z",                       // Comprimidos
  ".mp3", ".mp4", ".wav", ".ogg",                              // Áudio/Vídeo
  ".pdf", ".doc", ".docx", ".xls", ".xlsx",                    // Documentos
  ".exe", ".dll", ".so", ".dylib", ".wasm",                    // Binários
  ".svg",                                                      // SVG (tratado separadamente)
]);

// Arquivos de configuração importantes (lidos e incluídos no índice)
const KEY_CONFIG_FILES = new Set([
  "package.json", "tsconfig.json", "tsconfig.base.json",
  "prismcode.json", ".env.example", "Dockerfile",
  "docker-compose.yml", "docker-compose.yaml",
  ".eslintrc", ".eslintrc.json", ".eslintrc.js",
  ".prettierrc", ".prettierrc.json", ".prettierrc.js",
  "bun.lock", "pnpm-lock.yaml", "yarn.lock", "package-lock.json",
  "turbo.json", "nx.json", "lerna.json",
  "README.md", "CONTRIBUTING.md",
]);

// Tipos de entrada de arquivo
type FileEntry = {
  path: string;     // Caminho relativo
  size: number;     // Tamanho em bytes
  isDir: boolean;   // Se é diretório
};

// Tipo de arquivo de configuração lido
type ConfigFile = {
  path: string;      // Caminho relativo
  content: string;   // Conteúdo (primeiros 2000 chars)
};

// Tipo do índice do projeto completo
export type ProjectIndex = {
  root: string;                    // Diretório raiz
  files: FileEntry[];              // Lista de todos os arquivos
  totalFiles: number;              // Total de arquivos
  totalDirs: number;               // Total de diretórios
  configFiles: ConfigFile[];       // Arquivos de configuração
  languages: Record<string, number>; // Linguagens e quantidade de arquivos
  tree: string;                    // Árvore em formato texto
  generatedAt: number;             // Timestamp da geração
};

// Mapeia extensão para nome da linguagem
function getLanguage(ext: string): string {
  const map: Record<string, string> = {
    ".ts": "TypeScript", ".tsx": "TypeScript React", ".js": "JavaScript",
    ".jsx": "JavaScript React", ".json": "JSON", ".md": "Markdown",
    ".css": "CSS", ".scss": "SCSS", ".html": "HTML", ".py": "Python",
    ".rs": "Rust", ".go": "Go", ".java": "Java", ".rb": "Ruby",
    ".php": "PHP", ".c": "C", ".cpp": "C++", ".h": "C Header",
    ".yaml": "YAML", ".yml": "YAML", ".toml": "TOML", ".xml": "XML",
    ".sh": "Shell", ".bash": "Shell", ".ps1": "PowerShell",
    ".sql": "SQL", ".graphql": "GraphQL", ".proto": "Protobuf",
    ".svelte": "Svelte", ".vue": "Vue", ".astro": "Astro",
  };
  return map[ext] ?? "";
}

// Verifica se um arquivo/diretório deve ser ignorado
function isIgnored(name: string, ignorePatterns: string[]): boolean {
  return ignorePatterns.some((p) => {
    if (p.endsWith("/")) return name === p.slice(0, -1);
    return name === p || name.startsWith(p + "/") || name.endsWith("/" + p);
  });
}

// Escaneia um diretório recursivamente
async function scanDir(
  dir: string,
  relativeDir: string,
  ignorePatterns: string[],
  depth: number,
  files: FileEntry[],
  configFiles: ConfigFile[],
  languages: Record<string, number>,
): Promise<void> {
  if (depth > MAX_DEPTH || files.length > MAX_FILES) return;

  let entries: string[];
  try { entries = await readdir(dir); } catch { return; }

  for (const name of entries) {
    if (name.startsWith(".")) continue; // Ignora ocultos
    const fullPath = join(dir, name);
    const relPath = relativeDir ? `${relativeDir}/${name}` : name;

    if (isIgnored(name, ignorePatterns) || isIgnored(relPath, ignorePatterns)) continue;

    let stats;
    try { stats = await stat(fullPath); } catch { continue; }

    if (stats.isDirectory()) {
      // Workspaces (packages/, src/, apps/, lib/) não aumentam profundidade
      const isWorkspace = name.startsWith("packages") || name === "src" || name === "apps" || name === "lib";
      files.push({ path: relPath + "/", size: 0, isDir: true });
      await scanDir(fullPath, relPath, ignorePatterns, isWorkspace ? depth : depth + 1, files, configFiles, languages);
    } else if (stats.isFile()) {
      files.push({ path: relPath, size: stats.size, isDir: false });

      // Conta linguagens por extensão
      const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
      if (ext && !BINARY_EXTENSIONS.has(ext)) {
        const lang = getLanguage(ext);
        if (lang) languages[lang] = (languages[lang] ?? 0) + 1;
      }

      // Lê arquivos de configuração importantes
      if (KEY_CONFIG_FILES.has(name)) {
        try {
          const content = await readFile(fullPath, "utf-8");
          configFiles.push({ path: relPath, content: content.slice(0, 2000) }); // Limita a 2k chars
        } catch {}
      }
    }
  }
}

// Gera árvore de diretórios em formato texto com ícones
function buildTree(files: FileEntry[]): string {
  const lines: string[] = [];
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));

  for (const f of sorted) {
    const depth = f.path.split("/").length - 1;
    const prefix = "  ".repeat(depth) + (f.isDir ? "📁 " : "📄 ");
    const size = f.isDir ? "" : ` (${formatSize(f.size)})`;
    lines.push(prefix + f.path + size);
  }

  return lines.join("\n");
}

// Formata tamanho de bytes para legível
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// ---------------------------------------------------------------------------
// Função principal: constrói o índice completo do projeto
// ---------------------------------------------------------------------------

export async function buildProjectIndex(cwd: string, ignorePatterns: string[] = []): Promise<ProjectIndex> {
  // Padrões de ignore sempre presentes
  const defaults = ["node_modules", ".git", "dist", "build", ".next", ".cache", ".turbo", "coverage"];
  const allIgnore = [...new Set([...defaults, ...ignorePatterns])];

  const files: FileEntry[] = [];
  const configFiles: ConfigFile[] = [];
  const languages: Record<string, number> = {};

  await scanDir(cwd, "", allIgnore, 0, files, configFiles, languages);

  const totalFiles = files.filter((f) => !f.isDir).length;
  const totalDirs = files.filter((f) => f.isDir).length;

  return {
    root: cwd,
    files,
    totalFiles,
    totalDirs,
    configFiles,
    languages,
    tree: buildTree(files),
    generatedAt: Date.now(),
  };
}

// Formata o índice como resumo legível
function formatIndexSummary(index: ProjectIndex): string {
  const langSummary = Object.entries(index.languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([lang, count]) => `${lang} (${count} files)`)
    .join(", ");

  const parts: string[] = [
    `## Project Index\n`,
    `Root: \`${index.root}\``,
    `Total: ${index.totalFiles} files, ${index.totalDirs} directories`,
    langSummary ? `Languages: ${langSummary}` : "",
    ``,
    `### File Tree`,
    "```",
    index.tree,
    "```",
  ];

  if (index.configFiles.length > 0) {
    parts.push(``, `### Key Configuration Files`);
    for (const cf of index.configFiles) {
      parts.push(``, `**${cf.path}**:`, "```", cf.content, "````);
    }
  }

  return parts.filter(Boolean).join("\n");
}

// Constrói o contexto do projeto para enviar ao agente IA
export function buildProjectContext(index: ProjectIndex): string {
  return `You are working in the project at \`${index.root}\`. Below is the project structure and configuration to help you understand the codebase without the user needing to explain it.\n\n${formatIndexSummary(index)}`;
}

// Cache do índice para evitar re-escaneamento
let cachedIndex: { index: ProjectIndex; cwd: string; mtime: number } | null = null;

// Obtém o índice do projeto (com cache de 30 segundos)
export async function getProjectIndex(cwd: string, ignorePatterns: string[] = [], forceRefresh = false): Promise<ProjectIndex> {
  if (!forceRefresh && cachedIndex && cachedIndex.cwd === cwd && Date.now() - cachedIndex.mtime < 30000) {
    return cachedIndex.index; // Usa cache
  }
  const index = await buildProjectIndex(cwd, ignorePatterns);
  cachedIndex = { index, cwd, mtime: Date.now() };
  return index;
}

function isIgnored(name: string, ignorePatterns: string[]): boolean {
  return ignorePatterns.some((p) => {
    if (p.endsWith("/")) return name === p.slice(0, -1);
    return name === p || name.startsWith(p + "/") || name.endsWith("/" + p);
  });
}

async function scanDir(
  dir: string,
  relativeDir: string,
  ignorePatterns: string[],
  depth: number,
  files: FileEntry[],
  configFiles: ConfigFile[],
  languages: Record<string, number>,
): Promise<void> {
  if (depth > MAX_DEPTH || files.length > MAX_FILES) return;

  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return;
  }

  for (const name of entries) {
    if (name.startsWith(".")) continue;
    const fullPath = join(dir, name);
    const relPath = relativeDir ? `${relativeDir}/${name}` : name;

    if (isIgnored(name, ignorePatterns) || isIgnored(relPath, ignorePatterns)) continue;

    let stats;
    try {
      stats = await stat(fullPath);
    } catch {
      continue;
    }

    if (stats.isDirectory()) {
      const isWorkspace = name.startsWith("packages") || name === "src" || name === "apps" || name === "lib";
      files.push({ path: relPath + "/", size: 0, isDir: true });
      await scanDir(fullPath, relPath, ignorePatterns, isWorkspace ? depth : depth + 1, files, configFiles, languages);
    } else if (stats.isFile()) {
      files.push({ path: relPath, size: stats.size, isDir: false });

      const ext = name.slice(name.lastIndexOf(".")).toLowerCase();
      if (ext && !BINARY_EXTENSIONS.has(ext)) {
        const lang = getLanguage(ext);
        if (lang) languages[lang] = (languages[lang] ?? 0) + 1;
      }

      if (KEY_CONFIG_FILES.has(name)) {
        try {
          const content = await readFile(fullPath, "utf-8");
          configFiles.push({ path: relPath, content: content.slice(0, 2000) });
        } catch {}
      }
    }
  }
}

function buildTree(files: FileEntry[]): string {
  const lines: string[] = [];
  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));

  for (const f of sorted) {
    const depth = f.path.split("/").length - 1;
    const prefix = "  ".repeat(depth) + (f.isDir ? "📁 " : "📄 ");
    const size = f.isDir ? "" : ` (${formatSize(f.size)})`;
    lines.push(prefix + f.path + size);
  }

  return lines.join("\n");
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

export async function buildProjectIndex(cwd: string, ignorePatterns: string[] = []): Promise<ProjectIndex> {
  const defaults = ["node_modules", ".git", "dist", "build", ".next", ".cache", ".turbo", "coverage"];
  const allIgnore = [...new Set([...defaults, ...ignorePatterns])];

  const files: FileEntry[] = [];
  const configFiles: ConfigFile[] = [];
  const languages: Record<string, number> = {};

  await scanDir(cwd, "", allIgnore, 0, files, configFiles, languages);

  const totalFiles = files.filter((f) => !f.isDir).length;
  const totalDirs = files.filter((f) => f.isDir).length;

  return {
    root: cwd,
    files,
    totalFiles,
    totalDirs,
    configFiles,
    languages,
    tree: buildTree(files),
    generatedAt: Date.now(),
  };
}

function formatIndexSummary(index: ProjectIndex): string {
  const langSummary = Object.entries(index.languages)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([lang, count]) => `${lang} (${count} files)`)
    .join(", ");

  const parts: string[] = [
    `## Project Index\n`,
    `Root: \`${index.root}\``,
    `Total: ${index.totalFiles} files, ${index.totalDirs} directories`,
    langSummary ? `Languages: ${langSummary}` : "",
    ``,
    `### File Tree`,
    "```",
    index.tree,
    "```",
  ];

  if (index.configFiles.length > 0) {
    parts.push(``, `### Key Configuration Files`);
    for (const cf of index.configFiles) {
      parts.push(``, `**${cf.path}**:`, "```", cf.content, "```");
    }
  }

  return parts.filter(Boolean).join("\n");
}

export function buildProjectContext(index: ProjectIndex): string {
  return `You are working in the project at \`${index.root}\`. Below is the project structure and configuration to help you understand the codebase without the user needing to explain it.\n\n${formatIndexSummary(index)}`;
}

let cachedIndex: { index: ProjectIndex; cwd: string; mtime: number } | null = null;

export async function getProjectIndex(cwd: string, ignorePatterns: string[] = [], forceRefresh = false): Promise<ProjectIndex> {
  if (!forceRefresh && cachedIndex && cachedIndex.cwd === cwd && Date.now() - cachedIndex.mtime < 30000) {
    return cachedIndex.index;
  }
  const index = await buildProjectIndex(cwd, ignorePatterns);
  cachedIndex = { index, cwd, mtime: Date.now() };
  return index;
}
