import {
  AudioCueRecord,
  CueAnchor,
  CueLayer,
  CueOverlapMode,
  makeCueId,
  nowAudioIso,
} from "../../../../shared/src/audio/cue-schema";
import { AudioCueRepository } from "./cue.repository";

type CueUpdateInput = Partial<Pick<AudioCueRecord, "assetId" | "layer" | "startAnchor" | "endAnchor" | "volume" | "fadeInMs" | "fadeOutMs" | "loop" | "overlapMode">>;

function removeUndefined(updates: CueUpdateInput): CueUpdateInput {
  const entries = Object.entries(updates).filter(([, value]) => value !== undefined);
  return Object.fromEntries(entries) as CueUpdateInput;
}

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

  updateCue(
    cueId: string,
    updates: CueUpdateInput,
  ): AudioCueRecord {
    const definedUpdates = removeUndefined(updates);
    return this.repository.updateCue(cueId, (cue) => ({
      ...cue,
      ...definedUpdates,
    }));
  }

  deleteCue(cueId: string): void {
    this.repository.deleteCue(cueId);
  }

  listChapterCues(chapterId: string): AudioCueRecord[] {
    return this.repository.listCues(chapterId);
  }
}

