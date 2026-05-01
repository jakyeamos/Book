import * as fs from "node:fs";
import * as path from "node:path";
import { AudioStudioController } from "../../app/admin/src/audio/audio-studio-controller";
import { summarizeTimeline, buildCueTimeline } from "../../app/admin/src/audio/CueTimelineEditor";
import { applyCueRepair, suggestCueRepair } from "../../app/admin/src/audio/repair/cue-repair";
import { LocalAudioStorageAdapter, AudioAssetLibraryService } from "../api/src/audio/assets/asset-library.service";
import { AudioCueRepository } from "../api/src/audio/cues/cue.repository";
import { AudioCueService } from "../api/src/audio/cues/cue.service";
import { CueValidationService } from "../api/src/audio/cue-validation.service";
import { compileChapter } from "../api/src/compile/chapter.compiler";
import { ContentRepository } from "../api/src/content/content.repository";
import { PublishWorkflowService } from "../api/src/publish/workflow.service";
import { NormalizedDocument, SourceImportMeta, nowIso } from "../shared/src/document/schema";

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

function sourceMeta(fileName: string): SourceImportMeta {
  return {
    sourceType: "docx",
    sourceFile: fileName,
    importedAt: nowIso(),
    warnings: [],
  };
}

function chapterDoc(): NormalizedDocument {
  return {
    schemaVersion: 1,
    blocks: [
      {
        id: "blk_title",
        type: "heading",
        level: 2,
        spans: [{ id: "spn_title", text: "Audio Chapter" }],
      },
      {
        id: "blk_a",
        type: "paragraph",
        spans: [{ id: "spn_a", text: "Beginning paragraph" }],
      },
      {
        id: "blk_b",
        type: "paragraph",
        spans: [{ id: "spn_b", text: "Middle paragraph" }],
      },
      {
        id: "blk_c",
        type: "paragraph",
        spans: [{ id: "spn_c", text: "Ending paragraph" }],
      },
    ],
  };
}

function run(): void {
  const contentStorePath = path.join(".planning", "data", "content-store.audio-smoke.json");
  const audioStorePath = path.join(".planning", "data", "audio-store.smoke.json");
  const assetDir = path.join(".planning", "data", "audio-assets-smoke");

  cleanup(contentStorePath);
  cleanup(audioStorePath);
  cleanupDir(assetDir);

  const content = new ContentRepository(contentStorePath);
  const audioRepository = new AudioCueRepository(audioStorePath);
  const cueService = new AudioCueService(audioRepository);
  const validator = new CueValidationService(content, audioRepository);
  const guardedPublish = new PublishWorkflowService(content, validator);
  const assets = new AudioAssetLibraryService(audioRepository, new LocalAudioStorageAdapter(assetDir));
  const audioStudio = new AudioStudioController(content, assets, audioRepository, cueService, validator);

  const doc = chapterDoc();
  const chapter = content.createChapter({
    slug: "audio-chapter",
    title: "Audio Chapter",
    orderIndex: 1,
    sourceImport: sourceMeta("audio-chapter.docx"),
    normalizedDocument: doc,
    compiledOutput: compileChapter("audio-chapter", doc),
  });

  const musicAsset = assets.uploadAsset({
    fileName: "music-loop.mp3",
    title: "Music Loop",
    type: "music",
    content: Buffer.from("music"),
    durationSeconds: 150,
    defaultVolume: 0.7,
  });

  const ambientAsset = assets.uploadAsset({
    fileName: "rain-bed.mp3",
    title: "Rain Bed",
    type: "ambient",
    content: Buffer.from("ambient"),
    durationSeconds: 240,
    defaultVolume: 0.4,
  });

  const uploadedFromAdmin = audioStudio.uploadMp3({
    fileName: "admin-theme.mp3",
    title: "Admin Theme",
    content: Buffer.from("admin music"),
    durationSeconds: 180,
    defaultVolume: 0.65,
  });

  if (uploadedFromAdmin.type !== "music" || !fs.existsSync(uploadedFromAdmin.storagePath)) {
    throw new Error("Audio studio MP3 upload did not persist a selectable music asset");
  }

  const initialStudio = audioStudio.getChapterStudio(chapter.id);
  if (initialStudio.blocks.length !== 4 || initialStudio.assets.length < 3) {
    throw new Error("Audio studio did not expose chapter blocks and uploaded assets");
  }

  const adminCue = audioStudio.createCueFromBlocks({
    chapterId: chapter.id,
    assetId: uploadedFromAdmin.id,
    layer: "music",
    startBlockId: "blk_a",
    endBlockId: "blk_b",
    volume: 0.66,
    fadeInMs: 700,
    fadeOutMs: 900,
    overlapMode: "crossfade",
  });

  if (adminCue.status !== "valid" || adminCue.startSectionLabel !== "Beginning paragraph") {
    throw new Error("Audio studio did not create a valid block-based cue");
  }

  const updatedAdminCue = audioStudio.updateCueFromBlocks(adminCue.id, {
    startBlockId: "blk_b",
    endBlockId: "blk_c",
    volume: 0.5,
  });

  if (updatedAdminCue.startSectionLabel !== "Middle paragraph" || updatedAdminCue.volume !== 0.5) {
    throw new Error("Audio studio did not update cue placement from block selections");
  }

  audioStudio.deleteCue(adminCue.id);
  if (audioRepository.getCue(adminCue.id)) {
    throw new Error("Audio studio did not delete cue");
  }

  cueService.createCue({
    chapterId: chapter.id,
    assetId: musicAsset.id,
    layer: "music",
    startAnchor: { blockId: "blk_a" },
    endAnchor: { blockId: "blk_c" },
    overlapMode: "crossfade",
  });

  const brokenCue = cueService.createCue({
    chapterId: chapter.id,
    assetId: ambientAsset.id,
    layer: "ambient",
    startAnchor: { blockId: "blk_missing_start" },
    endAnchor: { blockId: "blk_missing_end" },
  });

  validator.validateChapterCues(chapter.id);
  const broken = validator.detectBrokenCues(chapter.id);
  if (broken.length !== 1 || broken[0].id !== brokenCue.id) {
    throw new Error("Expected exactly one broken cue after validation");
  }

  let publishBlocked = false;
  try {
    validator.ensureChapterPublishable(chapter.id);
  } catch {
    publishBlocked = true;
  }
  if (!publishBlocked) {
    throw new Error("Expected publish guard to block chapter with broken cues");
  }

  publishBlocked = false;
  try {
    guardedPublish.publishChapter(chapter.id);
  } catch {
    publishBlocked = true;
  }
  if (!publishBlocked) {
    throw new Error("Expected guarded publish workflow to block chapter with broken cues");
  }

  const suggestion = suggestCueRepair(brokenCue, doc.blocks.map((block) => block.id));
  if (!suggestion) {
    throw new Error("Expected cue repair suggestion");
  }

  const repaired = applyCueRepair(brokenCue, suggestion.suggestedStart, suggestion.suggestedEnd);
  audioRepository.saveCue({
    ...repaired,
    updatedAt: nowIso(),
  });

  validator.validateChapterCues(chapter.id);
  validator.ensureChapterPublishable(chapter.id);

  const repairedByStudio = audioStudio.repairCue(brokenCue.id);
  if (!repairedByStudio || repairedByStudio.status !== "valid") {
    throw new Error("Audio studio repair did not return a valid repaired cue");
  }

  const publishReadiness = audioStudio.getPublishReadiness(chapter.id);
  if (!publishReadiness.canPublish || publishReadiness.blockingIssues.length !== 0) {
    throw new Error("Audio studio publish readiness did not clear after repair");
  }
  guardedPublish.publishChapter(chapter.id);

  const timeline = buildCueTimeline(
    audioRepository.listCues(chapter.id),
    audioRepository.listAssets(),
    doc.blocks,
  );
  const summary = summarizeTimeline(timeline);
  if (!summary.includes("music") || !summary.includes("ambient")) {
    throw new Error("Timeline summary missing expected lanes");
  }

  cleanup(contentStorePath);
  cleanup(audioStorePath);
  cleanupDir(assetDir);
  console.log("platform audio studio smoke test: ok");
}

run();
