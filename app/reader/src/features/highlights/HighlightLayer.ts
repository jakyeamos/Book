import { HighlightRecord, NoteRecord } from "../../../../../platform/shared/src/reader/schema";

export interface HighlightViewItem {
  id: string;
  chapterId: string;
  selectedText: string;
  noteCount: number;
  unresolved: boolean;
  color: string;
}

export function buildHighlightLayer(
  highlights: HighlightRecord[],
  notes: NoteRecord[],
): HighlightViewItem[] {
  const noteCounts = new Map<string, number>();
  notes.forEach((note) => {
    noteCounts.set(note.highlightId, (noteCounts.get(note.highlightId) ?? 0) + 1);
  });

  return highlights.map((highlight) => ({
    id: highlight.id,
    chapterId: highlight.chapterId,
    selectedText: highlight.selectedText,
    noteCount: noteCounts.get(highlight.id) ?? 0,
    unresolved: Boolean(highlight.unresolved),
    color: highlight.color,
  }));
}

export function createLocalHighlightDraft(input: {
  chapterId: string;
  blockId: string;
  selectedText: string;
}) {
  return {
    chapterId: input.chapterId,
    anchor: {
      blockId: input.blockId,
      startOffset: 0,
      endOffset: input.selectedText.length,
    },
    selectedText: input.selectedText,
    createdAt: new Date().toISOString(),
  };
}
