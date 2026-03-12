import * as fs from "node:fs";
import * as path from "node:path";
import { ReaderRuntime } from "../../app/reader/src/runtime/reader-runtime";
import { AudioEngine } from "../../app/reader/src/audio/audio-engine";
import { ChapterImportController } from "../../app/admin/src/chapters/import/import-controller";
import { EditorialWorkflowController } from "../../app/admin/src/chapters/editorial/workflow-controller";
import { LocalAudioStorageAdapter, AudioAssetLibraryService } from "../api/src/audio/assets/asset-library.service";
import { CueValidationService } from "../api/src/audio/cue-validation.service";
import { AudioCueRepository } from "../api/src/audio/cues/cue.repository";
import { AudioCueService } from "../api/src/audio/cues/cue.service";
import { ContentRepository } from "../api/src/content/content.repository";
import { EditorialService } from "../api/src/content/editorial.service";
import { StagingService } from "../api/src/content/staging.service";
import { DocxImportService } from "../api/src/import/docx-import.service";
import { ImportJobRepository } from "../api/src/import/import-job.repository";
import { ReaderMetrics } from "../api/src/metrics/reader-metrics";
import { AnchorReconcileService } from "../api/src/reader/anchor-reconcile.service";
import { HighlightsService } from "../api/src/reader/highlights.service";
import { ProgressService } from "../api/src/reader/progress.service";
import { ReaderSyncRepository } from "../api/src/reader/reader-sync.repository";
import { PublishWorkflowService } from "../api/src/publish/workflow.service";

function cleanup(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function cleanupDir(dirPath: string): void {
  if (fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

async function run(): Promise<void> {
  const contentStorePath = path.join(".planning", "data", "content-store.phase06-e2e.json");
  const importStorePath = path.join(".planning", "data", "import-store.phase06-e2e.json");
  const audioStorePath = path.join(".planning", "data", "audio-store.phase06-e2e.json");
  const readerStorePath = path.join(".planning", "data", "reader-sync-store.phase06-e2e.json");
  const metricsPath = path.join(".planning", "data", "phase06-metrics.phase06-e2e.json");
  const assetDir = path.join(".planning", "data", "audio-assets.phase06-e2e");

  cleanup(contentStorePath);
  cleanup(importStorePath);
  cleanup(audioStorePath);
  cleanup(readerStorePath);
  cleanup(metricsPath);
  cleanupDir(assetDir);

  const importStartedAt = Date.now();

  const content = new ContentRepository(contentStorePath);
  const imports = new ImportJobRepository(importStorePath);
  const importer = new DocxImportService(imports);
  const staging = new StagingService(imports, content);
  const importController = new ChapterImportController(importer, staging);

  const editorial = new EditorialService(content);
  const publishWorkflow = new PublishWorkflowService(content);
  const editorialController = new EditorialWorkflowController(editorial, publishWorkflow);

  const audioRepo = new AudioCueRepository(audioStorePath);
  const audioAssets = new AudioAssetLibraryService(audioRepo, new LocalAudioStorageAdapter(assetDir));
  const cueService = new AudioCueService(audioRepo);
  const cueValidation = new CueValidationService(content, audioRepo);

  const readerRepo = new ReaderSyncRepository(readerStorePath);
  const highlights = new HighlightsService(readerRepo);
  const progress = new ProgressService(readerRepo);
  const reconcile = new AnchorReconcileService(readerRepo);

  const metrics = new ReaderMetrics(metricsPath);

  const draft = importController.uploadHtmlPreview(
    "phase06-e2e.docx",
    [
      '<h2 class="chapter-title">Phase06 E2E</h2>',
      '<p>First line of the imported chapter.</p>',
      '<p>Second line with <strong>emphasis</strong>.</p>',
    ].join("\n"),
    {
      slug: "phase06-e2e",
      orderIndex: 77,
    },
  );

  const approved = importController.approveDraft(draft.id);
  const chapterId = approved.chapterId;

  editorialController.preview(chapterId);
  editorialController.publish(chapterId);

  metrics.trackAuthorImportPublished(chapterId, Date.now() - importStartedAt);
  metrics.trackPublishResult(chapterId, "success");

  const chapter = content.getChapterById(chapterId);
  if (!chapter) {
    throw new Error("Expected approved chapter for e2e flow");
  }

  const music = audioAssets.uploadAsset({
    fileName: "phase06-music.mp3",
    title: "Phase06 Music",
    type: "music",
    content: Buffer.from("music"),
    durationSeconds: 120,
  });

  const cue = cueService.createCue({
    chapterId,
    assetId: music.id,
    layer: "music",
    startAnchor: { blockId: chapter.normalizedDocument.blocks[0].id },
    endAnchor: { blockId: chapter.normalizedDocument.blocks[Math.max(chapter.normalizedDocument.blocks.length - 1, 0)].id },
    overlapMode: "crossfade",
  });

  const cueResults = cueValidation.validateChapterCues(chapterId);
  const brokenCueCount = cueResults.filter((result) => result.status === "broken").length;
  metrics.trackCueValidation(chapterId, brokenCueCount);
  cueValidation.ensureChapterPublishable(chapterId);

  const userId = "reader@example.com";
  const highlight = highlights.createHighlight({
    userId,
    chapterId,
    blockId: chapter.normalizedDocument.blocks[0].id,
    startOffset: 0,
    endOffset: 8,
    selectedText: "Phase06",
  });
  highlights.addNote({
    userId,
    highlightId: highlight.id,
    content: "E2E note",
  });

  progress.updateProgress({
    userId,
    chapterId,
    progressPercent: 55,
    positionKey: `${chapter.normalizedDocument.blocks[1].id}:0`,
    scrollY: 880,
  });

  reconcile.reconcileHighlightsForChapter(
    userId,
    chapterId,
    chapter.normalizedDocument.blocks.map((block) => block.id),
  );

  metrics.trackHighlightUsage(userId, chapterId, highlights.listHighlights(userId, chapterId).length);

  const runtime = new ReaderRuntime();
  await runtime.runTransition(chapterId, async () => Promise.resolve());
  runtime.updateScroll(900);
  runtime.snapshotResume(`${chapter.normalizedDocument.blocks[1].id}:0`);
  const restored = runtime.restoreResume(chapterId);
  metrics.trackResumeResult(userId, chapterId, Boolean(restored));

  const audioEngine = new AudioEngine();
  audioEngine.transitionToChapter(chapterId);
  audioEngine.scheduleCue(cue, 0, 5000);
  const playing = audioEngine.getPlayableCues(1000);
  if (playing.length === 0) {
    metrics.trackAudioTransitionFailure(chapterId, "Cue not playable during active window");
    throw new Error("Audio cue did not become playable");
  }

  const xfade = audioEngine.crossfadeVolume(1, 0.7, 0.5);
  if (xfade.to <= 0 || xfade.from <= 0) {
    throw new Error("Crossfade result invalid");
  }

  metrics.flush();
  const events = metrics.getEvents();
  if (events.length < 5) {
    throw new Error("Expected phase06 metrics events to be emitted");
  }

  cleanup(contentStorePath);
  cleanup(importStorePath);
  cleanup(audioStorePath);
  cleanup(readerStorePath);
  cleanup(metricsPath);
  cleanupDir(assetDir);

  console.log("platform phase06 e2e smoke test: ok");
}

run();
