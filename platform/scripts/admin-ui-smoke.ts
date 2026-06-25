import * as fs from "node:fs";
import * as path from "node:path";

const rootDir = process.cwd();

function read(relativePath: string): string {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assertIncludes(haystack: string, needle: string, label: string): void {
  if (!haystack.includes(needle)) {
    throw new Error(`${label} missing: ${needle}`);
  }
}

function htmlIds(html: string): Set<string> {
  const ids = new Set<string>();
  const pattern = /\sid="([^"]+)"/g;
  for (const match of html.matchAll(pattern)) {
    ids.add(match[1]);
  }
  return ids;
}

function referencedElementIds(script: string): Set<string> {
  const ids = new Set<string>();
  const pattern = /document\.getElementById\("([^"]+)"\)/g;
  for (const match of script.matchAll(pattern)) {
    ids.add(match[1]);
  }
  return ids;
}

function run(): void {
  const html = read("admin/index.html");
  const adminScript = read("admin/admin.js");
  const audioScript = read("admin/studio-audio.js");
  const importScript = read("admin/studio-imports.js");
  const css = read("admin/admin.css");

  assertIncludes(html, '<script type="module" src="/admin/admin.js"></script>', "Author Studio module entry");
  assertIncludes(adminScript, 'from "./studio-audio.js"', "Audio studio module import");
  assertIncludes(adminScript, 'from "./studio-imports.js"', "Import queue module import");
  assertIncludes(audioScript, "repair", "Audio repair UI wiring");
  assertIncludes(importScript, "/api/admin/import/docx", "Import DOCX UI wiring");

  const ids = htmlIds(html);
  const referencedIds = referencedElementIds(adminScript);
  const missingIds = [...referencedIds].filter((id) => !ids.has(id));
  if (missingIds.length > 0) {
    throw new Error(`Admin script references missing HTML ids: ${missingIds.join(", ")}`);
  }

  for (const flow of [
    "login",
    "chapter-list",
    "import-docx",
    "block-editor",
    "reader-preview",
    "version-rollback",
    "audio-cues",
    "publish-readiness",
    "operations-status",
  ]) {
    assertIncludes(html, `data-studio-flow="${flow}"`, "Browser automation flow hook");
  }

  for (const className of [
    ".block-card",
    ".chapter-preview",
    ".readiness-item.blocking",
    ".cue-card.broken",
  ]) {
    assertIncludes(css, className, "Author Studio CSS contract");
  }

  console.log("platform admin UI smoke test: ok");
}

run();
