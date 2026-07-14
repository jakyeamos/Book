import { createHash } from "node:crypto";

import type { BlockType, ChapterDocument } from "@/domain/composition/model";

const blockPattern = /<(h[1-6]|p|blockquote|pre)\b[^>]*>([\s\S]*?)<\/\1>/gi;

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'");
}

function textOnly(value: string): string {
  return decodeEntities(value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim());
}

function blockType(tag: string): BlockType {
  if (tag.toLowerCase().startsWith("h")) {
    return "heading";
  }
  if (tag.toLowerCase() === "blockquote") {
    return "quote";
  }
  if (tag.toLowerCase() === "pre") {
    return "verse";
  }
  return "paragraph";
}

function stableBlockId(chapterId: string, index: number, text: string): string {
  return `block-${createHash("sha256").update(`${chapterId}:${index}:${text}`).digest("hex").slice(0, 16)}`;
}

export function importLegacyHtmlDocument(chapterId: string, html: string): ChapterDocument {
  const blocks: ChapterDocument["blocks"] = [];
  for (const match of html.matchAll(blockPattern)) {
    const text = textOnly(match[2] ?? "");
    if (text.length > 0) {
      blocks.push({ id: stableBlockId(chapterId, blocks.length, text), type: blockType(match[1] ?? "p"), text, emphasis: false });
    }
  }
  if (blocks.length === 0) {
    const text = textOnly(html);
    if (text.length > 0) {
      blocks.push({ id: stableBlockId(chapterId, 0, text), type: "paragraph", text, emphasis: false });
    }
  }
  if (blocks.length === 0) {
    throw new Error(`Legacy chapter ${chapterId} contains no readable text.`);
  }
  return { blocks };
}
