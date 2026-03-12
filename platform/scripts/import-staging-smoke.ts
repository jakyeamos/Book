import * as fs from "node:fs";
import * as path from "node:path";
import { ChapterImportController } from "../../app/admin/src/chapters/import/import-controller";
import { buildStagingReviewViewModel } from "../../app/admin/src/chapters/staging/staging-review-page";
import { ContentRepository } from "../api/src/content/content.repository";
import { StagingService } from "../api/src/content/staging.service";
import { DocxImportService } from "../api/src/import/docx-import.service";
import { ImportJobRepository } from "../api/src/import/import-job.repository";

function cleanup(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

async function run(): Promise<void> {
  const importStorePath = path.join(".planning", "data", "import-store.smoke.json");
  const contentStorePath = path.join(".planning", "data", "content-store.smoke.json");

  cleanup(importStorePath);
  cleanup(contentStorePath);

  const imports = new ImportJobRepository(importStorePath);
  const content = new ContentRepository(contentStorePath);
  const importer = new DocxImportService(imports);
  const staging = new StagingService(imports, content);
  const controller = new ChapterImportController(importer, staging);

  const html = [
    '<h2 class="chapter-title">Staged Dawn</h2>',
    '<p><strong>Bold</strong> and <em>italic</em> opening line.</p>',
    '<blockquote>Quoted reflection.</blockquote>',
    '<hr />',
    '<p>Second paragraph.</p>',
  ].join("\n");

  const draft = controller.uploadHtmlPreview("staged-dawn.docx", html, {
    slug: "staged-dawn",
    orderIndex: 101,
  });

  const updated = controller.updateDraftMetadata(draft.id, {
    title: "Staged Dawn (Edited)",
    chapterType: "interlude",
  });

  const viewModel = buildStagingReviewViewModel(updated);
  if (viewModel.hasBlockingErrors) {
    throw new Error(`Unexpected staging validation errors: ${viewModel.errors.join(", ")}`);
  }

  const approved = controller.approveDraft(updated.id);
  const chapter = content.getChapterById(approved.chapterId);
  if (!chapter) {
    throw new Error("Expected approved draft to create chapter record");
  }

  if (chapter.title !== "Staged Dawn (Edited)") {
    throw new Error("Metadata update was not persisted to approved chapter");
  }

  const rejected = controller.uploadHtmlPreview("reject-me.docx", "<p>Reject this draft</p>", {
    slug: "reject-me",
  });
  const rejectedDraft = controller.rejectDraft(rejected.id, "Author rejected import");
  if (rejectedDraft.status !== "rejected") {
    throw new Error("Expected rejected draft status");
  }

  cleanup(importStorePath);
  cleanup(contentStorePath);
  console.log("platform import staging smoke test: ok");
}

run();
