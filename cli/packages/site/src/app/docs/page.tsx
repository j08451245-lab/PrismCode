import { Nav } from "@/components/nav";
import { Footer } from "@/components/footer";

const sections = [
  {
    title: "Quick Start",
    content: (
      <>
        <p className="mb-4 text-neutral-400">
          PrismCode runs in your terminal, inside your project directory. Clone it, install the dependencies and run the CLI:
        </p>
        <div className="mb-4 rounded-lg border border-neutral-800 bg-[#050505] p-4 font-mono text-sm">
          <div><span className="text-neutral-600">$ </span><span className="text-neutral-200">git clone https://github.com/j08451245-lab/PrismCode.git</span></div>
          <div><span className="text-neutral-600">$ </span><span className="text-neutral-200">cd PrismCode/cli</span></div>
          <div><span className="text-neutral-600">$ </span><span className="text-neutral-200">bun install</span></div>
          <div><span className="text-neutral-600">$ </span><span className="text-neutral-200">cp .env.example .env</span></div>
          <div><span className="text-neutral-600">$ </span><span className="text-neutral-200">bun run dev:cli</span></div>
        </div>
        <p className="mb-4 text-neutral-400">
          Add at least one provider key to <code className="rounded-md bg-neutral-800 px-2 py-0.5 font-mono text-sm text-neutral-300">.env</code>, or configure one in-session with <code className="rounded-md bg-neutral-800 px-2 py-0.5 font-mono text-sm text-neutral-300">/api</code>.
        </p>
        <p className="text-neutral-500 text-sm">
          Requires <a href="https://bun.sh" target="_blank" rel="noopener noreferrer" className="text-neutral-400 underline underline-offset-2 hover:text-neutral-200">Bun</a> and Git. No account is required to run locally.
        </p>
      </>
    ),
  },
  {
    title: "Commands",
    content: (
      <>
        <p className="mb-4 text-sm text-neutral-500">All commands are accessed from inside a session via <kbd className="rounded-md border border-neutral-800 bg-[#050505] px-1.5 py-0.5 font-mono text-xs">Ctrl+P</kbd>:</p>
        <div className="overflow-x-auto rounded-lg border border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-[#050505]">
                <th className="px-4 py-3 text-left font-medium text-neutral-200">Command</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-200">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50">
              {[
                ["/new", "Start a new session"],
                ["/agents", "Switch between Build / Plan mode"],
                ["/models", "Change the AI model"],
                ["/sessions", "Browse past sessions"],
                ["/skills", "Manage installed skills"],
                ["/api", "Configure provider API keys"],
                ["/app", "Open the folder in PrismCode Desktop"],
                ["/search", "Search across all sessions"],
                ["/theme", "Change the color theme"],
                ["/login", "Authenticate with Clerk"],
                ["/logout", "Clear authentication"],
                ["/upgrade", "Purchase credits"],
                ["/usage", "View credit usage"],
                ["/exit", "Quit PrismCode"],
              ].map(([cmd, desc]) => (
                <tr key={cmd} className="hover:bg-neutral-900/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-neutral-300">{cmd}</td>
                  <td className="px-4 py-3 text-neutral-500">{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex gap-4 text-sm text-neutral-500">
          <span><kbd className="rounded-md border border-neutral-800 bg-[#050505] px-1.5 py-0.5 font-mono text-xs">Tab</kbd> Toggle Build / Plan mode</span>
          <span><kbd className="rounded-md border border-neutral-800 bg-[#050505] px-1.5 py-0.5 font-mono text-xs">Esc</kbd> Cancel streaming response</span>
        </div>
      </>
    ),
  },
  {
    title: "Configuration",
    content: (
      <>
        <p className="mb-4 text-neutral-400">
          Optionally, create a <code className="rounded-md bg-neutral-800 px-2 py-0.5 font-mono text-sm text-neutral-300">prismcode.json</code> in your project root:
        </p>
        <div className="mb-4 rounded-lg border border-neutral-800 bg-[#050505] p-4 font-mono text-sm overflow-x-auto">
          <pre className="text-neutral-500">{`{
  "defaultModel": "claude-sonnet-4-6",
  "providers": {
    "anthropic": { "apiKey": "sk-ant-..." }
  },
  "ollama": {
    "baseUrl": "http://localhost:11434",
    "defaultModel": "codellama"
  },
  "mcpServers": [
    {
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "."]
    }
  ],
  "apiUrl": "http://localhost:3001"
}`}</pre>
        </div>
        <p className="text-neutral-500 text-sm">All fields are optional. Settings can also be changed in-session with <code className="rounded-md bg-neutral-800 px-1.5 py-0.5 font-mono text-xs text-neutral-300">/models</code> and <code className="rounded-md bg-neutral-800 px-1.5 py-0.5 font-mono text-xs text-neutral-300">/api</code>.</p>
        <div className="mt-6 space-y-3 text-sm text-neutral-400">
          <h3 className="font-semibold text-neutral-200">Options</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {[
              ["defaultModel", "Default model ID (e.g. claude-sonnet-4-6, gpt-5.4, gemini-2.5-pro)"],
              ["providers.<name>.apiKey", "API key per provider (Anthropic, OpenAI, Google, Groq, OpenRouter, OpenCode)"],
              ["ollama.baseUrl", "Local Ollama endpoint (default http://localhost:11434)"],
              ["ollama.defaultModel", "Local Ollama model (default codellama)"],
              ["mcpServers", "MCP servers that add tools to the agent"],
              ["apiUrl", "PrismCode API server URL (default http://localhost:3001)"],
            ].map(([key, desc]) => (
              <div key={key} className="rounded-lg border border-neutral-800 bg-neutral-900/30 p-3">
                <code className="text-xs text-neutral-300">{key}</code>
                <p className="mt-1 text-xs text-neutral-500">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </>
    ),
  },
  {
    title: "Environment Variables",
    content: (
      <>
        <p className="mb-4 text-neutral-400">Configure AI providers and services via <code className="rounded-md bg-neutral-800 px-2 py-0.5 font-mono text-sm text-neutral-300">.env</code> in the <code className="rounded-md bg-neutral-800 px-2 py-0.5 font-mono text-sm text-neutral-300">cli/</code> directory:</p>
        <div className="overflow-x-auto rounded-lg border border-neutral-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-800 bg-[#050505]">
                <th className="px-4 py-3 text-left font-medium text-neutral-200">Variable</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-200">Provider</th>
                <th className="px-4 py-3 text-left font-medium text-neutral-200">Required</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/50">
              {[
                ["ANTHROPIC_API_KEY", "Anthropic (Claude)", "At least one"],
                ["OPENAI_API_KEY", "OpenAI (GPT)", "At least one"],
                ["GOOGLE_API_KEY", "Google (Gemini)", "At least one"],
                ["GROQ_API_KEY", "Groq (Llama)", "At least one"],
                ["OPENROUTER_API_KEY", "OpenRouter", "At least one"],
                ["OPENCODE_API_KEY", "OpenCode", "At least one"],
                ["CLERK_SECRET_KEY", "Authentication", "For cloud sync"],
                ["POLAR_ACCESS_TOKEN", "Billing", "For cloud billing"],
              ].map(([varName, provider, required]) => (
                <tr key={varName} className="hover:bg-neutral-900/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-neutral-300">{varName}</td>
                  <td className="px-4 py-3 text-sm text-neutral-500">{provider}</td>
                  <td className="px-4 py-3 text-sm text-neutral-500">{required}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    ),
  },
  {
    title: "API Server (Self-Host)",
    content: (
      <>
        <p className="mb-4 text-neutral-400">
          The PrismCode server handles authentication, session persistence, and billing. Run it locally, or with Docker:
        </p>
        <div className="mb-4 rounded-lg border border-neutral-800 bg-[#050505] p-4 font-mono text-sm overflow-x-auto">
          <pre className="text-neutral-500">{`git clone https://github.com/j08451245-lab/PrismCode
cd PrismCode/cli
cp .env.example .env
# Edit .env with your keys
bun install
bun run --cwd packages/database db:generate
bun run dev:server`}</pre>
        </div>
        <div className="rounded-lg border border-neutral-800 bg-neutral-900/30 p-4 text-sm text-neutral-500">
          <p className="mb-2 font-medium text-neutral-300">Using Docker:</p>
          <pre className="font-mono text-xs">{`docker build -t prismcode/server .
docker run -p 3001:3001 --env-file .env prismcode/server`}</pre>
        </div>
        <h3 className="mb-3 mt-6 font-semibold text-neutral-200 text-sm">Required variables for self-host:</h3>
        <ul className="list-disc pl-5 text-sm text-neutral-500 space-y-1">
          <li><code className="text-neutral-300">DATABASE_URL</code> — PostgreSQL connection string</li>
          <li><code className="text-neutral-300">CLERK_SECRET_KEY</code> — Clerk secret key</li>
          <li><code className="text-neutral-300">CLERK_PUBLISHABLE_KEY</code> — Clerk publishable key</li>
          <li><code className="text-neutral-300">API_URL</code> — Your server URL (e.g. http://localhost:3001)</li>
          <li>At least one AI provider key from the table above</li>
        </ul>
      </>
    ),
  },
  {
    title: "Local Development",
    content: (
      <>
        <div className="mb-4 rounded-lg border border-neutral-800 bg-[#050505] p-4 font-mono text-sm overflow-x-auto">
          <pre className="text-neutral-500">{`git clone https://github.com/j08451245-lab/PrismCode
cd PrismCode/cli
cp .env.example .env
bun install
bun run --cwd packages/database db:generate
bun run dev:server   # Terminal 1
bun run dev:cli      # Terminal 2`}</pre>
        </div>
        <p className="text-neutral-500 text-sm">
          The CLI runs standalone without the server. Only start the server if you want cloud sync or billing.
        </p>
      </>
    ),
  },
];

export default function DocsPage() {
  return (
    <>
      <Nav />
      <main className="min-h-screen pt-20">
        <div className="mx-auto max-w-4xl px-6 py-12">
          <h1 className="text-4xl font-semibold tracking-tight text-neutral-50">
            Documentation
          </h1>
          <p className="mt-4 text-lg text-neutral-500">
            Everything you need to use PrismCode effectively.
          </p>

          <div className="mt-12 space-y-16">
            {sections.map((section) => (
              <section key={section.title} className="scroll-mt-24">
                <h2 className="mb-6 text-2xl font-semibold tracking-tight text-neutral-200">
                  {section.title}
                </h2>
                <div className="leading-relaxed">
                  {section.content}
                </div>
              </section>
            ))}
          </div>

          <div className="mt-16 rounded-lg border border-neutral-800 bg-neutral-900/30 p-8 text-center">
            <h3 className="text-base font-semibold text-neutral-200">Need help?</h3>
            <p className="mt-2 text-sm text-neutral-500">
              Open an issue on{" "}
              <a href="https://github.com/j08451245-lab/PrismCode/issues" target="_blank" rel="noopener noreferrer" className="text-neutral-400 underline underline-offset-2 hover:text-neutral-200">
                GitHub
              </a>
              .
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
