import {
  DocumentBlock,
  NormalizedDocument,
  SourceImportMeta,
  nowIso,
} from "../../../../shared/src/document/schema";

function stripTags(value: string): string {
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

function paragraphBlocks(html: string): DocumentBlock[] {
  const blocks: DocumentBlock[] = [];
  const paragraphRegex = /<(p|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match: RegExpExecArray | null;
  let index = 0;

  while ((match = paragraphRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const raw = match[2];
    const text = stripTags(raw);
    if (!text) {
      continue;
    }

    blocks.push({
      id: `blk_${index++}`,
      type: tag === "blockquote" ? "blockquote" : "paragraph",
      spans: [
        {
          id: `spn_${index}_0`,
          text,
        },
      ],
      sourceHint: "html-fragment",
    });
  }

  return blocks;
}

export function deriveTitle(html: string, fallback: string): string {
  const match = /<h2[^>]*class=\"chapter-title\"[^>]*>([\s\S]*?)<\/h2>/i.exec(html);
  if (!match) {
    return fallback;
  }

  const title = stripTags(match[1]);
  return title || fallback;
}

export function normalizedFromHtmlFragment(html: string, chapterSlug: string): NormalizedDocument {
  const blocks = paragraphBlocks(html);
  const headingText = deriveTitle(html, chapterSlug);

  return {
    schemaVersion: 1,
    blocks: [
      {
        id: "blk_title",
        type: "heading",
        level: 2,
        spans: [{ id: "spn_title_0", text: headingText }],
        sourceHint: "html-fragment",
      },
      ...blocks,
    ],
  };
}

export function sourceMetaFromFragment(fileName: string): SourceImportMeta {
  return {
    sourceType: "html-fragment",
    sourceFile: fileName,
    importedAt: nowIso(),
    warnings: [],
  };
}
