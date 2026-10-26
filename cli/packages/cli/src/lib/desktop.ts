// =============================================================================
// Integração com o PrismCode Desktop
// Localiza o executável do app e abre a pasta atual nele.
// =============================================================================

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { posix, win32 } from "node:path";

const MISSING = "PrismCode Desktop not found. Install it, or set PRISMCODE_DESKTOP to its executable.";

/** Caminhos onde o app instalado costuma ficar, na ordem de preferência. */
export function desktopCandidates(
  env: Record<string, string | undefined> = process.env,
  platform: NodeJS.Platform = process.platform,
  home: string = homedir(),
): string[] {
  const join = platform === "win32" ? win32.join : posix.join;
  const candidates: (string | undefined)[] = [];
  if (env.PRISMCODE_DESKTOP) candidates.push(env.PRISMCODE_DESKTOP);
  if (platform === "win32") {
    if (env.LOCALAPPDATA) {
      candidates.push(join(env.LOCALAPPDATA, "Programs", "PrismCode", "PrismCode.exe"));
      candidates.push(join(env.LOCALAPPDATA, "PrismCode", "PrismCode.exe"));
    }
    if (env.ProgramFiles) candidates.push(join(env.ProgramFiles, "PrismCode", "PrismCode.exe"));
  } else if (platform === "darwin") {
    candidates.push("/Applications/PrismCode.app/Contents/MacOS/PrismCode");
    candidates.push(join(home, "Applications", "PrismCode.app", "Contents", "MacOS", "PrismCode"));
  } else {
    candidates.push(
      "/usr/bin/prismcode-desktop",
      "/usr/local/bin/prismcode-desktop",
      join(home, ".local", "bin", "prismcode-desktop"),
    );
  }
  return candidates.filter((path): path is string => Boolean(path));
}

export function findDesktopApp(
  env: Record<string, string | undefined> = process.env,
  platform: NodeJS.Platform = process.platform,
  home: string = homedir(),
): string | null {
  return desktopCandidates(env, platform, home).find((path) => existsSync(path)) ?? null;
}

/** No macOS, abrir o .app pelo bundle preserva ícone e instância única. */
export function launchSpec(
  executable: string,
  directory: string,
  platform: NodeJS.Platform = process.platform,
): { program: string; args: string[] } {
  if (executable.endsWith(".app")) {
    return { program: "open", args: ["-a", executable, "--args", directory] };
  }
  // Spawning the .exe directly leaves the window minimized when the CLI runs in a console.
  if (platform === "win32") {
    return { program: "cmd.exe", args: ["/c", "start", "", executable, directory] };
  }
  return { program: executable, args: [directory] };
}

/** Abre o app na pasta informada, sem prender o terminal. */
export function openInDesktop(directory: string, executable: string | null = findDesktopApp()): void {
  if (!executable) throw new Error(MISSING);
  const { program, args } = launchSpec(executable, directory);
  const child = spawn(program, args, { cwd: directory, detached: true, stdio: "ignore" });
  child.unref();
}
