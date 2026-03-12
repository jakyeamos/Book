import { DocxImportService } from "../../../../../platform/api/src/import/docx-import.service";
import { StagingService } from "../../../../../platform/api/src/content/staging.service";
import { StagedChapterMetadata } from "../../../../../platform/shared/src/import/schema";

export class ChapterImportController {
  constructor(
    private readonly importer: DocxImportService,
    private readonly staging: StagingService,
  ) {}

  async uploadDocx(
    fileName: string,
    fileBuffer: Buffer,
    metadataOverrides?: Partial<StagedChapterMetadata>,
  ) {
    const importResult = await this.importer.importDocx(fileName, fileBuffer);
    return this.staging.createDraftFromImport(importResult, metadataOverrides);
  }

  uploadHtmlPreview(
    fileName: string,
    html: string,
    metadataOverrides?: Partial<StagedChapterMetadata>,
  ) {
    const importResult = this.importer.importFromHtmlPreview(fileName, html);
    return this.staging.createDraftFromImport(importResult, metadataOverrides);
  }

  listDrafts() {
    return this.staging.listDrafts();
  }

  updateDraftMetadata(draftId: string, patch: Partial<StagedChapterMetadata>) {
    return this.staging.updateDraftMetadata(draftId, patch);
  }

  approveDraft(draftId: string) {
    return this.staging.approveDraft(draftId);
  }

  rejectDraft(draftId: string, reason: string) {
    return this.staging.rejectDraft(draftId, reason);
  }
}

