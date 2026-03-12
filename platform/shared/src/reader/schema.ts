import { nowIso } from "../document/schema";

export interface HighlightAnchor {
  blockId: string;
  startOffset: number;
  endOffset: number;
}

export interface HighlightRecord {
  id: string;
  userId: string;
  chapterId: string;
  anchor: HighlightAnchor;
  selectedText: string;
  color: string;
  unresolved?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NoteRecord {
  id: string;
  highlightId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReaderProgressRecord {
  id: string;
  userId: string;
  chapterId: string;
  progressPercent: number;
  positionKey: string;
  scrollY: number;
  lastReadAt: string;
  updatedAt: string;
}

export function makeHighlightId(userId: string, chapterId: string): string {
  return `hl_${userId}_${chapterId}_${Date.now()}`;
}

export function makeNoteId(highlightId: string): string {
  return `nt_${highlightId}_${Date.now()}`;
}

export function makeProgressId(userId: string, chapterId: string): string {
  return `prg_${userId}_${chapterId}`;
}

export function nowReaderIso(): string {
  return nowIso();
}
