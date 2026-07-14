import type { AudioCue, ChapterRevision } from "./model";

export function activeCuesForBlock(revision: ChapterRevision, blockId: string): AudioCue[] {
  const blockIndex = revision.document.blocks.findIndex((block) => block.id === blockId);
  if (blockIndex < 0) {
    return [];
  }
  return revision.experience.scenes
    .flatMap((scene) => scene.cues)
    .filter((cue) => {
      const start = revision.document.blocks.findIndex((block) => block.id === cue.startBlockId);
      const end = revision.document.blocks.findIndex((block) => block.id === cue.endBlockId);
      return start >= 0 && end >= 0 && blockIndex >= Math.min(start, end) && blockIndex <= Math.max(start, end);
    });
}

export function sceneForBlock(revision: ChapterRevision, blockId: string): string | undefined {
  const blockIndex = revision.document.blocks.findIndex((block) => block.id === blockId);
  if (blockIndex < 0) {
    return undefined;
  }
  return revision.experience.scenes.find((scene) => {
    const start = revision.document.blocks.findIndex((block) => block.id === scene.startBlockId);
    const end = revision.document.blocks.findIndex((block) => block.id === scene.endBlockId);
    return start >= 0 && end >= 0 && blockIndex >= Math.min(start, end) && blockIndex <= Math.max(start, end);
  })?.id;
}
