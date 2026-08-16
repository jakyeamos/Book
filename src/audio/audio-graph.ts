"use client";

export interface AudioGraphCue {
  id: string;
  layer: "music" | "ambience";
  url?: string;
  gainDb: number;
  loop: boolean;
  fadeInMs?: number;
  fadeOutMs?: number;
  duckMusicDb?: number;
  duckAttackMs?: number;
  duckReleaseMs?: number;
}

export class AudioGraph {
  private context: AudioContext | undefined;
  private readonly media = new Map<string, HTMLAudioElement>();
  private readonly gains = new Map<string, GainNode>();
  private readonly cues = new Map<string, AudioGraphCue>();

  public async play(cues: AudioGraphCue[]): Promise<void> {
    if (typeof window === "undefined") {
      return;
    }
    this.context ??= new AudioContext();
    if (this.context.state === "suspended") {
      await this.context.resume();
    }
    const nextIds = new Set(cues.map((cue) => cue.id));
    for (const [id, existing] of this.cues) {
      if (!nextIds.has(id)) {
        this.fadeOut(id, existing.fadeOutMs ?? 240);
      }
    }
    for (const cue of cues) {
      this.cues.set(cue.id, cue);
      if (!cue.url) {
        continue;
      }
      const media = this.media.get(cue.id) ?? new Audio(cue.url);
      media.loop = cue.loop;
      media.preload = "auto";
      if (!this.media.has(cue.id)) {
        const source = this.context.createMediaElementSource(media);
        const gain = this.context.createGain();
        gain.gain.value = 0;
        source.connect(gain).connect(this.context.destination);
        this.gains.set(cue.id, gain);
        this.media.set(cue.id, media);
      }
      this.fadeIn(cue.id, cue.gainDb, cue.fadeInMs ?? 240);
      await media.play();
    }
    this.applyDucking(cues);
  }

  public pause(): void {
    for (const media of this.media.values()) {
      media.pause();
    }
  }

  public stop(): void {
    for (const media of this.media.values()) {
      media.pause();
      media.currentTime = 0;
    }
    this.cues.clear();
  }

  public setGain(cueId: string, gainDb: number): void {
    const gain = this.gains.get(cueId);
    if (gain && this.context) {
      gain.gain.setTargetAtTime(Math.pow(10, gainDb / 20), this.context.currentTime, 0.12);
    }
  }

  public dispose(): void {
    this.stop();
    for (const media of this.media.values()) {
      media.src = "";
    }
    this.media.clear();
    this.gains.clear();
    this.cues.clear();
    void this.context?.close();
    this.context = undefined;
  }

  private fadeIn(cueId: string, gainDb: number, durationMs: number): void {
    const gain = this.gains.get(cueId);
    if (!gain || !this.context) {
      return;
    }
    const now = this.context.currentTime;
    const target = Math.pow(10, gainDb / 20);
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(target, now + Math.max(durationMs, 0) / 1000);
  }

  private fadeOut(cueId: string, durationMs: number): void {
    const gain = this.gains.get(cueId);
    const media = this.media.get(cueId);
    if (!gain || !media || !this.context) {
      this.cues.delete(cueId);
      return;
    }
    const now = this.context.currentTime;
    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + Math.max(durationMs, 0) / 1000);
    window.setTimeout(() => {
      media.pause();
      this.cues.delete(cueId);
    }, Math.max(durationMs, 0));
  }

  private applyDucking(cues: AudioGraphCue[]): void {
    const ducking = cues.find((cue) => cue.layer === "ambience" && cue.duckMusicDb !== undefined);
    if (!ducking) {
      return;
    }
    const musicGain = cues.find((cue) => cue.layer === "music");
    if (!musicGain || !this.context) {
      return;
    }
    this.setGain(musicGain.id, musicGain.gainDb + (ducking.duckMusicDb ?? 0));
  }
}
