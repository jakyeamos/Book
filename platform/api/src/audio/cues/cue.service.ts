import {
  AudioCueRecord,
  CueAnchor,
  CueLayer,
  CueOverlapMode,
  makeCueId,
  nowAudioIso,
} from "../../../../shared/src/audio/cue-schema";
import { AudioCueRepository } from "./cue.repository";

export class AudioCueService {
  constructor(private readonly repository: AudioCueRepository) {}

  createCue(input: {
    chapterId: string;
    assetId: string;
    layer: CueLayer;
    startAnchor: CueAnchor;
    endAnchor: CueAnchor;
    volume?: number;
    fadeInMs?: number;
    fadeOutMs?: number;
    loop?: boolean;
    overlapMode?: CueOverlapMode;
  }): AudioCueRecord {
    const record: AudioCueRecord = {
      id: makeCueId(input.chapterId, input.layer),
      chapterId: input.chapterId,
      assetId: input.assetId,
      layer: input.layer,
      startAnchor: input.startAnchor,
      endAnchor: input.endAnchor,
      volume: input.volume ?? 0.5,
      fadeInMs: input.fadeInMs ?? 500,
      fadeOutMs: input.fadeOutMs ?? 500,
      loop: input.loop ?? false,
      overlapMode: input.overlapMode ?? "allow",
      status: "valid",
      validationIssues: [],
      createdAt: nowAudioIso(),
      updatedAt: nowAudioIso(),
    };

    return this.repository.saveCue(record);
  }

  updateCueAnchors(cueId: string, startAnchor: CueAnchor, endAnchor: CueAnchor): AudioCueRecord {
    return this.repository.updateCue(cueId, (cue) => ({
      ...cue,
      startAnchor,
      endAnchor,
    }));
  }

  listChapterCues(chapterId: string): AudioCueRecord[] {
    return this.repository.listCues(chapterId);
  }
}

