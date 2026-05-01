import {
  AudioAssetRecord,
  AudioCueRecord,
  CueValidationResult,
} from "../../../../platform/shared/src/audio/cue-schema";
import { DocumentBlock } from "../../../../platform/shared/src/document/schema";

export interface BlockOption {
  id: string;
  label: string;
  type: DocumentBlock["type"];
  orderIndex: number;
}

export interface AudioCueEditorViewModel {
  id: string;
  chapterId: string;
  assetId: string;
  assetTitle: string;
  layer: AudioCueRecord["layer"];
  startBlockId: string;
  endBlockId: string;
  startSectionLabel: string;
  endSectionLabel: string;
  volume: number;
  fadeInMs: number;
  fadeOutMs: number;
  loop: boolean;
  overlapMode: AudioCueRecord["overlapMode"];
  status: AudioCueRecord["status"];
  validationIssues: string[];
}

export interface AudioStudioViewModel {
  chapterId: string;
  blocks: BlockOption[];
  assets: AudioAssetRecord[];
  cues: AudioCueEditorViewModel[];
  timeline: TimelineLane[];
  validationResults: CueValidationResult[];
  canPublish: boolean;
  blockingIssues: string[];
}

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

function blockText(block: DocumentBlock): string {
  return block.spans.map((span) => span.text).join("").trim();
}

function blockLabel(block: DocumentBlock, index: number): string {
  if (block.type === "scene_break") {
    return `Scene break ${index + 1}`;
  }

  const text = blockText(block);
  return text.length > 80 ? `${text.slice(0, 77)}...` : text || `Section ${index + 1}`;
}

export function buildBlockOptions(blocks: DocumentBlock[]): BlockOption[] {
  return blocks.map((block, index) => ({
    id: block.id,
    label: blockLabel(block, index),
    type: block.type,
    orderIndex: index,
  }));
}

export function buildCueEditorViewModel(
  cue: AudioCueRecord,
  assets: AudioAssetRecord[],
  blocks: DocumentBlock[],
): AudioCueEditorViewModel {
  const assetMap = new Map(assets.map((asset) => [asset.id, asset]));
  const blockOptions = buildBlockOptions(blocks);
  const blockMap = new Map(blockOptions.map((block) => [block.id, block]));

  return {
    id: cue.id,
    chapterId: cue.chapterId,
    assetId: cue.assetId,
    assetTitle: assetMap.get(cue.assetId)?.title ?? "Unknown asset",
    layer: cue.layer,
    startBlockId: cue.startAnchor.blockId,
    endBlockId: cue.endAnchor.blockId,
    startSectionLabel: blockMap.get(cue.startAnchor.blockId)?.label ?? "Missing section",
    endSectionLabel: blockMap.get(cue.endAnchor.blockId)?.label ?? "Missing section",
    volume: cue.volume,
    fadeInMs: cue.fadeInMs,
    fadeOutMs: cue.fadeOutMs,
    loop: cue.loop,
    overlapMode: cue.overlapMode,
    status: cue.status,
    validationIssues: cue.validationIssues,
  };
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

export function buildAudioStudioViewModel(input: {
  chapterId: string;
  cues: AudioCueRecord[];
  assets: AudioAssetRecord[];
  blocks: DocumentBlock[];
  validationResults: CueValidationResult[];
}): AudioStudioViewModel {
  const blockingIssues = input.validationResults.flatMap((result) => result.issues);

  return {
    chapterId: input.chapterId,
    blocks: buildBlockOptions(input.blocks),
    assets: input.assets,
    cues: input.cues.map((cue) => buildCueEditorViewModel(cue, input.assets, input.blocks)),
    timeline: buildCueTimeline(input.cues, input.assets, input.blocks),
    validationResults: input.validationResults,
    canPublish: blockingIssues.length === 0,
    blockingIssues,
  };
}
