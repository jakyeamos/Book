import * as fs from "node:fs";
import * as path from "node:path";
import {
  HighlightRecord,
  NoteRecord,
  ReaderProgressRecord,
} from "../../../shared/src/reader/schema";

interface ReaderStoreShape {
  highlights: HighlightRecord[];
  notes: NoteRecord[];
  progress: ReaderProgressRecord[];
}

export class ReaderSyncRepository {
  private readonly storePath: string;
  private store: ReaderStoreShape;

  constructor(storePath = path.join(".planning", "data", "reader-sync-store.json")) {
    this.storePath = storePath;
    this.store = this.load();
  }

  saveHighlight(highlight: HighlightRecord): HighlightRecord {
    this.store.highlights = this.store.highlights.filter((item) => item.id !== highlight.id);
    this.store.highlights.push(highlight);
    this.save();
    return highlight;
  }

  getHighlight(highlightId: string): HighlightRecord | undefined {
    return this.store.highlights.find((highlight) => highlight.id === highlightId);
  }

  listHighlights(userId: string, chapterId?: string): HighlightRecord[] {
    return this.store.highlights.filter((highlight) => {
      if (highlight.userId !== userId) {
        return false;
      }
      if (chapterId && highlight.chapterId !== chapterId) {
        return false;
      }
      return true;
    });
  }

  saveNote(note: NoteRecord): NoteRecord {
    this.store.notes = this.store.notes.filter((item) => item.id !== note.id);
    this.store.notes.push(note);
    this.save();
    return note;
  }

  listNotes(userId: string, chapterId?: string): NoteRecord[] {
    const allowedHighlightIds = new Set(
      this.listHighlights(userId, chapterId).map((highlight) => highlight.id),
    );

    return this.store.notes.filter((note) => note.userId === userId && allowedHighlightIds.has(note.highlightId));
  }

  saveProgress(progress: ReaderProgressRecord): ReaderProgressRecord {
    this.store.progress = this.store.progress.filter((item) => item.id !== progress.id);
    this.store.progress.push(progress);
    this.save();
    return progress;
  }

  getProgress(userId: string, chapterId: string): ReaderProgressRecord | undefined {
    return this.store.progress.find(
      (progress) => progress.userId === userId && progress.chapterId === chapterId,
    );
  }

  listProgress(userId: string): ReaderProgressRecord[] {
    return this.store.progress.filter((progress) => progress.userId === userId);
  }

  private load(): ReaderStoreShape {
    try {
      if (!fs.existsSync(this.storePath)) {
        return { highlights: [], notes: [], progress: [] };
      }

      const raw = fs.readFileSync(this.storePath, "utf8");
      const parsed = JSON.parse(raw) as ReaderStoreShape;
      return {
        highlights: parsed.highlights ?? [],
        notes: parsed.notes ?? [],
        progress: parsed.progress ?? [],
      };
    } catch {
      return { highlights: [], notes: [], progress: [] };
    }
  }

  private save(): void {
    fs.mkdirSync(path.dirname(this.storePath), { recursive: true });
    fs.writeFileSync(this.storePath, JSON.stringify(this.store, null, 2), "utf8");
  }
}

