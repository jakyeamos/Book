import {
  AudioAssetLibraryService,
} from "../../../../platform/api/src/audio/assets/asset-library.service";
import { CueValidationService } from "../../../../platform/api/src/audio/cue-validation.service";
import { AudioCueRepository } from "../../../../platform/api/src/audio/cues/cue.repository";
import { AudioCueService } from "../../../../platform/api/src/audio/cues/cue.service";
import { ContentRepository } from "../../../../platform/api/src/content/content.repository";
import {
  AudioAssetRecord,
  AudioCueRecord,
  CueLayer,
  CueOverlapMode,
} from "../../../../platform/shared/src/audio/cue-schema";
import { DocumentBlock } from "../../../../platform/shared/src/document/schema";
import {
  AudioCueEditorViewModel,
  AudioStudioViewModel,
  buildAudioStudioViewModel,
  buildCueEditorViewModel,
} from "./CueTimelineEditor";
import { applyCueRepair, suggestCueRepair } from "./repair/cue-repair";

export interface AdminMp3UploadInput {
  fileName: string;
  title: string;
  content: Buffer;
  durationSeconds: number;
  defaultVolume?: number;
}

export interface BlockCueCreateInput {
  chapterId: string;
  assetId: string;
  layer: CueLayer;
  startBlockId: string;
  endBlockId: string;
  volume?: number;
  fadeInMs?: number;
  fadeOutMs?: number;
  loop?: boolean;
  overlapMode?: CueOverlapMode;
}

export interface BlockCueUpdateInput {
  assetId?: string;
  layer?: CueLayer;
  startBlockId?: string;
  endBlockId?: string;
  volume?: number;
  fadeInMs?: number;
  fadeOutMs?: number;
  loop?: boolean;
  overlapMode?: CueOverlapMode;
}

export interface PublishReadinessViewModel {
  canPublish: boolean;
  blockingIssues: string[];
}

function blockIds(blocks: DocumentBlock[]): string[] {
  return blocks.map((block) => block.id);
}

export class AudioStudioController {
  constructor(
    private readonly content: ContentRepository,
    private readonly assets: AudioAssetLibraryService,
    private readonly repository: AudioCueRepository,
    private readonly cues: AudioCueService,
    private readonly validator: CueValidationService,
  ) {}

  uploadMp3(input: AdminMp3UploadInput): AudioAssetRecord {
    return this.assets.uploadAsset({
      fileName: input.fileName,
      title: input.title,
      type: "music",
      content: input.content,
      durationSeconds: input.durationSeconds,
      defaultVolume: input.defaultVolume,
    });
  }

  listAssets(): AudioAssetRecord[] {
    return this.assets.listAssets();
  }

  getChapterStudio(chapterId: string): AudioStudioViewModel {
    const chapter = this.requireChapter(chapterId);
    const validationResults = this.validator.validateChapterCues(chapterId);

    return buildAudioStudioViewModel({
      chapterId,
      cues: this.repository.listCues(chapterId),
      assets: this.repository.listAssets(),
      blocks: chapter.normalizedDocument.blocks,
      validationResults,
    });
  }

  createCueFromBlocks(input: BlockCueCreateInput): AudioCueEditorViewModel {
    const chapter = this.requireChapter(input.chapterId);
    this.assertBlockRange(chapter.normalizedDocument.blocks, input.startBlockId, input.endBlockId);

    const cue = this.cues.createCue({
      chapterId: input.chapterId,
      assetId: input.assetId,
      layer: input.layer,
      startAnchor: { blockId: input.startBlockId },
      endAnchor: { blockId: input.endBlockId },
      volume: input.volume,
      fadeInMs: input.fadeInMs,
      fadeOutMs: input.fadeOutMs,
      loop: input.loop,
      overlapMode: input.overlapMode,
    });
    this.validator.validateChapterCues(input.chapterId);

    return this.toCueViewModel(cue.id);
  }

  updateCueFromBlocks(cueId: string, updates: BlockCueUpdateInput): AudioCueEditorViewModel {
    const current = this.requireCue(cueId);
    const chapter = this.requireChapter(current.chapterId);
    const startBlockId = updates.startBlockId ?? current.startAnchor.blockId;
    const endBlockId = updates.endBlockId ?? current.endAnchor.blockId;
    this.assertBlockRange(chapter.normalizedDocument.blocks, startBlockId, endBlockId);

    this.cues.updateCue(cueId, {
      assetId: updates.assetId,
      layer: updates.layer,
      startAnchor: { blockId: startBlockId },
      endAnchor: { blockId: endBlockId },
      volume: updates.volume,
      fadeInMs: updates.fadeInMs,
      fadeOutMs: updates.fadeOutMs,
      loop: updates.loop,
      overlapMode: updates.overlapMode,
    });
    this.validator.validateChapterCues(current.chapterId);

    return this.toCueViewModel(cueId);
  }

  deleteCue(cueId: string): void {
    this.cues.deleteCue(cueId);
  }

  repairCue(cueId: string): AudioCueEditorViewModel | undefined {
    const cue = this.requireCue(cueId);
    const chapter = this.requireChapter(cue.chapterId);
    const suggestion = suggestCueRepair(cue, blockIds(chapter.normalizedDocument.blocks));
    if (!suggestion) {
      return undefined;
    }

    const repaired = applyCueRepair(cue, suggestion.suggestedStart, suggestion.suggestedEnd);
    this.repository.saveCue(repaired);
    this.validator.validateChapterCues(cue.chapterId);

    return this.toCueViewModel(cueId);
  }

  getPublishReadiness(chapterId: string): PublishReadinessViewModel {
    const broken = this.validator.detectBrokenCues(chapterId);
    const blockingIssues = broken.flatMap((cue) => cue.validationIssues);
    return {
      canPublish: blockingIssues.length === 0,
      blockingIssues,
    };
  }

  private toCueViewModel(cueId: string): AudioCueEditorViewModel {
    const cue = this.requireCue(cueId);
    const chapter = this.requireChapter(cue.chapterId);
    return buildCueEditorViewModel(
      cue,
      this.repository.listAssets(),
      chapter.normalizedDocument.blocks,
    );
  }

  private requireChapter(chapterId: string) {
    const chapter = this.content.getChapterById(chapterId);
    if (!chapter) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }
    return chapter;
  }

  private requireCue(cueId: string): AudioCueRecord {
    const cue = this.repository.getCue(cueId);
    if (!cue) {
      throw new Error(`Cue not found: ${cueId}`);
    }
    return cue;
  }

  private assertBlockRange(blocks: DocumentBlock[], startBlockId: string, endBlockId: string): void {
    const ids = blockIds(blocks);
    const startIndex = ids.indexOf(startBlockId);
    const endIndex = ids.indexOf(endBlockId);
    if (startIndex === -1) {
      throw new Error(`Start section not found: ${startBlockId}`);
    }
    if (endIndex === -1) {
      throw new Error(`End section not found: ${endBlockId}`);
    }
    if (startIndex > endIndex) {
      throw new Error("Start section must come before end section");
    }
  }
}
