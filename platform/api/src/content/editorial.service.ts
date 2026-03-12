import { ContentRepository, normalizeChapterType } from "./content.repository";
import { ChapterStatus, ChapterType, VisibilityConfig } from "../../../shared/src/document/schema";

const ALLOWED_TRANSITIONS: Record<ChapterStatus, ChapterStatus[]> = {
  draft: ["preview", "published"],
  preview: ["draft", "published"],
  published: ["preview"],
};

export class EditorialService {
  constructor(private readonly content: ContentRepository) {}

  listChapters() {
    return this.content.listChapters();
  }

  reorderChapters(chapterIdsInOrder: string[]): void {
    const chapters = this.content.listChapters();
    const known = new Set(chapters.map((chapter) => chapter.id));

    chapterIdsInOrder.forEach((chapterId) => {
      if (!known.has(chapterId)) {
        throw new Error(`Unknown chapter id in order update: ${chapterId}`);
      }
    });

    chapterIdsInOrder.forEach((chapterId, index) => {
      this.content.updateChapter(chapterId, {
        orderIndex: index + 1,
      });
    });
  }

  updateChapterPresentation(
    chapterId: string,
    updates: {
      chapterType?: string;
      visibility?: VisibilityConfig;
      orderIndex?: number;
    },
  ) {
    const patch: {
      type?: ChapterType;
      visibility?: VisibilityConfig;
      orderIndex?: number;
    } = {};

    if (updates.chapterType) {
      patch.type = normalizeChapterType(updates.chapterType);
    }
    if (updates.visibility) {
      patch.visibility = updates.visibility;
    }
    if (typeof updates.orderIndex === "number") {
      patch.orderIndex = updates.orderIndex;
    }

    return this.content.updateChapter(chapterId, patch);
  }

  transitionStatus(chapterId: string, target: ChapterStatus) {
    const chapter = this.content.getChapterById(chapterId);
    if (!chapter) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }

    const allowed = ALLOWED_TRANSITIONS[chapter.status] ?? [];
    if (!allowed.includes(target)) {
      throw new Error(`Invalid status transition: ${chapter.status} -> ${target}`);
    }

    return this.content.setStatus(chapterId, target);
  }
}
