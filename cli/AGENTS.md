# Troubleshooting

## "unable to connect" error (CLI → Server)
- **Cause 1:** Server not running yet when CLI starts (race condition)
- **Cause 2:** Bun --hot on Windows has a bug — `Bun.serve()` is called again on reload, causing `EADDRINUSE`
- **Fix:** Run server WITHOUT `--hot` flag: `bun run packages/server/src/index.ts`
- **Fix:** If port 3001 is stuck, find and kill the process:
  ```powershell
  Get-NetTCPConnection -LocalPort 3001 | ForEach-Object { taskkill /F /PID $_.OwningProcess }
  ```

## "Invalid schema for function '...': schema must be a JSON Schema of 'type: \"object\"', got 'type: null'"
- **Cause:** MCP tools with empty parameters (`{}`) — the `@ai-sdk/mcp` returns `inputSchema` as `{ jsonSchema: { type: "object", properties: {} } }`, but `jsonSchema()` in the server was being called on the wrapper object instead of extracting the inner `jsonSchema` key.
- **Fix:** Extract the raw schema before passing to `jsonSchema()`:
  ```ts
  const rawSchema = mt.inputSchema as Record<string, unknown> | undefined;
  const schema = rawSchema && typeof rawSchema.jsonSchema === "object"
    ? (rawSchema.jsonSchema as Record<string, unknown>)
    : rawSchema;
  inputSchema: jsonSchema(schema ?? { type: "object", properties: {} }),
  ```
- **File:** `packages/server/src/routes/chat.ts` — the `mcpAiTools` reducer

## Server won't start (EADDRINUSE on 3001)
- Previous process didn't die cleanly
- **Fix:** Kill it manually (see first item), then restart
- **Prevention:** `dev:server` script no longer uses `--hot` (Bun --hot on Windows has a bug that causes EADDRINUSE on reload)

## Polar.sh billing errors (401 invalid_token)
- The server no longer crashes if Polar is misconfigured. Billing endpoints return friendly error messages.
- **Fix:** Update your `POLAR_ACCESS_TOKEN` in `.env`. Or remove all `POLAR_*` vars to disable billing entirely.

# Publishing

## npm publish (manual)
Publish all packages in dependency order:
```bash
# Build first
bun run build --filter='@prismcode543/shared' --filter='@prismcode543/database' --filter='@prismcode543/server' --filter='@prismcode543/cli' --filter='@prismcode543/mcp-server'

# Publish each (bun publish auto-replaces workspace:* with actual version)
bun publish --access public --cwd packages/shared
bun publish --access public --cwd packages/database
bun publish --access public --cwd packages/server
bun publish --access public --cwd packages/mcp-server
bun publish --access public --cwd packages/cli
```

## npm publish (CI)
- **Trigger:** Create a GitHub Release (tag `v*`), or manually via `workflow_dispatch`
- **Workflow:** `.github/workflows/publish.yml`
- **Requires:** `NPM_TOKEN` secret in GitHub repository settings

## GitHub Release (binary)
- **Trigger:** Push a tag `v*` (e.g. `v0.2.0`)
- **Workflow:** `.github/workflows/release.yml`
- **Output:** Windows, Linux, macOS binaries uploaded as release artifacts

## Version bumps
- All packages in the monorepo share the same version convention
- Before publishing, update `version` in packages that changed
- Use `bunx semver` or manual edit — no changesets configured yet

## Prerequisites for first publish
1. `npm login` (or `bun login`) — authenticate with npm registry
2. Create `NPM_TOKEN` secret in GitHub repo settings → `.github/workflows/publish.yml` uses it
3. Run `bun publish --dry-run --access public --cwd packages/shared` to verify package contents
