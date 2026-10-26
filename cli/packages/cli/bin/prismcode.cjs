#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
var cp = require("child_process");
var path = require("path");
var script = path.resolve(__dirname, "../dist/index.js");
try {
  cp.execFileSync("bun", ["--version"], { stdio: "ignore" });
} catch (e) {
  console.error("Error: prismcode requires Bun to run.");
  console.error("Install it: https://bun.sh/docs/installation");
  process.exit(1);
}
var result = cp.spawnSync("bun", ["run", script].concat(process.argv.slice(2)), {
  stdio: "inherit",
  env: process.env,
});
if (result.error) {
  console.error(result.error.message || "Failed to start PrismCode.");
  process.exit(1);
}
process.exit(result.status === null ? 1 : result.status);
