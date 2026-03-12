import {
  CompiledChapterOutput,
  DocumentBlock,
  DocumentSpan,
  NormalizedDocument,
  nowIso,
} from "../../../shared/src/document/schema";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderSpan(span: DocumentSpan): string {
  let out = escapeHtml(span.text);
  const marks = span.marks ?? [];

  if (marks.includes("italic")) {
    out = `<em>${out}</em>`;
  }
  if (marks.includes("bold")) {
    out = `<strong>${out}</strong>`;
  }

  return out;
}

function renderBlock(block: DocumentBlock): string {
  const inline = block.spans.map(renderSpan).join("");

  switch (block.type) {
    case "heading": {
      const level = Math.min(6, Math.max(1, block.level ?? 2));
      return `<h${level} data-block-id=\"${block.id}\">${inline}</h${level}>`;
    }
    case "blockquote":
      return `<blockquote data-block-id=\"${block.id}\"><p>${inline}</p></blockquote>`;
    case "scene_break":
      return `<hr class=\"scene-break\" data-block-id=\"${block.id}\" />`;
    case "paragraph":
    default:
      return `<p data-block-id=\"${block.id}\">${inline}</p>`;
  }
}

function countWords(doc: NormalizedDocument): number {
  const text = doc.blocks
    .flatMap((block) => block.spans.map((span) => span.text))
    .join(" ")
    .trim();

  if (!text) {
    return 0;
  }

  return text.split(/\s+/).length;
}

export function compileChapter(
  chapterId: string,
  normalized: NormalizedDocument,
): CompiledChapterOutput {
  const htmlBlocks = normalized.blocks.map(renderBlock).join("\n");
  const html = `<div class=\"chapter-compiled\" data-chapter-id=\"${chapterId}\">\n${htmlBlocks}\n</div>`;

  return {
    html,
    runtime: {
      chapterId,
      blockOrder: normalized.blocks.map((block) => block.id),
      wordCount: countWords(normalized),
      generatedAt: nowIso(),
    },
  };
}
