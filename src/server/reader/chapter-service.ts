import { validateComposition } from "@/domain/composition/validation";
import { sampleRevision } from "@/domain/composition/fixtures";
import type { ChapterRevision } from "@/domain/composition/model";

import {
  PostgresReaderChapterRepository,
  publicReaderVisibility,
  type ReaderVisibilityContext,
} from "./chapter-repository";

export interface ReaderChapterSummary {
  readonly id: string;
  readonly slug: string;
  readonly title: string;
  readonly revisionNumber: number;
  readonly sceneCount: number;
  readonly blockCount: number;
}

export interface ReaderContentSource {
  listPublishedRevisions(context?: ReaderVisibilityContext): Promise<ChapterRevision[]>;
  getPublishedRevisionBySlug(slug: string, context?: ReaderVisibilityContext): Promise<ChapterRevision | null>;
}

function toSummary(revision: ChapterRevision): ReaderChapterSummary {
  return {
    id: revision.chapterId,
    slug: revision.slug,
    title: revision.title,
    revisionNumber: revision.revisionNumber,
    sceneCount: revision.experience.scenes.length,
    blockCount: revision.document.blocks.length,
  };
}

function isReaderSafe(revision: ChapterRevision): boolean {
  return validateComposition(revision).ok;
}

export function createReaderContentSource(): ReaderContentSource | null {
  if (!process.env.DATABASE_URL) {
    return null;
  }
  return PostgresReaderChapterRepository.fromEnvironment();
}

/**
 * Load a reader publication while keeping the dev fixture deliberately
 * opt-in. Production never falls back to authored sample content when the
 * database is missing or unavailable.
 */
export async function loadReaderChapter(
  slug: string,
  context: ReaderVisibilityContext = publicReaderVisibility,
): Promise<ChapterRevision | null> {
  const source = createReaderContentSource();
  if (!source) {
    return process.env.NODE_ENV !== "production" && slug === sampleRevision.slug ? sampleRevision : null;
  }
  const revision = await source.getPublishedRevisionBySlug(slug, context);
  return revision && isReaderSafe(revision) ? revision : null;
}

export async function loadReaderLibrary(
  context: ReaderVisibilityContext = publicReaderVisibility,
): Promise<ReaderChapterSummary[]> {
  const source = createReaderContentSource();
  const revisions = source
    ? await source.listPublishedRevisions(context)
    : process.env.NODE_ENV !== "production"
      ? [sampleRevision]
      : [];
  return revisions.filter(isReaderSafe).map(toSummary);
}
