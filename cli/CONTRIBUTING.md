# Contributing

## Development Setup

```bash
bun install
cp .env.example .env
bun run --cwd packages/database db:generate
```

## Commands

| Command | Description |
|---------|-------------|
| `bun run dev:cli` | Start CLI in watch mode |
| `bun run dev:server` | Start server |
| `bun run test` | Run all tests |
| `bun run typecheck` | Type-check all packages |
| `bun run lint` | Lint all packages |

## Pull Requests

1. Format your code (`bun run format`)
2. Add tests for new features
3. Ensure CI passes
4. Keep PRs focused on a single concern

## Releases

See `AGENTS.md` for publishing instructions.
