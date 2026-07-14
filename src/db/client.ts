import { Pool, type PoolClient } from "pg";

declare global {
  var __bookV2Pool: Pool | undefined;
}

export function getDbPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for the Book v2 database.");
  }
  globalThis.__bookV2Pool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
  return globalThis.__bookV2Pool;
}

export async function withTransaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getDbPool().connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
