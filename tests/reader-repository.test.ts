import { describe, expect, it, vi } from "vitest";

import { sampleRevision } from "@/domain/composition/fixtures";
import {
  PostgresReaderChapterRepository,
  type ReaderQueryExecutor,
} from "@/server/reader/chapter-repository";
import { loadReaderChapter, loadReaderLibrary } from "@/server/reader/chapter-service";

const publicationRow = {
  chapter_id: sampleRevision.chapterId,
  slug: sampleRevision.slug,
  title: sampleRevision.title,
  revision_id: sampleRevision.id,
  revision_number: sampleRevision.revisionNumber,
  document: sampleRevision.document,
  experience: sampleRevision.experience,
  status: "published" as const,
  visibility: "public" as const,
  created_at: sampleRevision.createdAt,
};

const assetRows = sampleRevision.assets.map((asset) => ({
  id: asset.id,
  title: asset.title,
  kind: asset.kind,
  content_type: asset.contentType,
  storage_key: asset.storageKey,
  checksum: asset.checksum,
  byte_size: asset.byteSize,
  duration_ms: asset.durationMs,
  waveform_peaks: asset.waveformPeaks,
  status: asset.status,
}));

function fakeDb(): { db: ReaderQueryExecutor; calls: Array<{ text: string; values: readonly unknown[] }> } {
  const calls: Array<{ text: string; values: readonly unknown[] }> = [];
  const db: ReaderQueryExecutor = {
    async query<Row extends Record<string, unknown>>(text: string, values: readonly unknown[] = []): Promise<{ rows: Row[] }> {
      calls.push({ text, values });
      if (text.includes("FROM v2_audio_assets")) {
        return { rows: assetRows as unknown as Row[] };
      }
      return { rows: [publicationRow] as unknown as Row[] };
    },
  };
  return { db, calls };
}

describe("PostgresReaderChapterRepository", () => {
  it("hydrates the published revision and its audio assets", async () => {
    const { db, calls } = fakeDb();
    const repository = new PostgresReaderChapterRepository(db);

    const revision = await repository.getPublishedRevisionBySlug(sampleRevision.slug);

    expect(revision).toMatchObject({
      id: sampleRevision.id,
      slug: sampleRevision.slug,
      title: sampleRevision.title,
      status: "published",
    });
    expect(revision?.assets).toHaveLength(3);
    expect(calls[0]?.text).toContain("r.visibility = 'public'");
    expect(calls[0]?.values).toEqual([sampleRevision.slug, false, false]);
  });

  it("passes explicit restricted-access decisions into the visibility query", async () => {
    const { db, calls } = fakeDb();
    const repository = new PostgresReaderChapterRepository(db);

    await repository.getPublishedRevisionBySlug(sampleRevision.slug, {
      allowDirectLink: true,
      allowConditional: true,
    });

    expect(calls[0]?.values).toEqual([sampleRevision.slug, true, true]);
    expect(calls[0]?.text).toContain("r.visibility = 'direct-link'");
    expect(calls[0]?.text).toContain("r.visibility = 'conditional'");
  });
});

describe("reader content service", () => {
  it("uses the fixture only as a development fallback", async () => {
    vi.stubEnv("DATABASE_URL", "");
    vi.stubEnv("NODE_ENV", "development");

    await expect(loadReaderChapter(sampleRevision.slug)).resolves.toEqual(sampleRevision);
    await expect(loadReaderLibrary()).resolves.toEqual([
      expect.objectContaining({ slug: sampleRevision.slug, sceneCount: 2 }),
    ]);

    vi.stubEnv("NODE_ENV", "production");
    await expect(loadReaderChapter(sampleRevision.slug)).resolves.toBeNull();
    await expect(loadReaderLibrary()).resolves.toEqual([]);
    vi.unstubAllEnvs();
  });
});
