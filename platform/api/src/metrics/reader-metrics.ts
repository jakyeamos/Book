import * as fs from "node:fs";
import * as path from "node:path";

export interface MetricEvent {
  name: string;
  at: string;
  data: Record<string, unknown>;
}

export class ReaderMetrics {
  private readonly events: MetricEvent[] = [];

  constructor(private readonly outputPath = path.join(".planning", "data", "phase06-metrics.json")) {}

  track(name: string, data: Record<string, unknown>): void {
    this.events.push({
      name,
      at: new Date().toISOString(),
      data,
    });
  }

  trackAuthorImportPublished(chapterId: string, msFromImportToPublish: number): void {
    this.track("author.import_to_publish", { chapterId, msFromImportToPublish });
  }

  trackCueValidation(chapterId: string, brokenCueCount: number): void {
    this.track("audio.cue_validation", { chapterId, brokenCueCount });
  }

  trackPublishResult(chapterId: string, status: "success" | "failed"): void {
    this.track("publish.result", { chapterId, status });
  }

  trackHighlightUsage(userId: string, chapterId: string, highlightCount: number): void {
    this.track("reader.highlight_usage", { userId, chapterId, highlightCount });
  }

  trackResumeResult(userId: string, chapterId: string, resumed: boolean): void {
    this.track("reader.resume", { userId, chapterId, resumed });
  }

  trackAudioTransitionFailure(chapterId: string, reason: string): void {
    this.track("audio.transition_failure", { chapterId, reason });
  }

  getEvents(): MetricEvent[] {
    return [...this.events];
  }

  flush(): void {
    fs.mkdirSync(path.dirname(this.outputPath), { recursive: true });
    fs.writeFileSync(this.outputPath, JSON.stringify(this.events, null, 2), "utf8");
  }
}
