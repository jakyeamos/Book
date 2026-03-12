import * as fs from "node:fs";
import * as path from "node:path";
import { createLocalHighlightDraft, buildHighlightLayer } from "../../app/reader/src/features/highlights/HighlightLayer";
import { pickResumeProgress, shouldSyncProgress } from "../../app/reader/src/features/progress/progress-sync";
import { AnchorReconcileService } from "../api/src/reader/anchor-reconcile.service";
import { HighlightsService } from "../api/src/reader/highlights.service";
import { ProgressService } from "../api/src/reader/progress.service";
import { ReaderSyncRepository } from "../api/src/reader/reader-sync.repository";

function cleanup(filePath: string): void {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

function run(): void {
  const storePath = path.join(".planning", "data", "reader-sync-store.smoke.json");
  cleanup(storePath);

  const repository = new ReaderSyncRepository(storePath);
  const highlights = new HighlightsService(repository);
  const progress = new ProgressService(repository);
  const reconcile = new AnchorReconcileService(repository);

  const userId = "reader@example.com";
  const chapterId = "ch_alpha";

  const highlight = highlights.createHighlight({
    userId,
    chapterId,
    blockId: "blk_old",
    startOffset: 0,
    endOffset: 12,
    selectedText: "Important line",
  });

  const note = highlights.addNote({
    userId,
    highlightId: highlight.id,
    content: "Remember this moment",
  });

  if (!note.id) {
    throw new Error("Expected note id after note creation");
  }

  const previousProgress = progress.updateProgress({
    userId,
    chapterId,
    progressPercent: 32,
    positionKey: "blk_old:0",
    scrollY: 480,
  });

  const nextProgress = progress.updateProgress({
    userId,
    chapterId,
    progressPercent: 64,
    positionKey: "blk_new:12",
    scrollY: 960,
  });

  if (!shouldSyncProgress(previousProgress, nextProgress)) {
    throw new Error("Expected sync trigger for significant progress update");
  }

  const reconcileResults = reconcile.reconcileHighlightsForChapter(userId, chapterId, ["blk_new", "blk_new_2"]);
  if (reconcileResults.length !== 1 || !reconcileResults[0].reconciled) {
    throw new Error("Expected one reconciled highlight");
  }

  const syncedHighlights = highlights.listHighlights(userId, chapterId);
  const syncedNotes = highlights.listNotes(userId, chapterId);
  const layer = buildHighlightLayer(syncedHighlights, syncedNotes);

  if (layer.length !== 1 || layer[0].noteCount !== 1) {
    throw new Error("Expected highlight layer to include note count");
  }

  const resume = pickResumeProgress(previousProgress, nextProgress);
  if (!resume || resume.progressPercent !== 64) {
    throw new Error("Expected resume to pick latest progress record");
  }

  const localDraft = createLocalHighlightDraft({
    chapterId,
    blockId: "blk_local",
    selectedText: "Anonymous draft",
  });

  if (!localDraft.anchor.blockId) {
    throw new Error("Expected local highlight draft anchor");
  }

  cleanup(storePath);
  console.log("platform reader sync smoke test: ok");
}

run();
