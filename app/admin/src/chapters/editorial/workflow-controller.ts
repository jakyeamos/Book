import { EditorialService } from "../../../../../platform/api/src/content/editorial.service";
import { PublishWorkflowService } from "../../../../../platform/api/src/publish/workflow.service";
import { ChapterStatus, VisibilityConfig } from "../../../../../platform/shared/src/document/schema";

export class EditorialWorkflowController {
  constructor(
    private readonly editorial: EditorialService,
    private readonly publishWorkflow: PublishWorkflowService,
  ) {}

  listChapters() {
    return this.editorial.listChapters();
  }

  reorder(chapterIds: string[]) {
    this.editorial.reorderChapters(chapterIds);
    return this.editorial.listChapters();
  }

  updateChapterSettings(
    chapterId: string,
    updates: {
      chapterType?: string;
      visibility?: VisibilityConfig;
      orderIndex?: number;
    },
  ) {
    return this.editorial.updateChapterPresentation(chapterId, updates);
  }

  transitionStatus(chapterId: string, status: ChapterStatus) {
    return this.editorial.transitionStatus(chapterId, status);
  }

  preview(chapterId: string) {
    return this.publishWorkflow.previewChapter(chapterId);
  }

  publish(chapterId: string) {
    return this.publishWorkflow.publishChapter(chapterId);
  }

  rollback(chapterId: string, versionId: string) {
    return this.publishWorkflow.rollbackChapter(chapterId, versionId);
  }

  listVersions(chapterId: string) {
    return this.publishWorkflow.listVersions(chapterId);
  }
}
