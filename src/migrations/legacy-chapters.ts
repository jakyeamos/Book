import type { ChapterDocument } from "@/domain/composition/model";
import { importLegacyHtmlDocument } from "./legacy-document";

export interface LegacyLineCue {
  id: string;
  startLine: number;
  endLine?: number | null;
  mainTrack?: string | null;
  ambientTrack?: string | null;
  fadeInLines?: number;
  fadeOutLines?: number;
  crossfadeSeconds?: number;
}

export interface LegacyChapterExport {
  chapterId: string;
  title: string;
  document: ChapterDocument;
  scenes: Array<{
    id: string;
    label: string;
    startBlockId: string;
    endBlockId: string;
    orderIndex: number;
    cues: Array<{
      id: string;
      layer: "music" | "ambience";
      assetPath: string;
      startBlockId: string;
      endBlockId: string;
      fadeInLines: number;
      fadeOutLines: number;
      crossfadeSeconds: number;
    }>;
  }>;
}

function blockIndexForLine(document: ChapterDocument, line: number): number {
  let currentLine = 1;
  for (let index = 0; index < document.blocks.length; index += 1) {
    const blockLines = Math.max(document.blocks[index].text.split("\n").length, 1);
    if (line <= currentLine + blockLines - 1) {
      return index;
    }
    currentLine += blockLines;
  }
  return document.blocks.length - 1;
}

function lineRange(document: ChapterDocument, cue: LegacyLineCue): [string, string] {
  const start = blockIndexForLine(document, Math.max(cue.startLine, 1));
  const end = blockIndexForLine(document, cue.endLine ?? Number.MAX_SAFE_INTEGER);
  return [document.blocks[Math.min(start, end)].id, document.blocks[Math.max(start, end)].id];
}

export function exportLegacyChapter(input: { chapterId: string; title: string; html: string; lineCues: LegacyLineCue[] }): LegacyChapterExport {
  const document = importLegacyHtmlDocument(input.chapterId, input.html);
  return {
    chapterId: input.chapterId,
    title: input.title,
    document,
    scenes: input.lineCues.map((cue, orderIndex) => {
      const [startBlockId, endBlockId] = lineRange(document, cue);
      const cues = [
        cue.mainTrack ? { id: `${cue.id}-music`, layer: "music" as const, assetPath: cue.mainTrack, startBlockId, endBlockId, fadeInLines: cue.fadeInLines ?? 0, fadeOutLines: cue.fadeOutLines ?? 0, crossfadeSeconds: cue.crossfadeSeconds ?? 0 } : undefined,
        cue.ambientTrack ? { id: `${cue.id}-ambience`, layer: "ambience" as const, assetPath: cue.ambientTrack, startBlockId, endBlockId, fadeInLines: cue.fadeInLines ?? 0, fadeOutLines: cue.fadeOutLines ?? 0, crossfadeSeconds: cue.crossfadeSeconds ?? 0 } : undefined,
      ].filter((value): value is NonNullable<typeof value> => value !== undefined);
      return { id: `scene-${cue.id}`, label: cue.id, startBlockId, endBlockId, orderIndex, cues };
    }),
  };
}
