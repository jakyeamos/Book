import { AudioCueRecord, CueAnchor } from "../../../../../platform/shared/src/audio/cue-schema";

export interface CueRepairSuggestion {
  cueId: string;
  suggestedStart: CueAnchor;
  suggestedEnd: CueAnchor;
  reason: string;
}

export function suggestCueRepair(
  cue: AudioCueRecord,
  availableBlockIds: string[],
): CueRepairSuggestion | undefined {
  if (availableBlockIds.length === 0) {
    return undefined;
  }

  const fallbackStart = availableBlockIds[0];
  const fallbackEnd = availableBlockIds[Math.max(availableBlockIds.length - 1, 0)];

  return {
    cueId: cue.id,
    suggestedStart: { blockId: fallbackStart },
    suggestedEnd: { blockId: fallbackEnd },
    reason: "Fallback to nearest available block boundaries after anchor mismatch",
  };
}

export function applyCueRepair(
  cue: AudioCueRecord,
  startAnchor: CueAnchor,
  endAnchor: CueAnchor,
): AudioCueRecord {
  return {
    ...cue,
    startAnchor,
    endAnchor,
    status: "valid",
    validationIssues: [],
  };
}
