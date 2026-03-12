import {
  ChapterType,
  CompiledChapterOutput,
  NormalizedDocument,
  ThemeConfig,
  VisibilityConfig,
  nowIso,
} from "../document/schema";

export type ImportJobStatus = "queued" | "running" | "succeeded" | "failed";

export interface ImportJobRecord {
  id: string;
  fileName: string;
  status: ImportJobStatus;
  warnings: string[];
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export type StagedDraftStatus = "staged" | "approved" | "rejected";

export interface StagedChapterMetadata {
  title: string;
  slug: string;
  chapterType: ChapterType;
  orderIndex: number;
  visibility: VisibilityConfig;
  theme: ThemeConfig;
}

export interface StagedChapterDraft {
  id: string;
  jobId: string;
  metadata: StagedChapterMetadata;
  normalizedDocument: NormalizedDocument;
  compiledPreview: CompiledChapterOutput;
  status: StagedDraftStatus;
  validationErrors: string[];
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ImportResult {
  job: ImportJobRecord;
  normalizedDocument: NormalizedDocument;
  compiledPreview: CompiledChapterOutput;
  warnings: string[];
}

export function makeImportJobId(fileName: string): string {
  const safe = fileName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `imp_${safe}_${Date.now()}`;
}

export function makeStagedDraftId(slug: string): string {
  const safe = slug.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `stg_${safe}_${Date.now()}`;
}

export function makeDefaultStagedMetadata(title: string, slug: string): StagedChapterMetadata {
  return {
    title,
    slug,
    chapterType: "standard",
    orderIndex: 0,
    visibility: {
      mode: "public",
      includeInToc: true,
    },
    theme: {},
  };
}

export function touchImportJob(job: ImportJobRecord): ImportJobRecord {
  return {
    ...job,
    updatedAt: nowIso(),
  };
}

export function touchDraft(draft: StagedChapterDraft): StagedChapterDraft {
  return {
    ...draft,
    updatedAt: nowIso(),
  };
}
