import { existsSync } from "node:fs";
import { readFile, writeFile, appendFile } from "node:fs/promises";
import { resolve } from "node:path";
import { saveConfig, loadGlobalConfig, SUPPORTED_CHAT_MODELS } from "@prismcode543/shared";

type ProviderInfo = {
  key: string;
  envVar: string;
  label: string;
  color: string;
  checker: string; // prefix that identifies the key format
};

const PROVIDERS: ProviderInfo[] = [
  { key: "anthropic", envVar: "ANTHROPIC_API_KEY", label: "Anthropic (Claude)", color: "35", checker: "sk-ant-" },
  { key: "openai", envVar: "OPENAI_API_KEY", label: "OpenAI (GPT)", color: "32", checker: "sk-" },
  { key: "google", envVar: "GOOGLE_API_KEY", label: "Google (Gemini)", color: "34", checker: "AIza" },
  { key: "groq", envVar: "GROQ_API_KEY", label: "Groq (Llama/Mixtral)", color: "36", checker: "gsk_" },
  { key: "openrouter", envVar: "OPENROUTER_API_KEY", label: "OpenRouter", color: "33", checker: "sk-or-" },
];

const ROOT_DIR = resolve(import.meta.dirname, "../../../..");
const ENV_PATH = resolve(ROOT_DIR, ".env");

function color(text: string, code: string): string {
  return `\x1b[${code}m${text}\x1b[0m`;
}

function bold(text: string): string {
  return `\x1b[1m${text}\x1b[0m`;
}

function dim(text: string): string {
  return `\x1b[2m${text}\x1b[0m`;
}

function green(text: string): string {
  return color(text, "32");
}

function red(text: string): string {
  return color(text, "31");
}

function yellow(text: string): string {
  return color(text, "33");
}

function cyan(text: string): string {
  return color(text, "36");
}

function magenta(text: string): string {
  return color(text, "35");
}

function ask(question: string, defaultVal?: string): Promise<string> {
  return new Promise((resolve2) => {
    const hint = defaultVal ? dim(` [${defaultVal}]`) : "";
    process.stdout.write(`  ${question}${hint}: `);
    process.stdin.once("data", (data) => {
      const input = data.toString().trim().replace(/\r?\n$/, "");
      resolve2(input || defaultVal || "");
    });
  });
}

function askHidden(question: string): Promise<string> {
  return new Promise((resolve2) => {
    process.stdout.write(`  ${question}: `);
    process.stdin.once("data", (data) => {
      const input = data.toString().trim().replace(/\r?\n$/, "");
      resolve2(input);
    });
  });
}

function promptEnter() {
  return new Promise<void>((resolve2) => {
    process.stdout.write(dim("  [Press Enter to continue]"));
    process.stdin.once("data", () => resolve2());
  });
}

function clearScreen() {
  process.stdout.write("\x1b[2J\x1b[H");
}

async function loadExistingEnv(): Promise<Record<string, string>> {
  try {
    const content = await readFile(ENV_PATH, "utf-8");
    const env: Record<string, string> = {};
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx === -1) continue;
      env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim();
    }
    return env;
  } catch {
    return {};
  }
}

function checkKeyFormat(key: string, checker: string): boolean {
  return key.startsWith(checker) && key.length >= checker.length + 10;
}

function getModelsForProvider(provider: string) {
  return SUPPORTED_CHAT_MODELS.filter((m) => m.provider === provider);
}

export async function runInit() {
  clearScreen();

  // ── Banner ──
  console.log("");
  console.log(color("  ╔══════════════════════════════════════════════╗", "36"));
  console.log(color(`  ║                                              ║`, "36"));
  console.log(color(`  ║     ${color("◈", "36")}  PRISMCODE  ${color("◈", "36")}     ║`, "36"));
  console.log(color(`  ║        Setup Wizard v1.0                      ║`, "36"));
  console.log(color(`  ║                                              ║`, "36"));
  console.log(color(`  ╚══════════════════════════════════════════════╝`, "36"));
  console.log("");

  const existingEnv = await loadExistingEnv();
  const existingConfig = loadGlobalConfig();

  // ── Detect existing config ──
  const configuredProviders = PROVIDERS.filter(
    (p) => existingEnv[p.envVar] || existingConfig.byok?.[p.key as keyof typeof existingConfig.byok],
  );
  if (configuredProviders.length > 0) {
    console.log(`  ${bold("Existing providers detected:")}`);
    for (const p of configuredProviders) {
      console.log(`    ${green("✔")} ${color(p.label, p.color)}`);
    }
    console.log("");
  }

  console.log(`  ${bold("This wizard will help you set up:")}`);
  console.log(`    ${cyan("1.")} AI providers & API keys`);
  console.log(`    ${cyan("2.")} Default model & mode`);
  console.log(`    ${cyan("3.")} Billing preference (BYOK vs Polar)`);
  console.log(`    ${cyan("4.")} Environment configuration`);
  console.log("");

  await promptEnter();
  clearScreen();

  // ── Provider Setup ──
  console.log(`\n  ${bold("AI Providers")} ${dim("— configure at least one")}\n`);

  const collectedKeys: Record<string, string> = {};
  const collectedModels: Record<string, string> = {};

  for (const provider of PROVIDERS) {
    console.log(`  ${color("──", provider.color)} ${bold(color(provider.label, provider.color))} ${dim("──")}`);

    const existingByokEntry = existingConfig.byok?.[provider.key as keyof typeof existingConfig.byok];
    const existingKey = existingEnv[provider.envVar] || (typeof existingByokEntry === "string" ? existingByokEntry : existingByokEntry?.apiKey) || "";

    if (existingKey) {
      console.log(`    ${green("✔")} Already configured ${dim("(key exists)")}`);
      const change = await ask(`Change ${provider.envVar}?`, "n");
      if (change.toLowerCase() === "y" || change.toLowerCase() === "yes") {
        const newKey = await askHidden(`Enter ${provider.envVar}`);
        if (newKey) {
          if (checkKeyFormat(newKey, provider.checker)) {
            collectedKeys[provider.key] = newKey;
            console.log(`    ${green("✔")} Key format looks valid\n`);
          } else {
            console.log(`    ${yellow("⚠")} Key format unexpected (expected to start with "${provider.checker}")`);
            const confirm = await ask("Save anyway?", "y");
            if (confirm.toLowerCase() === "y") {
              collectedKeys[provider.key] = newKey;
            }
            console.log("");
          }
        } else {
          collectedKeys[provider.key] = existingKey;
          console.log("");
        }
      } else {
        collectedKeys[provider.key] = existingKey;
        console.log("");
      }
    } else {
      const wants = await ask(`Configure ${provider.label}?`, "n");
      if (wants.toLowerCase() === "y" || wants.toLowerCase() === "yes") {
        const apiKey = await askHidden(`Enter ${provider.envVar}`);
        if (apiKey) {
          if (checkKeyFormat(apiKey, provider.checker)) {
            collectedKeys[provider.key] = apiKey;
            console.log(`    ${green("✔")} Key format looks valid\n`);
          } else {
            console.log(`    ${yellow("⚠")} Key format unexpected (expected to start with "${provider.checker}")`);
            const confirm = await ask("Save anyway?", "y");
            if (confirm.toLowerCase() === "y") {
              collectedKeys[provider.key] = apiKey;
            }
            console.log("");
          }
        } else {
          console.log(`    ${dim("Skipped.")}\n`);
        }
      } else {
        console.log("");
      }
    }

    // Model selection for this provider
    const models = getModelsForProvider(provider.key);
    if (models.length > 0 && collectedKeys[provider.key]) {
      const defaultFromConfig = existingConfig[provider.key as keyof typeof existingConfig] as { defaultModel?: string } | undefined;
      const defaultModel = defaultFromConfig?.defaultModel || models[0]!.id;
      console.log(`    ${dim("Available models:")}`);
      for (const m of models) {
        const isDefault = m.id === defaultModel;
        const pricing = m.pricing.inputUsdPerMillionTokens > 0 || m.pricing.outputUsdPerMillionTokens > 0
          ? dim(`($${m.pricing.inputUsdPerMillionTokens}/M in · $${m.pricing.outputUsdPerMillionTokens}/M out)`)
          : dim("(free)");
        console.log(`      ${isDefault ? green("›") : dim(" ")} ${m.id} ${pricing}`);
      }
      const chosen = await ask(`Default model for ${provider.label}`, defaultModel);
      const chosenModel = models.find((m) => m.id === chosen) ? chosen : defaultModel;
      collectedModels[provider.key] = chosenModel;
      console.log("");
    }
  }

  // ── Ollama ──
  console.log(`  ${color("──", "90")} ${bold(color("Ollama (local)", "90"))} ${dim("──")}`);
  const wantsOllama = await ask("Configure Ollama? (local LLM, no API key needed)", existingConfig.ollama?.baseUrl ? "y" : "n");
  let ollamaConfig: { baseUrl?: string; defaultModel?: string } | undefined;
  if (wantsOllama.toLowerCase() === "y" || wantsOllama.toLowerCase() === "yes") {
    const baseUrl = await ask("Ollama base URL", existingConfig.ollama?.baseUrl || "http://localhost:11434");
    const modelName = await ask("Default Ollama model", existingConfig.ollama?.defaultModel || "codellama");
    ollamaConfig = { baseUrl, defaultModel: modelName };
  }
  console.log("");

  // ── BYOK vs Polar ──
  clearScreen();
  console.log(`\n  ${bold("Billing Configuration")}\n`);
  console.log(`  ${bold("Two modes:")}`);
  console.log(`    ${cyan("BYOK")}  ${dim("— Bring Your Own Key. You pay AI providers directly.")}`);
  console.log(`           ${dim("No billing through PrismCode. Best for power users.")}`);
  console.log("");
  console.log(`    ${cyan("Polar")} ${dim("— Managed billing. PrismCode handles usage metering.")}`);
  console.log(`           ${dim("Supports Free/Pro/Enterprise plans with credit tracking.")}`);
  console.log("");

  const hasByokKeys = Object.values(collectedKeys).some((v) => v.length > 0);
  const useByok = await ask(
    hasByokKeys ? "Use BYOK mode? (your keys, no billing setup)" : "Use BYOK mode?",
    "y",
  );
  const isByok = useByok.toLowerCase() === "y" || useByok.toLowerCase() === "yes";

  if (!isByok) {
    console.log(`\n  ${yellow("⚠")} Polar billing requires a Polar.sh account and product setup.`);
    console.log(`  ${dim("You'll need to set these in .env manually:")}`);
    console.log(`    ${dim("POLAR_ACCESS_TOKEN, POLAR_PRODUCT_ID, etc.")}`);
    console.log(`  ${dim("See docs/POLAR.md or https://polar.sh for details.")}`);
    console.log("");
    await promptEnter();
  }

  // ── Default settings ──
  clearScreen();
  console.log(`\n  ${bold("Default Settings")}\n`);

  const allModels = Object.values(collectedModels);
  const overallDefault = allModels[0] || existingConfig.defaultModel || "claude-sonnet-4-6";
  const defaultModel = await ask("Default model for new sessions", overallDefault);
  const defaultMode = await ask("Default mode", existingConfig.defaultMode || "BUILD");

  // ── Summary ──
  clearScreen();
  console.log(`\n  ${bold("Summary")}\n`);

  if (Object.keys(collectedKeys).length > 0) {
    console.log(`  ${bold("Providers:")}`);
    for (const [k, v] of Object.entries(collectedKeys)) {
      const info = PROVIDERS.find((p) => p.key === k);
      const masked = v.slice(0, 8) + "…" + v.slice(-4);
      console.log(`    ${green("✔")} ${color(info?.label || k, info?.color || "37")} ${dim(masked)}`);
    }
  }
  if (ollamaConfig) {
    console.log(`    ${green("✔")} ${color("Ollama", "90")} ${dim(ollamaConfig.baseUrl ?? "")}`);
  }
  if (Object.keys(collectedModels).length > 0) {
    console.log(`  ${bold("Models:")}`);
    for (const [k, v] of Object.entries(collectedModels)) {
      const info = PROVIDERS.find((p) => p.key === k);
      console.log(`    ${color(info?.label || k, info?.color || "37")} → ${cyan(v)}`);
    }
  }
  console.log(`  ${bold("Mode:")} ${cyan("BYOK")}`);
  console.log(`  ${bold("Default model:")} ${cyan(defaultModel)}`);
  console.log(`  ${bold("Default mode:")} ${cyan(defaultMode)}`);
  console.log("");

  const confirmed = await ask("Apply configuration?", "y");
  if (confirmed.toLowerCase() !== "y" && confirmed.toLowerCase() !== "yes") {
    console.log(`\n  ${red("✖")} Setup cancelled. No changes made.\n`);
    process.exit(0);
  }

  // ── Write config ──
  console.log(`\n  ${dim("Writing configuration...")}`);

  const byokEntries: Record<string, string> = {};
  for (const [k, v] of Object.entries(collectedKeys)) {
    if (v) byokEntries[k] = v;
  }

  const providerConfigs: Record<string, { defaultModel?: string }> = {};
  for (const [k, v] of Object.entries(collectedModels)) {
    providerConfigs[k] = { defaultModel: v };
  }

  saveConfig({
    ...existingConfig,
    defaultModel: defaultModel || existingConfig.defaultModel,
    defaultMode: (defaultMode || existingConfig.defaultMode) as "BUILD" | "PLAN" | undefined,
    byok: Object.keys(byokEntries).length > 0 ? (byokEntries as any) : undefined,
    ollama: ollamaConfig,
    ...providerConfigs,
  });

  console.log(`    ${green("✔")} ${dim("~/.prismcode/config.json")}`);

  // ── Write .env ──
  const newEnvVars: string[] = [];
  for (const provider of PROVIDERS) {
    if (collectedKeys[provider.key]) {
      const envVal = existingEnv[provider.envVar];
      if (envVal !== collectedKeys[provider.key]) {
        newEnvVars.push(`${provider.envVar}=${collectedKeys[provider.key]}`);
      }
    }
  }

  if (newEnvVars.length > 0) {
    if (existsSync(ENV_PATH)) {
      await appendFile(ENV_PATH, "\n" + newEnvVars.join("\n") + "\n");
    } else {
      await writeFile(ENV_PATH, newEnvVars.join("\n") + "\n", "utf-8");
    }
    console.log(`    ${green("✔")} ${dim(".env updated")}`);
  } else {
    console.log(`    ${dim("- .env unchanged")}`);
  }

  console.log(`    ${green("✔")} ${dim("Configuration saved")}`);
  console.log("");

  // ── Post-install ──
  console.log(`  ${bold(color("  ◈  Setup Complete  ◈", "36"))}`);
  console.log("");

  const missingRequired = !process.env.CLERK_SECRET_KEY && !existingEnv["CLERK_SECRET_KEY"];

  console.log(`  ${bold("Next Steps:")}`);

  if (missingRequired) {
    console.log(`    ${cyan("1.")} Add Clerk keys to .env for authentication:`);
    console.log(`       ${dim("CLERK_SECRET_KEY=sk_test_...")}`);
    console.log(`       ${dim("CLERK_PUBLISHABLE_KEY=pk_test_...")}`);
  } else {
    console.log(`    ${green("✔")} ${dim("Clerk keys detected")}`);
  }

  const polarMissing = !process.env.POLAR_ACCESS_TOKEN && !existingEnv["POLAR_ACCESS_TOKEN"];
  if (!isByok && polarMissing) {
    console.log(`    ${cyan("2.")} Set up Polar billing (or use BYOK):`);
    console.log(`       ${dim("POLAR_ACCESS_TOKEN=...")}`);
    console.log(`       ${dim("POLAR_PRODUCT_ID=...")}`);
  }

  console.log(`    ${cyan(isByok ? "2." : "3.")} Start the server:`);
  console.log(`       ${dim("bun run dev:server")}`);
  console.log(`    ${cyan(isByok ? "3." : "4.")} Start the CLI:`);
  console.log(`       ${dim("bun run dev:cli")}`);
  console.log("");
  console.log(`  ${dim("Need help?")} ${cyan("https://github.com/j08451245-lab/PrismCode")}`);
  console.log("");
}
