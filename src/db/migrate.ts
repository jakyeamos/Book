import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { PoolClient } from "pg";

import { getDbPool } from "./client";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

export async function discoverMigrationVersions(): Promise<string[]> {
  const migrationDirectory = path.join(currentDirectory, "migrations");
  const entries = await readdir(migrationDirectory, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && /^\d+_[a-z0-9_-]+\.sql$/.test(entry.name))
    .map((entry) => entry.name.slice(0, -4))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
}

async function applyMigration(client: PoolClient, version: string): Promise<void> {
  const filePath = path.join(currentDirectory, "migrations", `${version}.sql`);
  const sql = await readFile(filePath, "utf8");
  const checksum = createHash("sha256").update(sql).digest("hex");
  const existing = await client.query<{ checksum: string }>("SELECT checksum FROM v2_migrations WHERE version = $1", [version]);
  if (existing.rowCount) {
    if (existing.rows[0].checksum !== checksum) {
      throw new Error(`Migration checksum changed for ${version}.`);
    }
    return;
  }
  await client.query(sql);
  await client.query("INSERT INTO v2_migrations (version, checksum) VALUES ($1, $2)", [version, checksum]);
}

export async function migrateV2(): Promise<void> {
  const pool = getDbPool();
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(hashtext('book-v2-migrations'))");
    await client.query("BEGIN");
    await client.query("CREATE TABLE IF NOT EXISTS v2_migrations (version TEXT PRIMARY KEY, checksum TEXT NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())");
    for (const version of await discoverMigrationVersions()) {
      await applyMigration(client, version);
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext('book-v2-migrations'))");
    client.release();
  }
}
