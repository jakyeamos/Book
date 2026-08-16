import type { AudioAsset, AudioCue, ChapterRevision } from "./model";

export interface CompositionIssue {
  code: "missing-block" | "missing-asset" | "invalid-range" | "music-overlap" | "too-many-ambience" | "invalid-fade";
  severity: "error";
  message: string;
  sceneId?: string;
  cueId?: string;
}

export interface CompositionValidationResult {
  ok: boolean;
  issues: CompositionIssue[];
}

function blockRange(revision: ChapterRevision, startBlockId: string, endBlockId: string): [number, number] | undefined {
  const start = revision.document.blocks.findIndex((block) => block.id === startBlockId);
  const end = revision.document.blocks.findIndex((block) => block.id === endBlockId);
  if (start < 0 || end < 0) {
    return undefined;
  }
  return start <= end ? [start, end] : [end, start];
}

function assetForCue(assets: AudioAsset[], cue: AudioCue): AudioAsset | undefined {
  return assets.find((asset) => asset.id === cue.assetId && asset.status === "ready");
}

function overlaps(left: [number, number], right: [number, number]): boolean {
  return left[0] <= right[1] && right[0] <= left[1];
}

export function validateComposition(revision: ChapterRevision): CompositionValidationResult {
  const issues: CompositionIssue[] = [];
  const scenes = [...revision.experience.scenes].sort((left, right) => left.orderIndex - right.orderIndex);
  const sceneRanges = new Map<string, [number, number]>();
  const ambienceCues: Array<{ cue: AudioCue; range: [number, number]; sceneId: string }> = [];

  for (const scene of scenes) {
    const range = blockRange(revision, scene.startBlockId, scene.endBlockId);
    if (!range) {
      issues.push({ code: "invalid-range", severity: "error", message: `Scene “${scene.label}” has an invalid block range.`, sceneId: scene.id });
      continue;
    }
    sceneRanges.set(scene.id, range);

    const sceneMusic: Array<{ cue: AudioCue; range: [number, number] }> = [];
    for (const cue of scene.cues) {
      const cueRange = blockRange(revision, cue.startBlockId, cue.endBlockId);
      if (!cueRange) {
        issues.push({ code: "missing-block", severity: "error", message: `Cue ${cue.id} references a missing block.`, sceneId: scene.id, cueId: cue.id });
        continue;
      }
      if (!sceneRanges.get(scene.id) || cueRange[0] < range[0] || cueRange[1] > range[1]) {
        issues.push({ code: "invalid-range", severity: "error", message: `Cue ${cue.id} extends outside its scene.`, sceneId: scene.id, cueId: cue.id });
      }
      const asset = assetForCue(revision.assets, cue);
      if (!asset) {
        issues.push({ code: "missing-asset", severity: "error", message: `Cue ${cue.id} references an asset that is not ready.`, sceneId: scene.id, cueId: cue.id });
      } else if (cue.fadeInMs + cue.fadeOutMs > asset.durationMs) {
        issues.push({ code: "invalid-fade", severity: "error", message: `Cue ${cue.id} fades exceed the asset duration.`, sceneId: scene.id, cueId: cue.id });
      }
      if (cue.layer === "music") {
        sceneMusic.push({ cue, range: cueRange });
      } else {
        ambienceCues.push({ cue, range: cueRange, sceneId: scene.id });
      }
    }

    for (let index = 0; index < sceneMusic.length; index += 1) {
      for (let nextIndex = index + 1; nextIndex < sceneMusic.length; nextIndex += 1) {
        if (overlaps(sceneMusic[index].range, sceneMusic[nextIndex].range)) {
          issues.push({ code: "music-overlap", severity: "error", message: "A scene can have only one active music cue at a time.", sceneId: scene.id, cueId: sceneMusic[nextIndex].cue.id });
        }
      }
    }

  }

  for (const ambienceCue of ambienceCues) {
    const activeCount = ambienceCues.filter((candidate) => overlaps(candidate.range, ambienceCue.range)).length;
    if (activeCount > 4) {
      issues.push({ code: "too-many-ambience", severity: "error", message: "At most four ambience beds may overlap, including across scene boundaries.", sceneId: ambienceCue.sceneId, cueId: ambienceCue.cue.id });
    }
  }

  return { ok: issues.length === 0, issues };
}
