import {
  ReaderProgressRecord,
  makeProgressId,
  nowReaderIso,
} from "../../../shared/src/reader/schema";
import { ReaderSyncRepository } from "./reader-sync.repository";

export class ProgressService {
  constructor(private readonly repository: ReaderSyncRepository) {}

  updateProgress(input: {
    userId: string;
    chapterId: string;
    progressPercent: number;
    positionKey: string;
    scrollY: number;
  }): ReaderProgressRecord {
    const now = nowReaderIso();
    const existing = this.repository.getProgress(input.userId, input.chapterId);

    const record: ReaderProgressRecord = {
      ...(existing ?? {}),
      id: makeProgressId(input.userId, input.chapterId),
      userId: input.userId,
      chapterId: input.chapterId,
      progressPercent: Math.max(0, Math.min(100, input.progressPercent)),
      positionKey: input.positionKey,
      scrollY: input.scrollY,
      lastReadAt: now,
      updatedAt: now,
    };

    return this.repository.saveProgress(record);
  }

  getProgress(userId: string, chapterId: string): ReaderProgressRecord | undefined {
    return this.repository.getProgress(userId, chapterId);
  }

  listProgress(userId: string): ReaderProgressRecord[] {
    return this.repository.listProgress(userId);
  }
}
