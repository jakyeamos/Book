import { chapterDocumentSchema, chapterExperienceSchema, chapterRevisionSchema, audioAssetSchema, type AudioAsset, type ChapterRevision } from "@/domain/composition/model";

import { getDbPool } from "@/db/client";

export interface ReaderVisibilityContext {
  readonly allowDirectLink: boolean;
  readonly allowConditional: boolean;
}

export const publicReaderVisibility: ReaderVisibilityContext = {
  allowDirectLink: false,
  allowConditional: false,
};

interface ReaderQueryResult<Row extends Record<string, unknown>> {
  rows: Row[];
}

/**
 * The narrow database surface needed by the reader. Keeping this interface
 * small makes visibility and revision hydration straightforward to test
 * without opening a second database connection.
 */
export interface ReaderQueryExecutor {
  query<Row extends Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<ReaderQueryResult<Row>>;
}

interface ChapterPublicationRow extends Record<string, unknown> {
  chapter_id: string;
  slug: string;
  title: string;
  revision_id: string;
  revision_number: number;
  document: unknown;
  experience: unknown;
  status: "draft" | "published";
  visibility: "public" | "direct-link" | "conditional";
  created_at: string | Date;
}

interface AudioAssetRow extends Record<string, unknown> {
  id: string;
  title: string;
  kind: "music" | "ambience";
  content_type: string;
  storage_key: string;
  checksum: string;
  byte_size: number | string;
  duration_ms: number | string;
  waveform_peaks: unknown;
  status: "pending" | "ready" | "quarantined";
}

function parseJson(value: unknown): unknown {
  return typeof value === "string" ? JSON.parse(value) : value;
}

function dateToIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function assetFromRow(row: AudioAssetRow): AudioAsset {
  return audioAssetSchema.parse({
    id: row.id,
    title: row.title,
    kind: row.kind,
    contentType: row.content_type,
    storageKey: row.storage_key,
    checksum: row.checksum,
    byteSize: Number(row.byte_size),
    durationMs: Number(row.duration_ms),
    waveformPeaks: parseJson(row.waveform_peaks),
    status: row.status,
  });
}

export class PostgresReaderChapterRepository {
  public constructor(private readonly db: ReaderQueryExecutor) {}

  public static fromEnvironment(): PostgresReaderChapterRepository {
    // pg's Pool has the same generic query contract; the cast keeps the
    // reader's testable surface independent of pg's large overload set.
    return new PostgresReaderChapterRepository(getDbPool() as unknown as ReaderQueryExecutor);
  }

  public async listPublishedRevisions(context: ReaderVisibilityContext = publicReaderVisibility): Promise<ChapterRevision[]> {
    const result = await this.db.query<ChapterPublicationRow>(
      `SELECT
        c.id AS chapter_id,
        c.slug,
        c.title,
        r.id AS revision_id,
        r.revision_number,
        r.document,
        r.experience,
        r.status,
        r.visibility,
        r.created_at
      FROM v2_chapters c
      INNER JOIN v2_chapter_publications p ON p.chapter_id = c.id
      INNER JOIN v2_chapter_revisions r ON r.id = p.revision_id
      WHERE r.status = 'published'
        AND (
          r.visibility = 'public'
          OR (r.visibility = 'direct-link' AND $1::boolean = true)
          OR (r.visibility = 'conditional' AND $2::boolean = true)
        )
      ORDER BY c.order_index ASC`,
      [context.allowDirectLink, context.allowConditional],
    );

    return this.hydrateRows(result.rows);
  }

  public async getPublishedRevisionBySlug(
    slug: string,
    context: ReaderVisibilityContext = publicReaderVisibility,
  ): Promise<ChapterRevision | null> {
    const result = await this.db.query<ChapterPublicationRow>(
      `SELECT
        c.id AS chapter_id,
        c.slug,
        c.title,
        r.id AS revision_id,
        r.revision_number,
        r.document,
        r.experience,
        r.status,
        r.visibility,
        r.created_at
      FROM v2_chapters c
      INNER JOIN v2_chapter_publications p ON p.chapter_id = c.id
      INNER JOIN v2_chapter_revisions r ON r.id = p.revision_id
      WHERE c.slug = $1
        AND r.status = 'published'
        AND (
          r.visibility = 'public'
          OR (r.visibility = 'direct-link' AND $2::boolean = true)
          OR (r.visibility = 'conditional' AND $3::boolean = true)
        )
      LIMIT 1`,
      [slug, context.allowDirectLink, context.allowConditional],
    );

    const [revision] = await this.hydrateRows(result.rows);
    return revision ?? null;
  }

  private async hydrateRows(rows: readonly ChapterPublicationRow[]): Promise<ChapterRevision[]> {
    const revisions: ChapterRevision[] = [];
    for (const row of rows) {
      const revision = await this.hydrateRow(row);
      if (revision) {
        revisions.push(revision);
      }
    }
    return revisions;
  }

  private async hydrateRow(row: ChapterPublicationRow): Promise<ChapterRevision | null> {
    const document = chapterDocumentSchema.parse(parseJson(row.document));
    const experience = chapterExperienceSchema.parse(parseJson(row.experience));
    const assetIds = [...new Set(experience.scenes.flatMap((scene) => scene.cues.map((cue) => cue.assetId)))];
    const assets = await this.loadAssets(assetIds);

    // The reader never renders an incomplete publication. Publishing is
    // expected to enforce this invariant, but checking it again prevents a
    // bad migration or manual database edit from leaking broken audio state.
    const parsedRevision = chapterRevisionSchema.safeParse({
      id: row.revision_id,
      chapterId: row.chapter_id,
      slug: row.slug,
      title: row.title,
      revisionNumber: Number(row.revision_number),
      document,
      experience,
      assets,
      status: row.status,
      visibility: row.visibility,
      createdAt: dateToIso(row.created_at),
    });
    return parsedRevision.success ? parsedRevision.data : null;
  }

  private async loadAssets(assetIds: readonly string[]): Promise<AudioAsset[]> {
    if (assetIds.length === 0) {
      return [];
    }
    const result = await this.db.query<AudioAssetRow>(
      `SELECT id, title, kind, storage_key, checksum, byte_size, duration_ms, waveform_peaks, status
       FROM v2_audio_assets
       WHERE id = ANY($1::text[])`,
      [assetIds],
    );
    return result.rows.map(assetFromRow);
  }
}
