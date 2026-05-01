import { applyMigrations, createPostgresPool } from "../api/src/db/postgres";

async function run(): Promise<void> {
  const pool = createPostgresPool();
  try {
    await applyMigrations(pool);
    console.log("Postgres migrations applied.");
  } finally {
    await pool.end();
  }
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
