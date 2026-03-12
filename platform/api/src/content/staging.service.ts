import { compileChapter } from "../compile/chapter.compiler";
import { ContentRepository } from "./content.repository";
import { ImportJobRepository } from "../import/import-job.repository";
import {
  ImportResult,
  StagedChapterDraft,
  StagedChapterMetadata,
  makeDefaultStagedMetadata,
  makeStagedDraftId,
} from "../../../shared/src/import/schema";
import { SourceImportMeta, nowIso } from "../../../shared/src/document/schema";

export class StagingService {
  constructor(
    private readonly imports: ImportJobRepository,
    private readonly content: ContentRepository,
  ) {}

  createDraftFromImport(
    importResult: ImportResult,
    metadataOverrides?: Partial<StagedChapterMetadata>,
  ): StagedChapterDraft {
    const fallbackSlug = this.slugFromFileName(importResult.job.fileName);
    const defaultTitle = this.deriveTitle(importResult, fallbackSlug);
    const metadata = {
      ...makeDefaultStagedMetadata(defaultTitle, fallbackSlug),
      ...metadataOverrides,
    };

    const draft: StagedChapterDraft = {
      id: makeStagedDraftId(metadata.slug),
      jobId: importResult.job.id,
      metadata,
      normalizedDocument: importResult.normalizedDocument,
      compiledPreview: importResult.compiledPreview,
      status: "staged",
      validationErrors: this.validateMetadata(metadata),
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    return this.imports.saveDraft(draft);
  }

  updateDraftMetadata(
    draftId: string,
    patch: Partial<StagedChapterMetadata>,
  ): StagedChapterDraft {
    return this.imports.updateDraft(draftId, (draft) => {
      const metadata = {
        ...draft.metadata,
        ...patch,
      };

      return {
        ...draft,
        metadata,
        validationErrors: this.validateMetadata(metadata),
      };
    });
  }

  approveDraft(draftId: string): { draft: StagedChapterDraft; chapterId: string } {
    const draft = this.requireDraft(draftId);
    if (draft.status !== "staged") {
      throw new Error(`Draft ${draft.id} is not in staged status`);
    }
    if (draft.validationErrors.length > 0) {
      throw new Error(`Draft ${draft.id} has validation errors`);
    }

    const compiled = compileChapter(draft.metadata.slug, draft.normalizedDocument);
    const sourceImport: SourceImportMeta = {
      sourceType: "docx",
      sourceFile: this.requireJob(draft.jobId).fileName,
      importedAt: nowIso(),
      warnings: this.requireJob(draft.jobId).warnings,
    };

    const chapter = this.content.createChapter({
      slug: draft.metadata.slug,
      title: draft.metadata.title,
      orderIndex: draft.metadata.orderIndex,
      type: draft.metadata.chapterType,
      visibility: draft.metadata.visibility,
      theme: draft.metadata.theme,
      sourceImport,
      normalizedDocument: draft.normalizedDocument,
      compiledOutput: compiled,
    });

    const approved = this.imports.updateDraft(draft.id, (current) => ({
      ...current,
      status: "approved",
    }));

    return {
      draft: approved,
      chapterId: chapter.id,
    };
  }

  rejectDraft(draftId: string, reason: string): StagedChapterDraft {
    if (!reason.trim()) {
      throw new Error("Rejection reason is required");
    }

    this.requireDraft(draftId);
    return this.imports.updateDraft(draftId, (draft) => ({
      ...draft,
      status: "rejected",
      rejectionReason: reason.trim(),
    }));
  }

  getDraft(draftId: string): StagedChapterDraft | undefined {
    return this.imports.getDraft(draftId);
  }

  listDrafts(): StagedChapterDraft[] {
    return this.imports.listDrafts();
  }

  private validateMetadata(metadata: StagedChapterMetadata): string[] {
    const errors: string[] = [];

    if (!metadata.title || metadata.title.trim().length < 2) {
      errors.push("Title must be at least 2 characters");
    }

    if (!/^[a-z0-9-]+$/.test(metadata.slug)) {
      errors.push("Slug must contain lowercase letters, numbers, and hyphens only");
    }

    if (!Number.isInteger(metadata.orderIndex) || metadata.orderIndex < 0) {
      errors.push("Order index must be a non-negative integer");
    }

    if (metadata.visibility.mode === "conditional" && !metadata.visibility.conditionKey) {
      errors.push("Conditional visibility requires a conditionKey");
    }

    return errors;
  }

  private requireDraft(draftId: string): StagedChapterDraft {
    const draft = this.imports.getDraft(draftId);
    if (!draft) {
      throw new Error(`Draft not found: ${draftId}`);
    }
    return draft;
  }

  private requireJob(jobId: string) {
    const job = this.imports.getJob(jobId);
    if (!job) {
      throw new Error(`Import job not found: ${jobId}`);
    }
    return job;
  }

  private deriveTitle(importResult: ImportResult, fallbackSlug: string): string {
    const heading = importResult.normalizedDocument.blocks.find((block) => block.type === "heading");
    const text = heading?.spans.map((span) => span.text).join(" ").trim();
    if (text) {
      return text;
    }

    return fallbackSlug
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
  }

  private slugFromFileName(fileName: string): string {
    return fileName
      .toLowerCase()
      .replace(/\.docx$/i, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled";
  }
}
