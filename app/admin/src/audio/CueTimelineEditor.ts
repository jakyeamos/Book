import { AudioAssetRecord, AudioCueRecord } from "../../../../platform/shared/src/audio/cue-schema";
import { DocumentBlock } from "../../../../platform/shared/src/document/schema";

export interface TimelineLane {
  id: string;
  layer: "music" | "ambient";
  cues: Array<{
    cueId: string;
    assetTitle: string;
    startIndex: number;
    endIndex: number;
    volume: number;
    fadeInMs: number;
    fadeOutMs: number;
  }>;
}

export function buildCueTimeline(
  cues: AudioCueRecord[],
  assets: AudioAssetRecord[],
  blocks: DocumentBlock[],
): TimelineLane[] {
  const blockIndex = new Map<string, number>();
  blocks.forEach((block, index) => blockIndex.set(block.id, index));

  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));

  const lanes: Record<"music" | "ambient", TimelineLane> = {
    music: { id: "lane_music", layer: "music", cues: [] },
    ambient: { id: "lane_ambient", layer: "ambient", cues: [] },
  };

  cues.forEach((cue) => {
    const lane = lanes[cue.layer];
    if (!lane) {
      return;
    }

    lane.cues.push({
      cueId: cue.id,
      assetTitle: assetMap.get(cue.assetId)?.title ?? "Unknown asset",
      startIndex: blockIndex.get(cue.startAnchor.blockId) ?? -1,
      endIndex: blockIndex.get(cue.endAnchor.blockId) ?? -1,
      volume: cue.volume,
      fadeInMs: cue.fadeInMs,
      fadeOutMs: cue.fadeOutMs,
    });
  });

  return [lanes.music, lanes.ambient];
}

export function summarizeTimeline(lanes: TimelineLane[]): string {
  return lanes
    .map((lane) => `${lane.layer}: ${lane.cues.length} cue(s)`)
    .join(" | ");
}
