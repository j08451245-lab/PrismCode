import { existsSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Windows-only: @libsql native module needs a direct dependency for Bun
if (process.platform !== "win32") {
  process.exit(0);
}

const libsqlDir = join(root, "node_modules", "@libsql");
const target = join(libsqlDir, "win32-x64-msvc");
const source = join(
  root,
  "node_modules",
  ".bun",
  "@libsql+win32-x64-msvc@0.5.29",
  "node_modules",
  "@libsql",
  "win32-x64-msvc"
);

if (!existsSync(target) && existsSync(source)) {
  if (!existsSync(libsqlDir)) mkdirSync(libsqlDir, { recursive: true });
  try {
    execSync(`mklink /J "${target}" "${source}"`, { shell: "cmd" });
    console.log("Created symlink: @libsql/win32-x64-msvc");
  } catch (e) {
    console.log("Could not create symlink for @libsql/win32-x64-msvc:", e.message);
  }
}
