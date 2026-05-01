import { compileChapter } from "../../../../platform/api/src/compile/chapter.compiler";
import { ContentRepository } from "../../../../platform/api/src/content/content.repository";
import { EditorialService } from "../../../../platform/api/src/content/editorial.service";
import { PublishWorkflowService } from "../../../../platform/api/src/publish/workflow.service";
import {
  ChapterRecord,
  ChapterStatus,
  ChapterType,
  DocumentBlock,
  DocumentBlockType,
  DocumentSpan,
  NormalizedDocument,
  SourceImportMeta,
  SpanMark,
  VisibilityConfig,
  defaultVisibility,
  nowIso,
} from "../../../../platform/shared/src/document/schema";

export interface RichTextSpanInput {
  id?: string;
  text: string;
  marks?: SpanMark[];
}

export interface RichTextBlockInput {
  id?: string;
  type: DocumentBlockType;
  text?: string;
  spans?: RichTextSpanInput[];
  level?: number;
}

export interface ChapterStudioInput {
  title: string;
  slug: string;
  orderIndex: number;
  body: RichTextBlockInput[];
  chapterType?: ChapterType;
  visibility?: VisibilityConfig;
}

export interface ChapterStudioUpdateInput {
  title?: string;
  slug?: string;
  orderIndex?: number;
  body?: RichTextBlockInput[];
  chapterType?: ChapterType;
  visibility?: VisibilityConfig;
}

export interface ChapterStudioBlockViewModel {
  id: string;
  type: DocumentBlockType;
  label: string;
  text: string;
}

export interface ChapterStudioViewModel {
  id: string;
  title: string;
  slug: string;
  status: ChapterStatus;
  orderIndex: number;
  chapterType: ChapterType;
  visibility: VisibilityConfig;
  blocks: ChapterStudioBlockViewModel[];
  previewHtml: string;
}

function safeToken(value: string): string {
  const token = value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return token || "chapter";
}

function blockText(block: DocumentBlock): string {
  return block.spans.map((span) => span.text).join("");
}

function normalizeSpans(block: RichTextBlockInput, blockId: string): DocumentSpan[] {
  if (block.type === "scene_break") {
    return [];
  }

  const spans = block.spans && block.spans.length > 0
    ? block.spans
    : [{ text: block.text ?? "" }];

  return spans.map((span, index) => ({
    id: span.id ?? `${blockId}_spn_${index + 1}`,
    text: span.text,
    marks: span.marks,
  }));
}

function normalizeBody(slug: string, body: RichTextBlockInput[]): NormalizedDocument {
  const chapterToken = safeToken(slug);

  return {
    schemaVersion: 1,
    blocks: body.map((block, index) => {
      const id = block.id ?? `blk_${chapterToken}_${index + 1}`;
      return {
        id,
        type: block.type,
        spans: normalizeSpans(block, id),
        level: block.type === "heading" ? block.level ?? 2 : undefined,
      };
    }),
  };
}

function sourceMeta(sourceFile: string): SourceImportMeta {
  return {
    sourceType: "html-fragment",
    sourceFile,
    importedAt: nowIso(),
    warnings: [],
  };
}

function blockLabel(block: DocumentBlock, index: number): string {
  if (block.type === "scene_break") {
    return `Scene break ${index + 1}`;
  }

  const text = blockText(block).trim();
  return text.length > 80 ? `${text.slice(0, 77)}...` : text || `Section ${index + 1}`;
}

export function buildChapterStudioViewModel(chapter: ChapterRecord): ChapterStudioViewModel {
  return {
    id: chapter.id,
    title: chapter.title,
    slug: chapter.slug,
    status: chapter.status,
    orderIndex: chapter.orderIndex,
    chapterType: chapter.type,
    visibility: chapter.visibility,
    previewHtml: chapter.compiledOutput.html,
    blocks: chapter.normalizedDocument.blocks.map((block, index) => ({
      id: block.id,
      type: block.type,
      label: blockLabel(block, index),
      text: blockText(block),
    })),
  };
}

export class ChapterStudioController {
  constructor(
    private readonly content: ContentRepository,
    private readonly editorial: EditorialService,
    private readonly publishWorkflow: PublishWorkflowService,
  ) {}

  listChapters(): ChapterStudioViewModel[] {
    return this.content.listChapters().map(buildChapterStudioViewModel);
  }

  createChapter(input: ChapterStudioInput): ChapterStudioViewModel {
    const normalizedDocument = normalizeBody(input.slug, input.body);
    const chapter = this.content.createChapter({
      slug: input.slug,
      title: input.title,
      orderIndex: input.orderIndex,
      type: input.chapterType,
      visibility: input.visibility ?? defaultVisibility(),
      sourceImport: sourceMeta(`${input.slug}.admin`),
      normalizedDocument,
      compiledOutput: compileChapter(input.slug, normalizedDocument),
    });

    return buildChapterStudioViewModel(chapter);
  }

  updateChapter(chapterId: string, updates: ChapterStudioUpdateInput): ChapterStudioViewModel {
    const current = this.content.getChapterById(chapterId);
    if (!current) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }

    const slug = updates.slug ?? current.slug;
    const normalizedDocument = updates.body
      ? normalizeBody(slug, updates.body)
      : current.normalizedDocument;

    const chapter = this.content.updateChapter(chapterId, {
      slug: updates.slug,
      title: updates.title,
      orderIndex: updates.orderIndex,
      type: updates.chapterType,
      visibility: updates.visibility,
      normalizedDocument,
      compiledOutput: compileChapter(chapterId, normalizedDocument),
    });

    return buildChapterStudioViewModel(chapter);
  }

  reorderChapters(chapterIdsInOrder: string[]): ChapterStudioViewModel[] {
    this.editorial.reorderChapters(chapterIdsInOrder);
    return this.listChapters();
  }

  previewChapter(chapterId: string): ChapterStudioViewModel {
    const chapter = this.publishWorkflow.previewChapter(chapterId);
    if (!chapter) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }
    return buildChapterStudioViewModel(chapter);
  }

  publishChapter(chapterId: string): ChapterStudioViewModel {
    const chapter = this.publishWorkflow.publishChapter(chapterId);
    if (!chapter) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }
    return buildChapterStudioViewModel(chapter);
  }

  rollbackChapter(chapterId: string, versionId: string): ChapterStudioViewModel {
    const chapter = this.publishWorkflow.rollbackChapter(chapterId, versionId);
    if (!chapter) {
      throw new Error(`Chapter not found: ${chapterId}`);
    }
    return buildChapterStudioViewModel(chapter);
  }
}
