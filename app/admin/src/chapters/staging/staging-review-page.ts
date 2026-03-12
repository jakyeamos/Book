import { StagedChapterDraft } from "../../../../../platform/shared/src/import/schema";

export interface StagingReviewViewModel {
  draftId: string;
  title: string;
  slug: string;
  status: string;
  chapterType: string;
  orderIndex: number;
  visibilityMode: string;
  hasBlockingErrors: boolean;
  errors: string[];
  previewHtml: string;
}

export function buildStagingReviewViewModel(draft: StagedChapterDraft): StagingReviewViewModel {
  return {
    draftId: draft.id,
    title: draft.metadata.title,
    slug: draft.metadata.slug,
    status: draft.status,
    chapterType: draft.metadata.chapterType,
    orderIndex: draft.metadata.orderIndex,
    visibilityMode: draft.metadata.visibility.mode,
    hasBlockingErrors: draft.validationErrors.length > 0,
    errors: draft.validationErrors,
    previewHtml: draft.compiledPreview.html,
  };
}

export function formatStagingSummary(draft: StagedChapterDraft): string {
  const lines = [
    `Draft: ${draft.id}`,
    `Title: ${draft.metadata.title}`,
    `Slug: ${draft.metadata.slug}`,
    `Type: ${draft.metadata.chapterType}`,
    `Status: ${draft.status}`,
    `Errors: ${draft.validationErrors.length}`,
  ];

  return lines.join("\n");
}


