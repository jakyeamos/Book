import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { z } from "zod";

import { exportLegacyChapter } from "@/migrations/legacy-chapters";

const indexSchema = z.array(z.object({ id: z.string(), file: z.string(), title: z.string(), number: z.number().int() }));
const lineCueSchema = z.object({ id: z.string(), startLine: z.number().int(), endLine: z.number().int().nullable().optional(), mainTrack: z.string().nullable().optional(), ambientTrack: z.string().nullable().optional(), fadeInLines: z.number().int().optional(), fadeOutLines: z.number().int().optional(), crossfadeSeconds: z.number().optional() });

const root = process.cwd();
const outputPath = process.argv[2] ?? ".planning/v2-import/chapters.json";
const index = indexSchema.parse(JSON.parse(await readFile(path.join(root, "chapters/index.json"), "utf8")));
const config = await import(path.join(root, "chapters/config.js")) as { CHAPTERS: Record<string, { audio?: { lineCues?: unknown[] } }> };
const chapters = [];

for (const entry of index) {
  const html = await readFile(path.join(root, "chapters", entry.file), "utf8");
  const chapterConfig = config.CHAPTERS[entry.id];
  const lineCues = (chapterConfig?.audio?.lineCues ?? []).map((cue) => lineCueSchema.parse(cue));
  chapters.push(exportLegacyChapter({ chapterId: entry.id, title: entry.title, html, lineCues }));
}

const absoluteOutput = path.resolve(root, outputPath);
await mkdir(path.dirname(absoluteOutput), { recursive: true });
await writeFile(absoluteOutput, `${JSON.stringify({ chapters }, null, 2)}\n`, "utf8");
console.log(`Exported ${chapters.length} chapters to ${absoluteOutput}`);
