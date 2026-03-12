import * as fs from "node:fs";
import * as path from "node:path";
import {
  ImportJobRecord,
  ImportJobStatus,
  StagedChapterDraft,
  touchDraft,
  touchImportJob,
} from "../../../shared/src/import/schema";

interface ImportStoreShape {
  jobs: ImportJobRecord[];
  drafts: StagedChapterDraft[];
}

export class ImportJobRepository {
  private readonly storePath: string;
  private store: ImportStoreShape;

  constructor(storePath = path.join(".planning", "data", "import-store.json")) {
    this.storePath = storePath;
    this.store = this.load();
  }

  createJob(job: ImportJobRecord): ImportJobRecord {
    this.store.jobs.push(job);
    this.save();
    return job;
  }

  updateJobStatus(
    jobId: string,
    status: ImportJobStatus,
    options?: { warnings?: string[]; error?: string },
  ): ImportJobRecord {
    let updated: ImportJobRecord | undefined;

    this.store.jobs = this.store.jobs.map((job) => {
      if (job.id !== jobId) {
        return job;
      }

      updated = touchImportJob({
        ...job,
        status,
        warnings: options?.warnings ?? job.warnings,
        error: options?.error,
      });

      return updated;
    });

    if (!updated) {
      throw new Error(`Import job not found: ${jobId}`);
    }

    this.save();
    return updated;
  }

  getJob(jobId: string): ImportJobRecord | undefined {
    return this.store.jobs.find((job) => job.id === jobId);
  }

  listJobs(): ImportJobRecord[] {
    return [...this.store.jobs];
  }

  saveDraft(draft: StagedChapterDraft): StagedChapterDraft {
    this.store.drafts = this.store.drafts.filter((item) => item.id !== draft.id);
    this.store.drafts.push(draft);
    this.save();
    return draft;
  }

  updateDraft(draftId: string, updater: (draft: StagedChapterDraft) => StagedChapterDraft): StagedChapterDraft {
    let nextDraft: StagedChapterDraft | undefined;

    this.store.drafts = this.store.drafts.map((draft) => {
      if (draft.id !== draftId) {
        return draft;
      }

      nextDraft = touchDraft(updater(draft));
      return nextDraft;
    });

    if (!nextDraft) {
      throw new Error(`Staged draft not found: ${draftId}`);
    }

    this.save();
    return nextDraft;
  }

  getDraft(draftId: string): StagedChapterDraft | undefined {
    return this.store.drafts.find((draft) => draft.id === draftId);
  }

  listDrafts(): StagedChapterDraft[] {
    return [...this.store.drafts];
  }

  private load(): ImportStoreShape {
    try {
      if (!fs.existsSync(this.storePath)) {
        return { jobs: [], drafts: [] };
      }

      const raw = fs.readFileSync(this.storePath, "utf8");
      const parsed = JSON.parse(raw) as ImportStoreShape;
      return {
        jobs: parsed.jobs ?? [],
        drafts: parsed.drafts ?? [],
      };
    } catch {
      return { jobs: [], drafts: [] };
    }
  }

  private save(): void {
    fs.mkdirSync(path.dirname(this.storePath), { recursive: true });
    fs.writeFileSync(this.storePath, JSON.stringify(this.store, null, 2), "utf8");
  }
}
