#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error("DATABASE_URL is required");
  process.exit(1);
}

const backupDir = process.env.BACKUP_DIR || path.join("backups", "postgres");
fs.mkdirSync(backupDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const target = path.join(backupDir, `book-postgres-${stamp}.sql`);
const output = fs.openSync(target, "w");
const result = spawnSync("pg_dump", [databaseUrl], {
  stdio: ["ignore", output, "inherit"],
});
fs.closeSync(output);

if (result.status !== 0) {
  fs.rmSync(target, { force: true });
  process.exit(result.status || 1);
}

console.log(target);
