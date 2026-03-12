import { compileChapter } from "../compile/chapter.compiler";
import { ContentRepository } from "./content.repository";

export class PublishService {
  constructor(private readonly repository: ContentRepository) {}

  createPreview(chapterId: string): void {
    const chapter = this.repository.getChapterById(chapterId);
    if (!chapter) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }

    const compiled = compileChapter(chapter.id, chapter.normalizedDocument);
    this.repository.updateChapter(chapter.id, {
      compiledOutput: compiled,
      status: "preview",
    });
    this.repository.createVersionSnapshot(chapter.id, "preview");
  }

  publish(chapterId: string): void {
    const chapter = this.repository.getChapterById(chapterId);
    if (!chapter) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }

    const compiled = compileChapter(chapter.id, chapter.normalizedDocument);
    this.repository.updateChapter(chapter.id, {
      compiledOutput: compiled,
      status: "published",
    });
    this.repository.createVersionSnapshot(chapter.id, "published");
  }

  rollback(chapterId: string, versionId: string): void {
    this.repository.rollbackPublished(chapterId, versionId);
    this.repository.createVersionSnapshot(chapterId, "published");
  }
}
