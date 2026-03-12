export type ChapterStatus = "draft" | "preview" | "published";

export type ChapterType = "standard" | "interlude" | "hidden" | "conditional";

export type VisibilityMode = "public" | "direct-link" | "conditional";

export interface VisibilityConfig {
  mode: VisibilityMode;
  conditionKey?: string;
  includeInToc: boolean;
}

export type SpanMark = "bold" | "italic";

export interface DocumentSpan {
  id: string;
  text: string;
  marks?: SpanMark[];
}

export type DocumentBlockType =
  | "heading"
  | "paragraph"
  | "scene_break"
  | "blockquote";

export interface DocumentBlock {
  id: string;
  type: DocumentBlockType;
  spans: DocumentSpan[];
  level?: number;
  sourceHint?: string;
}

export interface NormalizedDocument {
  schemaVersion: number;
  blocks: DocumentBlock[];
}

export interface ThemeConfig {
  accentColor?: string;
  backgroundTint?: string;
  classes?: string[];
}

export interface SourceImportMeta {
  sourceType: "docx" | "html-fragment";
  sourceFile?: string;
  importedAt: string;
  warnings: string[];
}

export interface CompiledChapterOutput {
  html: string;
  runtime: {
    chapterId: string;
    blockOrder: string[];
    wordCount: number;
    generatedAt: string;
  };
}

export interface ChapterRecord {
  id: string;
  slug: string;
  title: string;
  orderIndex: number;
  status: ChapterStatus;
  type: ChapterType;
  visibility: VisibilityConfig;
  theme: ThemeConfig;
  sourceImport: SourceImportMeta;
  normalizedDocument: NormalizedDocument;
  compiledOutput: CompiledChapterOutput;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChapterVersionRecord {
  id: string;
  chapterId: string;
  status: ChapterStatus;
  normalizedSnapshot: NormalizedDocument;
  compiledSnapshot: CompiledChapterOutput;
  publishedAt?: string;
  rollbackEligible: boolean;
  createdAt: string;
}

export interface CreateChapterInput {
  slug: string;
  title: string;
  orderIndex: number;
  type?: ChapterType;
  visibility?: VisibilityConfig;
  theme?: ThemeConfig;
  sourceImport: SourceImportMeta;
  normalizedDocument: NormalizedDocument;
  compiledOutput: CompiledChapterOutput;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function defaultVisibility(): VisibilityConfig {
  return {
    mode: "public",
    includeInToc: true,
  };
}

export function makeChapterId(slug: string): string {
  return `ch_${slug.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
}

export function makeVersionId(chapterId: string, version: number): string {
  return `${chapterId}_v${version}`;
}
