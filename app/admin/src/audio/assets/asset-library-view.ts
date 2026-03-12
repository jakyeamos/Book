import { AudioAssetRecord, AudioAssetType } from "../../../../../platform/shared/src/audio/cue-schema";

export function filterAssetsByType(
  assets: AudioAssetRecord[],
  type: AudioAssetType,
): AudioAssetRecord[] {
  return assets.filter((asset) => asset.type === type);
}

export function describeAsset(asset: AudioAssetRecord): string {
  return `${asset.title} (${asset.type}, ${asset.durationSeconds}s)`;
}
