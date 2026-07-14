import type { NextRequest } from "next/server";

import { getDbPool } from "@/db/client";
import { hashSessionToken, SESSION_COOKIE_NAME } from "@/server/auth/session";

export class ReaderAuthError extends Error {
  public constructor(public readonly status = 401, message = "Sign in is required.") {
    super(message);
    this.name = "ReaderAuthError";
  }
}

export async function readReaderUserId(request: Pick<NextRequest, "cookies">): Promise<string | null> {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (!token || !process.env.DATABASE_URL) {
    return null;
  }
  const result = await getDbPool().query<{ user_id: string }>(
    `SELECT user_id FROM v2_sessions
     WHERE token_hash = $1 AND expires_at > now()
     LIMIT 1`,
    [hashSessionToken(token)],
  );
  return result.rows[0]?.user_id ?? null;
}

export async function requireReaderUser(request: Pick<NextRequest, "cookies">): Promise<string> {
  const userId = await readReaderUserId(request);
  if (!userId) {
    throw new ReaderAuthError();
  }
  return userId;
}
