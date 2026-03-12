import {
  AudioCueRecord,
  CueValidationResult,
} from "../../../shared/src/audio/cue-schema";
import { ContentRepository } from "../content/content.repository";
import { AudioCueRepository } from "./cues/cue.repository";

export class CueValidationService {
  constructor(
    private readonly content: ContentRepository,
    private readonly audio: AudioCueRepository,
  ) {}

  validateChapterCues(chapterId: string): CueValidationResult[] {
    const cues = this.audio.listCues(chapterId);
    return cues.map((cue) => this.validateAndPersist(cue));
  }

  detectBrokenCues(chapterId: string): AudioCueRecord[] {
    this.validateChapterCues(chapterId);
    return this.audio
      .listCues(chapterId)
      .filter((cue) => cue.status === "broken");
  }

  ensureChapterPublishable(chapterId: string): void {
    const broken = this.detectBrokenCues(chapterId);
    if (broken.length > 0) {
      const ids = broken.map((cue) => cue.id).join(", ");
      throw new Error(`Chapter has broken cues that must be repaired before publish: ${ids}`);
    }
  }

  private validateAndPersist(cue: AudioCueRecord): CueValidationResult {
    const issues = this.validateCue(cue);
    const status = issues.length === 0 ? "valid" : "broken";
    this.audio.markCueStatus(cue.id, status, issues);
    return {
      cueId: cue.id,
      status,
      issues,
    };
  }

  private validateCue(cue: AudioCueRecord): string[] {
    const issues: string[] = [];

    const chapter = this.content.getChapterById(cue.chapterId);
    if (!chapter) {
      issues.push(`Chapter not found: ${cue.chapterId}`);
      return issues;
    }

    const blockIds = new Set(chapter.normalizedDocument.blocks.map((block) => block.id));
    if (!blockIds.has(cue.startAnchor.blockId)) {
      issues.push(`Start anchor block not found: ${cue.startAnchor.blockId}`);
    }
    if (!blockIds.has(cue.endAnchor.blockId)) {
      issues.push(`End anchor block not found: ${cue.endAnchor.blockId}`);
    }

    if (!this.audio.getAsset(cue.assetId)) {
      issues.push(`Asset not found: ${cue.assetId}`);
    }

    if (cue.volume < 0 || cue.volume > 1) {
      issues.push("Cue volume must be between 0 and 1");
    }

    return issues;
  }
}

