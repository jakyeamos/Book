import * as fs from "node:fs";
import * as path from "node:path";
import {
  ChapterRecord,
  ChapterStatus,
  ChapterType,
  ChapterVersionRecord,
  CreateChapterInput,
  defaultVisibility,
  makeChapterId,
  makeVersionId,
  nowIso,
} from "../../../shared/src/document/schema";

interface StoreShape {
  chapters: ChapterRecord[];
  versions: ChapterVersionRecord[];
}

export class ContentRepository {
  private readonly storePath: string;
  private store: StoreShape;

  constructor(storePath = path.join(".planning", "data", "content-store.json")) {
    this.storePath = storePath;
    this.store = this.load();
  }

  createChapter(input: CreateChapterInput): ChapterRecord {
    const now = nowIso();
    const chapterId = makeChapterId(input.slug);
    const record: ChapterRecord = {
      id: chapterId,
      slug: input.slug,
      title: input.title,
      orderIndex: input.orderIndex,
      status: "draft",
      type: input.type ?? "standard",
      visibility: input.visibility ?? defaultVisibility(),
      theme: input.theme ?? {},
      sourceImport: input.sourceImport,
      normalizedDocument: input.normalizedDocument,
      compiledOutput: input.compiledOutput,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    this.store.chapters = this.store.chapters.filter((ch) => ch.slug !== record.slug);
    this.store.chapters.push(record);

    this.createVersionSnapshot(chapterId, "draft");
    this.save();

    return record;
  }

  listChapters(): ChapterRecord[] {
    return [...this.store.chapters].sort((a, b) => a.orderIndex - b.orderIndex);
  }

  getChapterBySlug(slug: string): ChapterRecord | undefined {
    return this.store.chapters.find((chapter) => chapter.slug === slug);
  }

  getChapterById(chapterId: string): ChapterRecord | undefined {
    return this.store.chapters.find((chapter) => chapter.id === chapterId);
  }

  updateChapter(
    chapterId: string,
    updates: Partial<Pick<ChapterRecord, "title" | "status" | "type" | "visibility" | "theme" | "orderIndex" | "normalizedDocument" | "compiledOutput">>,
  ): ChapterRecord {
    const chapter = this.getChapterById(chapterId);
    if (!chapter) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }

    const next: ChapterRecord = {
      ...chapter,
      ...updates,
      updatedAt: nowIso(),
    };

    this.store.chapters = this.store.chapters.map((item) => (item.id === chapterId ? next : item));
    this.save();

    return next;
  }

  setStatus(chapterId: string, status: ChapterStatus): ChapterRecord {
    return this.updateChapter(chapterId, { status });
  }

  createVersionSnapshot(chapterId: string, status: ChapterStatus): ChapterVersionRecord {
    const chapter = this.getChapterById(chapterId);
    if (!chapter) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }

    const versionNumber = this.countVersions(chapterId) + 1;
    const versionId = makeVersionId(chapterId, versionNumber);

    const snapshot: ChapterVersionRecord = {
      id: versionId,
      chapterId,
      status,
      normalizedSnapshot: chapter.normalizedDocument,
      compiledSnapshot: chapter.compiledOutput,
      rollbackEligible: status === "published",
      publishedAt: status === "published" ? nowIso() : undefined,
      createdAt: nowIso(),
    };

    this.store.versions.push(snapshot);
    this.store.chapters = this.store.chapters.map((item) => {
      if (item.id !== chapterId) {
        return item;
      }

      return {
        ...item,
        version: versionNumber,
        status,
        updatedAt: nowIso(),
      };
    });

    this.save();
    return snapshot;
  }

  listVersions(chapterId: string): ChapterVersionRecord[] {
    return this.store.versions.filter((version) => version.chapterId === chapterId);
  }

  rollbackPublished(chapterId: string, versionId: string): ChapterRecord {
    const version = this.store.versions.find(
      (item) => item.chapterId === chapterId && item.id === versionId,
    );

    if (!version) {
      throw new Error(`Version not found: ${versionId}`);
    }

    const chapter = this.getChapterById(chapterId);
    if (!chapter) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }

    return this.updateChapter(chapterId, {
      status: "published",
      normalizedDocument: version.normalizedSnapshot,
      compiledOutput: version.compiledSnapshot,
    });
  }

  private countVersions(chapterId: string): number {
    return this.store.versions.filter((version) => version.chapterId === chapterId).length;
  }

  private load(): StoreShape {
    try {
      if (!fs.existsSync(this.storePath)) {
        return { chapters: [], versions: [] };
      }

      const raw = fs.readFileSync(this.storePath, "utf8");
      const parsed = JSON.parse(raw) as StoreShape;
      return {
        chapters: parsed.chapters ?? [],
        versions: parsed.versions ?? [],
      };
    } catch {
      return { chapters: [], versions: [] };
    }
  }

  private save(): void {
    const folder = path.dirname(this.storePath);
    fs.mkdirSync(folder, { recursive: true });
    fs.writeFileSync(this.storePath, JSON.stringify(this.store, null, 2), "utf8");
  }
}

export function normalizeChapterType(input: string | undefined): ChapterType {
  const value = (input ?? "standard").toLowerCase();
  if (value === "interlude" || value === "hidden" || value === "conditional") {
    return value;
  }
  return "standard";
}
