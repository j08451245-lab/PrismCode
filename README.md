# PrismCode

PrismCode is an open-source coding agent for your terminal, with a desktop
workspace that runs the coding CLIs you already use next to your project.

- **`cli/`** — the terminal app: its own agent with sessions, models, MCP
  servers and skills. Built with Bun, TypeScript and React for the terminal
  (OpenTUI). Reads `prismcode.json` and calls model providers with your own keys.
- **`desktop/`** — the desktop workspace: projects, conversations, Git and a
  terminal in one window, driving Claude Code, Codex and other provider CLIs
  signed in through their own accounts. Run `/app` inside the CLI to open the
  current folder in the desktop app.

Provider plans and usage are yours; PrismCode does not include them.

## Build from source

Requirements: [Bun](https://bun.sh) and Git for the CLI; Node.js 22 and Rust
(for the desktop shell) for the desktop app. The CLI needs at least one model
provider key; the desktop app needs at least one provider CLI signed in.

```sh
git clone https://github.com/j08451245-lab/PrismCode
cd PrismCode/cli
bun install
bun run dev:cli
```

Desktop:

```sh
cd PrismCode/desktop
npm ci
npm run desktop
```

## Documentation

- [Contributing](desktop/CONTRIBUTING.md)
- [Security policy](SECURITY.md)
- [License](LICENSE)

## License

PrismCode is free, open-source software released under the MIT License. See
[LICENSE](LICENSE).
