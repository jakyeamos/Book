#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const root = process.cwd();
const manifestPath = path.join(root, 'chapters', 'index.json');
const outPath = path.join(root, '.planning', 'data', 'content-store.json');

function nowIso() {
  return new Date().toISOString();
}

function stripTags(value) {
  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function deriveTitle(html, fallback) {
  const match = /<h2[^>]*class=\"chapter-title\"[^>]*>([\s\S]*?)<\/h2>/i.exec(html);
  if (!match) return fallback;
  const title = stripTags(match[1]);
  return title || fallback;
}

function blocksFromHtml(html) {
  const blocks = [];
  const paragraphRegex = /<(p|blockquote)[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;
  let index = 0;

  while ((match = paragraphRegex.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const text = stripTags(match[2]);
    if (!text) continue;

    blocks.push({
      id: `blk_${index}`,
      type: tag === 'blockquote' ? 'blockquote' : 'paragraph',
      spans: [{ id: `spn_${index}_0`, text }],
      sourceHint: 'html-fragment',
    });

    index += 1;
  }

  return blocks;
}

function compileHtml(chapterId, normalized) {
  const rendered = normalized.blocks.map((block) => {
    const text = block.spans.map((span) => span.text).join('');

    if (block.type === 'heading') {
      return `<h2 data-block-id=\"${block.id}\">${text}</h2>`;
    }
    if (block.type === 'blockquote') {
      return `<blockquote data-block-id=\"${block.id}\"><p>${text}</p></blockquote>`;
    }
    if (block.type === 'scene_break') {
      return `<hr class=\"scene-break\" data-block-id=\"${block.id}\" />`;
    }
    return `<p data-block-id=\"${block.id}\">${text}</p>`;
  }).join('\n');

  const words = normalized.blocks
    .flatMap((block) => block.spans.map((span) => span.text))
    .join(' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .length;

  return {
    html: `<div class=\"chapter-compiled\" data-chapter-id=\"${chapterId}\">\n${rendered}\n</div>`,
    runtime: {
      chapterId,
      blockOrder: normalized.blocks.map((block) => block.id),
      wordCount: words,
      generatedAt: nowIso(),
    },
  };
}

function chapterIdFromSlug(slug) {
  return `ch_${slug.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
}

function run() {
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest missing: ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const chapters = [];
  const versions = [];

  manifest.forEach((entry, chapterIndex) => {
    const relativeFile = entry.file.includes('/') || entry.file.includes('\\')
      ? entry.file
      : path.join('chapters', entry.file);
    const chapterFile = path.join(root, relativeFile);
    if (!fs.existsSync(chapterFile)) {
      return;
    }

    const raw = fs.readFileSync(chapterFile, 'utf8');
    const title = deriveTitle(raw, entry.title || entry.id);
    const chapterId = chapterIdFromSlug(entry.id);

    const normalized = {
      schemaVersion: 1,
      blocks: [
        {
          id: 'blk_title',
          type: 'heading',
          level: 2,
          spans: [{ id: 'spn_title_0', text: title }],
          sourceHint: 'html-fragment',
        },
        ...blocksFromHtml(raw),
      ],
    };

    const compiled = compileHtml(chapterId, normalized);
    const now = nowIso();

    const chapter = {
      id: chapterId,
      slug: entry.id,
      title,
      orderIndex: typeof entry.number === 'number' ? entry.number : chapterIndex + 1,
      status: 'published',
      type: 'standard',
      visibility: { mode: 'public', includeInToc: true },
      theme: {},
      sourceImport: {
        sourceType: 'html-fragment',
        sourceFile: entry.file,
        importedAt: now,
        warnings: [],
      },
      normalizedDocument: normalized,
      compiledOutput: compiled,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    chapters.push(chapter);
    versions.push({
      id: `${chapterId}_v1`,
      chapterId,
      status: 'published',
      normalizedSnapshot: normalized,
      compiledSnapshot: compiled,
      publishedAt: now,
      rollbackEligible: true,
      createdAt: now,
    });
  });

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ chapters, versions }, null, 2), 'utf8');
  console.log(`Backfilled ${chapters.length} chapters into ${outPath}`);
}

run();

