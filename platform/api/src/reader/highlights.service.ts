import {
  HighlightRecord,
  NoteRecord,
  makeHighlightId,
  makeNoteId,
  nowReaderIso,
} from "../../../shared/src/reader/schema";
import { ReaderSyncRepository } from "./reader-sync.repository";

export class HighlightsService {
  constructor(private readonly repository: ReaderSyncRepository) {}

  createHighlight(input: {
    userId: string;
    chapterId: string;
    blockId: string;
    startOffset: number;
    endOffset: number;
    selectedText: string;
    color?: string;
  }): HighlightRecord {
    const now = nowReaderIso();
    const record: HighlightRecord = {
      id: makeHighlightId(input.userId, input.chapterId),
      userId: input.userId,
      chapterId: input.chapterId,
      anchor: {
        blockId: input.blockId,
        startOffset: input.startOffset,
        endOffset: input.endOffset,
      },
      selectedText: input.selectedText,
      color: input.color ?? "yellow",
      createdAt: now,
      updatedAt: now,
    };

    return this.repository.saveHighlight(record);
  }

  addNote(input: { userId: string; highlightId: string; content: string }): NoteRecord {
    const highlight = this.repository.getHighlight(input.highlightId);
    if (!highlight || highlight.userId !== input.userId) {
      throw new Error("Highlight not found for note linkage");
    }

    const now = nowReaderIso();
    const record: NoteRecord = {
      id: makeNoteId(input.highlightId),
      highlightId: input.highlightId,
      userId: input.userId,
      content: input.content,
      createdAt: now,
      updatedAt: now,
    };

    return this.repository.saveNote(record);
  }

  listHighlights(userId: string, chapterId?: string): HighlightRecord[] {
    return this.repository.listHighlights(userId, chapterId);
  }

  listNotes(userId: string, chapterId?: string): NoteRecord[] {
    return this.repository.listNotes(userId, chapterId);
  }
}

