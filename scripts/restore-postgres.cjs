#!/usr/bin/env node
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");

const databaseUrl = process.env.DATABASE_URL;
const source = process.argv[2] || process.env.BACKUP_FILE;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}
if (!source || !fs.existsSync(source)) {
  console.error("Backup SQL file is required");
  process.exit(1);
}

const input = fs.openSync(source, "r");
const result = spawnSync("psql", [databaseUrl], {
  stdio: [input, "inherit", "inherit"],
});
fs.closeSync(input);

process.exit(result.status || 0);
