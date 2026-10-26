import { tool } from "ai";
import { toolInputSchemas } from "@prismcode543/shared";

export const localTools = {
  readFile: tool({
    description: "Read the full contents of a file from the project. Supports all text-based file types. Truncated at 10k characters.",
    parameters: toolInputSchemas.readFile,
  }),
  listDirectory: tool({
    description: "List all files and subdirectories in a given directory (non-recursive). Shows relative paths, sorted with directories first.",
    parameters: toolInputSchemas.listDirectory,
  }),
  glob: tool({
    description: "Find files matching a glob pattern (e.g. '**/*.ts', 'src/**/*.css'). Returns up to 200 matches, sorted alphabetically.",
    parameters: toolInputSchemas.glob,
  }),
  grep: tool({
    description: "Search file contents using a regular expression. Shows file, line number, and matching line. Supports file type filtering.",
    parameters: toolInputSchemas.grep,
  }),
  writeFile: tool({
    description: "Create a new file or overwrite an existing one with the provided content. Creates parent directories automatically.",
    parameters: toolInputSchemas.writeFile,
  }),
  editFile: tool({
    description: "Search and replace exact text in a file. The oldString must match exactly once (ambiguous matches are rejected).",
    parameters: toolInputSchemas.editFile,
  }),
  bash: tool({
    description: "Execute a shell command in the project directory. Returns stdout, stderr, and exit code. Dangerous commands (rm -rf, etc.) are blocked for safety.",
    parameters: toolInputSchemas.bash,
  }),
  webSearch: tool({
    description: "Search the web for up-to-date information using DuckDuckGo. Returns top results with title, URL, and snippet.",
    parameters: toolInputSchemas.webSearch,
  }),
  gitStatus: tool({
    description: "Show the current working tree status (modified, staged, untracked files) using git status --short.",
    parameters: toolInputSchemas.gitStatus,
  }),
  gitLog: tool({
    description: "Show recent commit history using git log --oneline. Returns commit hashes and messages.",
    parameters: toolInputSchemas.gitLog,
  }),
  gitDiff: tool({
    description: "Show unstaged or staged file diffs using git diff. Can target a specific file or show all changes.",
    parameters: toolInputSchemas.gitDiff,
  }),
  gitCommit: tool({
    description: "Create a new git commit with the given message. Optionally stage all changes first.",
    parameters: toolInputSchemas.gitCommit,
  }),
};
