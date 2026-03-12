import { AudioCueRecord } from "../../../../platform/shared/src/audio/cue-schema";

interface ScheduledCue {
  cue: AudioCueRecord;
  startMs: number;
  endMs: number;
  canceled: boolean;
}

export class AudioEngine {
  private readonly scheduled = new Map<string, ScheduledCue>();
  private activeChapterId?: string;
  private paused = false;

  scheduleCue(cue: AudioCueRecord, startMs: number, endMs: number): void {
    this.scheduled.set(cue.id, {
      cue,
      startMs,
      endMs,
      canceled: false,
    });
  }

  cancelCue(cueId: string): void {
    const entry = this.scheduled.get(cueId);
    if (!entry) {
      return;
    }

    this.scheduled.set(cueId, {
      ...entry,
      canceled: true,
    });
  }

  clearChapter(chapterId: string): void {
    for (const [cueId, entry] of this.scheduled.entries()) {
      if (entry.cue.chapterId === chapterId) {
        this.cancelCue(cueId);
      }
    }
  }

  transitionToChapter(chapterId: string): void {
    if (this.activeChapterId && this.activeChapterId !== chapterId) {
      this.clearChapter(this.activeChapterId);
    }

    this.activeChapterId = chapterId;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  getPlayableCues(atMs: number): AudioCueRecord[] {
    if (this.paused) {
      return [];
    }

    const playable: AudioCueRecord[] = [];
    for (const entry of this.scheduled.values()) {
      if (entry.canceled) {
        continue;
      }
      if (this.activeChapterId && entry.cue.chapterId !== this.activeChapterId) {
        continue;
      }
      if (entry.startMs <= atMs && atMs <= entry.endMs) {
        playable.push(entry.cue);
      }
    }

    return playable;
  }

  crossfadeVolume(
    fromVolume: number,
    toVolume: number,
    progress: number,
  ): { from: number; to: number } {
    const clamped = Math.max(0, Math.min(1, progress));
    return {
      from: fromVolume * (1 - clamped),
      to: toVolume * clamped,
    };
  }
}
