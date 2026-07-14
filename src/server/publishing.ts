import type { PoolClient } from "pg";

import type { ChapterRevision } from "@/domain/composition/model";
import { assertPublishable } from "@/domain/publishing/readiness";
import { withTransaction } from "@/db/client";

export interface PublishRevisionInput {
  chapterId: string;
  revision: ChapterRevision;
  actorId: string;
}

async function publishWithinTransaction(client: PoolClient, input: PublishRevisionInput): Promise<void> {
  const locked = await client.query<{ chapter_id: string }>(
    "SELECT chapter_id FROM v2_chapter_revisions WHERE id = $1 FOR UPDATE",
    [input.revision.id],
  );
  if (locked.rowCount !== 1 || locked.rows[0].chapter_id !== input.chapterId) {
    throw new Error("The revision does not belong to the requested chapter.");
  }

  const updated = await client.query(
    "UPDATE v2_chapter_revisions SET status = 'published' WHERE id = $1 AND chapter_id = $2 AND status = 'draft'",
    [input.revision.id, input.chapterId],
  );
  if (updated.rowCount !== 1) {
    throw new Error("Only a draft revision can be published.");
  }
  await client.query(
    `INSERT INTO v2_chapter_publications (chapter_id, revision_id, published_at)
     VALUES ($1, $2, now())
     ON CONFLICT (chapter_id) DO UPDATE SET revision_id = EXCLUDED.revision_id, published_at = EXCLUDED.published_at`,
    [input.chapterId, input.revision.id],
  );
  await client.query(
    `INSERT INTO v2_audit_events (actor_id, event_type, entity_type, entity_id, payload)
     VALUES ($1, 'chapter.published', 'chapter_revision', $2, $3::jsonb)`,
    [input.actorId, input.revision.id, JSON.stringify({ chapterId: input.chapterId, revisionNumber: input.revision.revisionNumber })],
  );
}

export async function publishRevision(input: PublishRevisionInput): Promise<void> {
  assertPublishable(input.revision);
  await withTransaction((client) => publishWithinTransaction(client, input));
}
