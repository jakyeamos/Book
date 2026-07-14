import type { Pool } from "pg";

import { getDbPool } from "@/db/client";

export interface ProgressWrite {
  userId: string;
  chapterId: string;
  revisionId: string;
  blockId: string;
  progressPercent: number;
}

export interface AnnotationWrite {
  id: string;
  userId: string;
  chapterId: string;
  revisionId: string;
  startBlockId: string;
  endBlockId: string;
  quote: string;
  note?: string;
  color: string;
  expectedVersion?: number;
}

export async function saveReaderProgress(input: ProgressWrite, pool: Pool = getDbPool()): Promise<void> {
  await pool.query(
    `INSERT INTO v2_reader_progress (user_id, chapter_id, revision_id, block_id, progress_percent)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (user_id, chapter_id) DO UPDATE SET
       revision_id = EXCLUDED.revision_id,
       block_id = EXCLUDED.block_id,
       progress_percent = EXCLUDED.progress_percent,
       updated_at = now()`,
    [input.userId, input.chapterId, input.revisionId, input.blockId, input.progressPercent],
  );
}

export async function saveReaderAnnotation(input: AnnotationWrite, pool: Pool = getDbPool()): Promise<number> {
  if (input.expectedVersion === undefined) {
    const result = await pool.query(
      `INSERT INTO v2_annotations (id, user_id, chapter_id, revision_id, start_block_id, end_block_id, quote, note, color)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO NOTHING
       RETURNING version`,
      [input.id, input.userId, input.chapterId, input.revisionId, input.startBlockId, input.endBlockId, input.quote, input.note ?? null, input.color],
    );
    if (result.rowCount !== 1) {
      throw new Error("Annotation already exists; retry with its current version.");
    }
    return Number(result.rows[0].version);
  }

  const result = await pool.query(
    `UPDATE v2_annotations SET start_block_id = $1, end_block_id = $2, quote = $3, note = $4, color = $5, version = version + 1, updated_at = now()
     WHERE id = $6 AND user_id = $7 AND version = $8 AND deleted_at IS NULL
     RETURNING version`,
    [input.startBlockId, input.endBlockId, input.quote, input.note ?? null, input.color, input.id, input.userId, input.expectedVersion],
  );
  if (result.rowCount !== 1) {
    throw new Error("Annotation changed elsewhere; reload before saving.");
  }
  return Number(result.rows[0].version);
}
