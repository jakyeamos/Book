import * as fs from "node:fs";
import * as path from "node:path";
import { ChapterStudioController } from "../../app/admin/src/chapters/chapter-studio-controller";
import { EditorialWorkflowController } from "../../app/admin/src/chapters/editorial/workflow-controller";
import { EditorialService } from "../api/src/content/editorial.service";
import { compileChapter } from "../api/src/compile/chapter.compiler";
import { ContentRepository } from "../api/src/content/content.repository";
import { PublishWorkflowService } from "../api/src/publish/workflow.service";
import { NormalizedDocument, SourceImportMeta, nowIso } from "../shared/src/document/schema";

function cleanup(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function sourceMeta(fileName: string): SourceImportMeta {
  return {
    sourceType: "html-fragment",
    sourceFile: fileName,
    importedAt: nowIso(),
    warnings: [],
  };
}

function docFromText(title: string, paragraph: string): NormalizedDocument {
  return {
    schemaVersion: 1,
    blocks: [
      {
        id: "blk_title",
        type: "heading",
        level: 2,
        spans: [{ id: "spn_title", text: title }],
      },
      {
        id: "blk_1",
        type: "paragraph",
        spans: [{ id: "spn_1", text: paragraph }],
      },
    ],
  };
}

function run(): void {
  const contentStorePath = path.join(".planning", "data", "content-store.editorial-smoke.json");
  cleanup(contentStorePath);

  const content = new ContentRepository(contentStorePath);

  const aDoc = docFromText("Alpha", "First chapter paragraph");
  const bDoc = docFromText("Beta", "Second chapter paragraph");

  const chapterA = content.createChapter({
    slug: "alpha",
    title: "Alpha",
    orderIndex: 1,
    sourceImport: sourceMeta("alpha.html"),
    normalizedDocument: aDoc,
    compiledOutput: compileChapter("alpha", aDoc),
  });

  const chapterB = content.createChapter({
    slug: "beta",
    title: "Beta",
    orderIndex: 2,
    sourceImport: sourceMeta("beta.html"),
    normalizedDocument: bDoc,
    compiledOutput: compileChapter("beta", bDoc),
  });

  const editorial = new EditorialService(content);
  const workflow = new PublishWorkflowService(content);
  const controller = new EditorialWorkflowController(editorial, workflow);
  const chapterStudio = new ChapterStudioController(content, editorial, workflow);

  const studioChapter = chapterStudio.createChapter({
    title: "Gamma",
    slug: "gamma",
    orderIndex: 3,
    body: [
      { type: "heading", text: "Gamma", level: 2 },
      { type: "paragraph", text: "Created entirely from the admin chapter studio." },
    ],
  });

  if (studioChapter.blocks.length !== 2 || !studioChapter.previewHtml.includes("Created entirely")) {
    throw new Error("Chapter studio create did not expose rich-text preview blocks");
  }

  const editedStudioChapter = chapterStudio.updateChapter(studioChapter.id, {
    title: "Gamma Revised",
    body: [
      { type: "heading", text: "Gamma Revised", level: 2 },
      { type: "paragraph", text: "Updated by a nontechnical admin through rich text." },
      { type: "scene_break", text: "" },
      { type: "paragraph", text: "Second section remains selectable for cues." },
    ],
  });

  if (
    editedStudioChapter.title !== "Gamma Revised" ||
    editedStudioChapter.blocks.length !== 4 ||
    !editedStudioChapter.previewHtml.includes("Updated by a nontechnical admin")
  ) {
    throw new Error("Chapter studio edit did not persist rich-text content");
  }

  chapterStudio.reorderChapters([chapterB.id, chapterA.id, studioChapter.id]);
  const ordered = controller.listChapters();
  if (ordered[0].id !== chapterB.id) {
    throw new Error("Chapter reorder did not persist expected order");
  }

  controller.updateChapterSettings(chapterA.id, {
    chapterType: "conditional",
    visibility: {
      mode: "conditional",
      conditionKey: "reader_unlock_alpha",
      includeInToc: false,
    },
  });

  controller.preview(chapterA.id);
  controller.publish(chapterA.id);

  const versionAfterFirstPublish = controller
    .listVersions(chapterA.id)
    .filter((version) => version.status === "published");

  if (versionAfterFirstPublish.length === 0) {
    throw new Error("Expected at least one published version");
  }

  const revisedDoc = docFromText("Alpha", "Updated chapter paragraph with extra words for rollback check");
  content.updateChapter(chapterA.id, {
    normalizedDocument: revisedDoc,
    compiledOutput: compileChapter("alpha", revisedDoc),
    status: "preview",
  });

  controller.publish(chapterA.id);

  const publishedVersions = controller
    .listVersions(chapterA.id)
    .filter((version) => version.status === "published");

  if (publishedVersions.length < 2) {
    throw new Error("Expected multiple published snapshots for rollback");
  }

  const targetRollbackVersion = publishedVersions[0];
  controller.rollback(chapterA.id, targetRollbackVersion.id);

  const rolledBack = content.getChapterById(chapterA.id);
  if (!rolledBack) {
    throw new Error("Chapter missing after rollback");
  }

  if (rolledBack.compiledOutput.runtime.wordCount !== targetRollbackVersion.compiledSnapshot.runtime.wordCount) {
    throw new Error("Rollback did not restore expected compiled snapshot");
  }

  chapterStudio.previewChapter(studioChapter.id);
  const publishedStudioChapter = chapterStudio.publishChapter(studioChapter.id);
  if (publishedStudioChapter.status !== "published") {
    throw new Error("Chapter studio publish did not persist published status");
  }

  cleanup(contentStorePath);
  console.log("platform editorial workflow smoke test: ok");
}

run();
