#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-require-imports */
var cp = require("child_process");
var path = require("path");
var script = path.resolve(__dirname, "../dist/index.js");
try {
  cp.execSync("bun --version", { stdio: "ignore" });
  var args = process.argv.slice(2).map(a => `"${a.replace(/"/g, '\\"')}"`).join(" ");
  cp.execSync('bun run "' + script + '" ' + args, { stdio: "inherit", env: process.env });
} catch (e) {
  if (e.status === undefined) {
    console.error("Error: prismcode requires Bun to run.");
    console.error("Install it: https://bun.sh/docs/installation");
  }
  process.exit(e.status || 1);
}
