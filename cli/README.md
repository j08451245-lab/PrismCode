<div align="center">

<br />

<h1>PrismCode</h1>

<p><strong>Open-source AI coding agent for your terminal.</strong></p>

<p>Plan, code, debug, and refactor inside your local project — with full control over models, billing, and data.</p>

<br />

<p>
  <a href="https://bun.sh"><img src="https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white" alt="Bun" /></a>&nbsp;
  <a href="https://opentui.com"><img src="https://img.shields.io/badge/OpenTUI-111111?style=for-the-badge" alt="OpenTUI" /></a>&nbsp;
  <a href="https://react.dev"><img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" /></a>&nbsp;
  <a href="https://hono.dev"><img src="https://img.shields.io/badge/Hono-E36002?style=for-the-badge&logo=hono&logoColor=white" alt="Hono" /></a>&nbsp;
  <a href="https://neon.tech"><img src="https://img.shields.io/badge/Neon-00E599?style=for-the-badge&logo=neon&logoColor=black" alt="Neon" /></a>&nbsp;
  <a href="https://clerk.com"><img src="https://img.shields.io/badge/Clerk-6C47FF?style=for-the-badge&logo=clerk&logoColor=white" alt="Clerk" /></a>&nbsp;
  <a href="https://polar.sh"><img src="https://img.shields.io/badge/Polar-000000?style=for-the-badge&logo=polar&logoColor=white" alt="Polar" /></a>&nbsp;
  <img src="https://img.shields.io/badge/license-MIT-green?style=for-the-badge" alt="MIT" />
</p>

<p>
  <a href="#features">Features</a> •
  <a href="#why-prismcode">Why PrismCode</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#packages">Packages</a> •
  <a href="#comparison">Comparison</a>
</p>

</div>

<br />

## Features

- **Terminal AI Chat** — Full-featured AI coding assistant in your terminal with OpenTUI + React
- **Plan & Build Modes** — Read-only planning, then enable write/edit/shell for implementation
- **Multi-Model** — Anthropic, OpenAI, Google, Groq, OpenRouter — or bring your own
- **Local Tool Execution** — Read, write, edit, grep, glob, bash — all inside your project
- **MCP Support** — Run MCP servers for agent tool execution
- **Skill System** — Extensible workflows via skills
- **Persistent Sessions** — Full chat history via Prisma (SQLite local, Postgres production)
- **OAuth Auth** — Clerk-powered browser-based authentication
- **Usage Billing** — Meter AI usage with Polar.sh credits (optional)
- **Streaming** — Real-time AI SDK streaming with persisted history
- **Cost Estimation** — Know what each request will cost before it runs

## Why PrismCode?

| Problem | PrismCode |
|---------|-----------|
| **Vendor lock-in** | Bring any model provider. No proprietary APIs. |
| **No data control** | Self-host or use local SQLite. Your data stays yours. |
| **Closed source** | MIT licensed. Fork, modify, audit. |
| **Single model** | Use Anthropic, OpenAI, Google, Groq, OpenRouter simultaneously. |
| **No billing control** | Built-in credit metering with Polar. Cap spending per user. |
| **No extensibility** | MCP server + skill system for custom toolchains. |

## Comparison

| Feature | PrismCode | Claude Code | Copilot CLI |
|---------|-----------|-------------|-------------|
| Open source | MIT | No | No |
| Multi-model | 5+ providers | Anthropic only | OpenAI only |
| Self-hostable | Yes | No | No |
| Local DB (SQLite) | Yes | No | No |
| MCP server | Yes | Yes | No |
| Skill system | Yes | No | No |
| Usage billing | Built-in (Polar) | Via Anthropic | Via GitHub |
| Offline mode | Partial | No | No |
| Cost estimation | Yes | No | No |
| Plan/Build modes | Yes | No | No |

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed
- PostgreSQL or SQLite (default)
- [Clerk](https://clerk.com) OAuth application (only for the server)
- At least one AI provider API key

### 1. Clone and install

```bash
git clone https://github.com/j08451245-lab/PrismCode.git
cd PrismCode/cli
bun install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your API keys. For local mode, one AI provider key is enough; Clerk credentials are only needed for the server.

### 3. Set up the database

```bash
bun run --cwd packages/database db:generate
```

SQLite is the default. For PostgreSQL, set `DATABASE_URL` in `.env` to your Postgres connection string and use `schema.postgres.prisma`.

### 4. Run the server

```bash
bun run dev:server
```

### 5. Run the CLI

```bash
bun run dev:cli
```

To build a standalone binary:

```bash
bun run build:binary
```

## Project Structure

```
packages/
├── cli/                         # OpenTUI + React terminal client
│   ├── bin/                     # prismcode executable shim
│   └── src/
│       ├── components/          # Terminal UI components, dialogs, messages
│       ├── hooks/               # Chat and UI hooks
│       ├── layouts/             # Root terminal layouts
│       ├── lib/                 # API client, auth, OAuth, local tool execution
│       ├── providers/           # Dialog, keyboard, prompt, theme, toast providers
│       └── screens/             # Home, new session, and session screens
├── database/                    # Prisma schema, generated client, database exports
├── mcp-server/                  # MCP server for agent tool execution
├── server/                      # Hono API for auth, billing, sessions, and chat
└── shared/                      # Shared schemas, tool contracts, and model registry
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev:cli` | CLI in watch mode |
| `bun run dev:server` | Server with hot reload |
| `bun run build` | Build all packages |
| `bun run build:cli` | Build CLI only |
| `bun run build:binary` | Standalone binary |
| `bun run test` | Run all tests |
| `bun run typecheck` | Type-check all packages |
| `bun run lint` | Lint all packages |
| `bun run format` | Format all source files |

## Packages

| Package | Description |
|---------|-------------|
| `@prismcode543/cli` | Terminal UI and client-side tool execution |
| `@prismcode543/server` | Hono API, AI streaming, auth, billing |
| `@prismcode543/database` | Prisma client and schema (SQLite + Postgres) |
| `@prismcode543/shared` | Zod schemas, tool contracts, model registry |
| `@prismcode543/mcp-server` | MCP server for project tool execution |

## License

MIT
