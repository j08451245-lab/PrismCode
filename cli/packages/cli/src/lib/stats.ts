import { loadConfig } from "@prismcode543/shared";

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

function cyan(text: string): string {
  return color(text, "36");
}

function yellow(text: string): string {
  return color(text, "33");
}

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: "35",
  openai: "32",
  google: "34",
  groq: "36",
  openrouter: "33",
  ollama: "90",
};

function fmt(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "k";
  return n.toString();
}

function fmtCredits(n: number): string {
  if (n === 0) return dim("0");
  if (n < 0) return red(String(n));
  return green(String(n));
}

function bar(value: number, max: number, width: number): string {
  const len = Math.max(1, max > 0 ? Math.round((value / max) * width) : 1);
  return "█".repeat(Math.min(len, width));
}

export async function runStats() {
  const config = loadConfig(process.cwd());

  // ── Header ──
  console.log("");
  console.log(`  ${bold("Usage Statistics")}`);
  console.log(`  ${dim("─".repeat(40))}`);

  // ── Config overview ──
  const byokCount = config.byok ? Object.keys(config.byok).length : 0;
  console.log(`  ${bold("Configuration")}`);
  console.log(`    Default model: ${cyan(config.defaultModel || "not set")}`);
  console.log(`    Default mode:  ${cyan(config.defaultMode || "BUILD")}`);
  console.log(`    BYOK keys:     ${byokCount > 0 ? green(String(byokCount)) : dim("none")}`);
  if (config.byok) {
    for (const [provider] of Object.entries(config.byok)) {
      const code = PROVIDER_COLORS[provider] || "37";
      console.log(`      ${color("•", code)} ${color(provider, code)}`);
    }
  }
  console.log("");

  // ── API stats ──
  const apiUrl = config.apiUrl || process.env.API_URL || "http://localhost:3001";
  try {
    const res = await fetch(`${apiUrl}/stats`, { credentials: "include" });
    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }
    const data = await res.json() as any;

    console.log(`  ${bold("Usage")}`);
    console.log(`    ${dim("Today:")}     ${fmt(data.totals.messagesToday || 0)} msgs · ${fmtCredits(data.stats?.creditsUsed || 0)} credits`);
    console.log(`    ${dim("All time:")}  ${fmt(data.totals.messages)} msgs · ${fmtCredits(data.totals.credits)} credits`);
    console.log(`    ${dim("Tokens in:")}  ${fmt(data.totals.tokensIn)} · ${dim("out:")} ${fmt(data.totals.tokensOut)}`);
    console.log("");

    console.log(`  ${bold("Sessions")}`);
    console.log(`    ${dim("Total:")}  ${fmt(data.totals.sessions)} · ${dim("today:")} ${fmt(data.totals.sessionsToday)}`);
    console.log("");

    if (data.daily && data.daily.length > 0) {
      console.log(`  ${bold("Last 7 days")}`);
      console.log(`  ${dim("─".repeat(40))}`);
      const maxCredits = Math.max(...data.daily.map((d: { credits: number }) => d.credits), 1);
      for (const day of data.daily) {
        const date = new Date(day.date);
        const label = date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const isToday = date >= todayStart;
        const prefix = isToday ? green("▸") : dim(" ");
        const creds = day.credits || 0;
        const msgs = day.messages || 0;
        console.log(`  ${prefix} ${dim(label)} ${green(bar(creds, maxCredits, 25))} ${creds}c ${dim(`(${msgs} msgs)`)}`);
      }
      console.log("");
    }

    // ── Plan info ──
    if (data.plan) {
      console.log(`  ${bold("Plan")}`);
      console.log(`    ${data.plan.planName} ${data.plan.isUnlimited ? green("(unlimited)") : dim(`(${data.plan.remainingMessages} msgs left today)`)}`);
      console.log("");
    }

    // ── Cost estimate ──
    const totalTokensIn = data.totals.tokensIn || 0;
    const totalTokensOut = data.totals.tokensOut || 0;
    if (totalTokensIn > 0 || totalTokensOut > 0) {
      console.log(`  ${bold("Estimated Cost")}`);
      console.log(`  ${dim("  (based on avg pricing $3/M in · $15/M out)")}`);
      const estInputCost = (totalTokensIn / 1_000_000) * 3;
      const estOutputCost = (totalTokensOut / 1_000_000) * 15;
      console.log(`    ${dim("Total:")}  $${(estInputCost + estOutputCost).toFixed(2)}`);
      console.log(`    ${dim("Input:")}  $${estInputCost.toFixed(2)}`);
      console.log(`    ${dim("Output:")} $${estOutputCost.toFixed(2)}`);
      console.log("");
    }

  } catch {
    console.log(`  ${yellow("⚠")} ${dim("Could not reach server at")} ${cyan(apiUrl)}`);
    console.log(`  ${dim("Run server for full stats:")} ${cyan("bun run dev:server")}`);
    console.log("");
  }
}
