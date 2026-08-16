import type { Pool } from "pg";

import { getDbPool } from "@/db/client";

export interface RevisionHistoryEntry {
  id: string;
  revisionNumber: number;
  status: "draft" | "published";
  visibility: "public" | "direct-link" | "conditional";
  createdBy: string | null;
  createdAt: string;
}

interface RevisionHistoryRow {
  id: string;
  revision_number: number | string;
  status: RevisionHistoryEntry["status"];
  visibility: RevisionHistoryEntry["visibility"];
  created_by: string | null;
  created_at: Date | string;
}

export async function listRevisionHistory(chapterId: string, pool: Pool = getDbPool()): Promise<RevisionHistoryEntry[]> {
  const result = await pool.query<RevisionHistoryRow>(
    `SELECT id, revision_number, status, visibility, created_by, created_at
     FROM v2_chapter_revisions
     WHERE chapter_id = $1
     ORDER BY revision_number DESC`,
    [chapterId],
  );
  return result.rows.map((row) => ({
    id: row.id,
    revisionNumber: Number(row.revision_number),
    status: row.status,
    visibility: row.visibility,
    createdBy: row.created_by,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : new Date(row.created_at).toISOString(),
  }));
}
