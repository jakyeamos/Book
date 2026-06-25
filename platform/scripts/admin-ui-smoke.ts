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
  assertIncludes(adminScript, 'from "./studio-blocks.js"', "Block editor module import");
  assertIncludes(adminScript, 'from "./studio-imports.js"', "Import queue module import");
  assertIncludes(adminScript, 'from "./studio-publish.js"', "Publish safety module import");
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

  assertIncludes(html, 'id="chapter-validation-list"', "Inline chapter validation surface");
  assertIncludes(html, 'id="save-status"', "Explicit save status surface");
  assertIncludes(html, 'id="chapter-theme-accent-input"', "Theme accent preview control");
  assertIncludes(html, 'id="chapter-theme-background-input"', "Theme background preview control");
  assertIncludes(html, 'id="preview-mode-input"', "Draft/published preview mode control");
  assertIncludes(html, 'id="preview-runtime"', "Preview runtime summary");
  assertIncludes(html, 'id="publish-dialog"', "Publish confirmation dialog");
  assertIncludes(html, 'id="publish-summary-list"', "Publish summary list");
  assertIncludes(html, 'id="publish-visibility-input"', "Publish visibility override");
  assertIncludes(read("admin/studio-publish.js"), "Confirm Publish", "Publish confirmation copy");
  assertIncludes(adminScript, "publishReadinessList:", "Distinct publish readiness binding");
  assertIncludes(adminScript, "deployReadinessList:", "Distinct deploy readiness binding");
  assertIncludes(read("admin/studio-blocks.js"), "Move up", "Block move control");
  assertIncludes(read("admin/studio-blocks.js"), "Duplicate", "Block duplicate control");
  assertIncludes(read("admin/studio-blocks.js"), "Move down", "Block move control");
  assertIncludes(read("admin/studio-blocks.js"), "Published preview unavailable", "Published preview fallback");
  assertIncludes(importScript, "No imports staged", "Import queue empty state");
  assertIncludes(audioScript, "No cues for this chapter", "Audio cue empty state");

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
