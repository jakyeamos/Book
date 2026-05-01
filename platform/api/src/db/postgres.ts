import * as fs from "node:fs/promises";
import * as path from "node:path";
import { Pool } from "pg";

export function createPostgresPool(databaseUrl = process.env.DATABASE_URL): Pool {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for Postgres mode");
  }

  return new Pool({ connectionString: databaseUrl });
}

export async function applyMigrations(
  pool: Pool,
  migrationsDir = path.join(process.cwd(), "platform", "api", "src", "db", "migrations"),
): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);

  const entries = (await fs.readdir(migrationsDir))
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort();

  for (const fileName of entries) {
    const existing = await pool.query("SELECT id FROM schema_migrations WHERE id = $1", [fileName]);
    if (existing.rows.length > 0) {
      continue;
    }

    const sql = await fs.readFile(path.join(migrationsDir, fileName), "utf8");
    await pool.query("BEGIN");
    try {
      await pool.query(sql);
      await pool.query("INSERT INTO schema_migrations (id, applied_at) VALUES ($1, $2)", [
        fileName,
        new Date().toISOString(),
      ]);
      await pool.query("COMMIT");
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  }
}
