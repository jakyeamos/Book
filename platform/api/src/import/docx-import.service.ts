import { compileChapter } from "../compile/chapter.compiler";
import { ImportJobRepository } from "./import-job.repository";
import {
  ImportResult,
  makeImportJobId,
} from "../../../shared/src/import/schema";
import { DocumentBlock, DocumentSpan, NormalizedDocument, nowIso } from "../../../shared/src/document/schema";

const mammoth: {
  convertToHtml(input: { buffer: Buffer }): Promise<{ value: string; messages: Array<{ message: string }> }>;
} = require("mammoth");

export class DocxImportService {
  constructor(private readonly imports: ImportJobRepository) {}

  async importDocx(fileName: string, fileBuffer: Buffer): Promise<ImportResult> {
    const slug = this.slugFromFileName(fileName);
    const job = this.imports.createJob({
      id: makeImportJobId(fileName),
      fileName,
      status: "queued",
      warnings: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });

    this.imports.updateJobStatus(job.id, "running");

    try {
      const converted = await mammoth.convertToHtml({ buffer: fileBuffer });
      const warnings = converted.messages.map((message) => message.message);
      const normalized = this.normalizedFromHtml(converted.value, slug);
      const compiledPreview = compileChapter(`preview_${slug}`, normalized);

      const updatedJob = this.imports.updateJobStatus(job.id, "succeeded", { warnings });
      return {
        job: updatedJob,
        normalizedDocument: normalized,
        compiledPreview,
        warnings,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown DOCX import failure";
      const failedJob = this.imports.updateJobStatus(job.id, "failed", { error: message });
      throw new Error(`Import failed (${failedJob.id}): ${message}`);
    }
  }

  importFromHtmlPreview(fileName: string, html: string): ImportResult {
    const slug = this.slugFromFileName(fileName);
    const job = this.imports.createJob({
      id: makeImportJobId(fileName),
      fileName,
      status: "succeeded",
      warnings: [],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });

    const normalized = this.normalizedFromHtml(html, slug);
    const compiledPreview = compileChapter(`preview_${slug}`, normalized);

    return {
      job,
      normalizedDocument: normalized,
      compiledPreview,
      warnings: [],
    };
  }

  private normalizedFromHtml(html: string, slug: string): NormalizedDocument {
    const blocks: DocumentBlock[] = [];
    const blockRegex = /<(h[1-6]|p|blockquote|hr)\b[^>]*>([\s\S]*?)<\/\1>|<hr\b[^>]*\/?\s*>/gi;

    let match: RegExpExecArray | null;
    let blockIndex = 0;

    while ((match = blockRegex.exec(html)) !== null) {
      const fullMatch = match[0];
      const tag = (match[1] || "hr").toLowerCase();

      if (fullMatch.toLowerCase().startsWith("<hr")) {
        blocks.push({
          id: `blk_${blockIndex++}`,
          type: "scene_break",
          spans: [],
          sourceHint: "docx",
        });
        continue;
      }

      const inner = match[2] ?? "";
      const spans = this.parseInlineSpans(inner);
      if (tag.startsWith("h")) {
        const level = Number.parseInt(tag.replace("h", ""), 10);
        blocks.push({
          id: `blk_${blockIndex++}`,
          type: "heading",
          level: Number.isNaN(level) ? 2 : level,
          spans,
          sourceHint: "docx",
        });
        continue;
      }

      blocks.push({
        id: `blk_${blockIndex++}`,
        type: tag === "blockquote" ? "blockquote" : "paragraph",
        spans,
        sourceHint: "docx",
      });
    }

    if (blocks.length === 0) {
      blocks.push({
        id: "blk_0",
        type: "heading",
        level: 2,
        spans: [{ id: "spn_0_0", text: slug.replace(/[-_]+/g, " ") }],
        sourceHint: "docx",
      });
    }

    return {
      schemaVersion: 1,
      blocks,
    };
  }

  private parseInlineSpans(rawHtml: string): DocumentSpan[] {
    const spans: DocumentSpan[] = [];
    const tagRegex = /<(\/)?(strong|b|em|i)\b[^>]*>/gi;
    const marks = new Set<"bold" | "italic">();

    let index = 0;
    let cursor = 0;
    let match: RegExpExecArray | null;

    while ((match = tagRegex.exec(rawHtml)) !== null) {
      const text = this.cleanText(rawHtml.slice(cursor, match.index));
      if (text) {
        spans.push({
          id: `spn_inline_${index++}`,
          text,
          marks: marks.size > 0 ? Array.from(marks) : undefined,
        });
      }

      const closing = match[1] === "/";
      const tag = match[2].toLowerCase();
      const mark = tag === "strong" || tag === "b" ? "bold" : "italic";

      if (closing) {
        marks.delete(mark);
      } else {
        marks.add(mark);
      }

      cursor = match.index + match[0].length;
    }

    const remaining = this.cleanText(rawHtml.slice(cursor));
    if (remaining) {
      spans.push({
        id: `spn_inline_${index++}`,
        text: remaining,
        marks: marks.size > 0 ? Array.from(marks) : undefined,
      });
    }

    if (spans.length === 0) {
      return [
        {
          id: "spn_inline_empty",
          text: this.cleanText(rawHtml),
        },
      ];
    }

    return spans.filter((span) => span.text.length > 0);
  }

  private cleanText(value: string): string {
    return value
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/\s+/g, " ")
      .trim();
  }

  private slugFromFileName(fileName: string): string {
    return fileName
      .toLowerCase()
      .replace(/\.docx$/i, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "untitled";
  }
}
