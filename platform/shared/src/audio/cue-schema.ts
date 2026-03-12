import { nowIso } from "../document/schema";

export type AudioAssetType = "music" | "ambient";
export type CueLayer = "music" | "ambient";
export type CueStatus = "valid" | "broken";
export type CueOverlapMode = "allow" | "crossfade" | "exclusive";

export interface AudioAssetRecord {
  id: string;
  type: AudioAssetType;
  title: string;
  storagePath: string;
  durationSeconds: number;
  defaultVolume: number;
  createdAt: string;
}

export interface CueAnchor {
  blockId: string;
  spanId?: string;
  charOffset?: number;
}

export interface AudioCueRecord {
  id: string;
  chapterId: string;
  assetId: string;
  layer: CueLayer;
  startAnchor: CueAnchor;
  endAnchor: CueAnchor;
  volume: number;
  fadeInMs: number;
  fadeOutMs: number;
  loop: boolean;
  overlapMode: CueOverlapMode;
  status: CueStatus;
  validationIssues: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CueValidationResult {
  cueId: string;
  status: CueStatus;
  issues: string[];
}

export function makeAudioAssetId(title: string): string {
  const safe = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `ast_${safe}_${Date.now()}`;
}

export function makeCueId(chapterId: string, layer: CueLayer): string {
  return `cue_${chapterId}_${layer}_${Date.now()}`;
}

export function nowAudioIso(): string {
  return nowIso();
}
