import { ContentRepository } from "../content/content.repository";
import { PublishService } from "../content/publish.service";

export class PublishWorkflowService {
  private readonly publisher: PublishService;

  constructor(private readonly content: ContentRepository) {
    this.publisher = new PublishService(content);
  }

  previewChapter(chapterId: string) {
    this.publisher.createPreview(chapterId);
    return this.content.getChapterById(chapterId);
  }

  publishChapter(chapterId: string) {
    this.publisher.publish(chapterId);
    return this.content.getChapterById(chapterId);
  }

  rollbackChapter(chapterId: string, versionId: string) {
    this.publisher.rollback(chapterId, versionId);
    return this.content.getChapterById(chapterId);
  }

  listVersions(chapterId: string) {
    return this.content.listVersions(chapterId);
  }
}
