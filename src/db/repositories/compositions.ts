import type { PoolClient } from "pg";

import type { ChapterRevision } from "@/domain/composition/model";

export interface DraftRevisionWrite {
  chapterId: string;
  revision: ChapterRevision;
  actorId: string;
}

export async function saveDraftRevision(client: PoolClient, input: DraftRevisionWrite): Promise<void> {
  if (input.revision.status !== "draft") {
    throw new Error("Only draft revisions may be autosaved.");
  }
  if (input.revision.chapterId !== input.chapterId) {
    throw new Error("The revision does not belong to the requested chapter.");
  }

  await client.query(
    `INSERT INTO v2_chapters (id, slug, title, order_index)
     VALUES ($1, $2, $3, COALESCE((SELECT MAX(order_index) + 1 FROM v2_chapters), 0))
     ON CONFLICT (id) DO UPDATE SET slug = EXCLUDED.slug, title = EXCLUDED.title, updated_at = now()`,
    [input.chapterId, input.revision.slug, input.revision.title],
  );

  const revisionResult = await client.query(
    `INSERT INTO v2_chapter_revisions
      (id, chapter_id, revision_number, document, experience, status, visibility, created_by)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, 'draft', $6, $7)
     ON CONFLICT (id) DO UPDATE SET
       document = EXCLUDED.document,
       experience = EXCLUDED.experience,
       visibility = EXCLUDED.visibility,
       created_by = EXCLUDED.created_by
     WHERE v2_chapter_revisions.status = 'draft'`,
    [input.revision.id, input.chapterId, input.revision.revisionNumber, JSON.stringify(input.revision.document), JSON.stringify(input.revision.experience), input.revision.visibility, input.actorId],
  );
  if (revisionResult.rowCount !== 1) {
    throw new Error("Published revisions are immutable and cannot be autosaved.");
  }

  await client.query("DELETE FROM v2_audio_scenes WHERE revision_id = $1", [input.revision.id]);
  for (const scene of input.revision.experience.scenes) {
    await client.query(
      `INSERT INTO v2_audio_scenes (id, revision_id, label, start_block_id, end_block_id, order_index)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [scene.id, input.revision.id, scene.label, scene.startBlockId, scene.endBlockId, scene.orderIndex],
    );
    for (const cue of scene.cues) {
      await client.query(
        `INSERT INTO v2_audio_cues
          (id, scene_id, asset_id, layer, start_block_id, end_block_id, offset_ms, loop, gain_db, fade_in_ms, fade_out_ms, duck_music_db, duck_attack_ms, duck_release_ms)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [cue.id, cue.sceneId, cue.assetId, cue.layer, cue.startBlockId, cue.endBlockId, cue.offsetMs, cue.loop, cue.gainDb, cue.fadeInMs, cue.fadeOutMs, cue.duckMusicDb ?? null, cue.duckAttackMs ?? null, cue.duckReleaseMs ?? null],
      );
    }
  }
}
