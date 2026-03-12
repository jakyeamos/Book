const fs = require("fs");
const path = require("path");

const CHAPTERS_DIR = "chapters";
const MANIFEST_PATH = path.join(CHAPTERS_DIR, "index.json");

const MIN_WORD_COUNT_BY_SLUG = {
  ch03: 900,
  ch04: 900,
  ch05: 900,
  ch06: 900
};

const PLACEHOLDER_PATTERN = /\b(TODO|TBD|coming soon|placeholder|lorem ipsum|stub chapter|stub)\b/i;

function exit(code) {
  process.exit(code);
}

function log(msg) {
  console.log(msg);
}

function readFile(filepath) {
  if (!fs.existsSync(filepath)) {
    return null;
  }
  return fs.readFileSync(filepath, "utf-8");
}

function normalizeSlug(input) {
  if (!input) {
    return input;
  }

  const value = String(input).trim();

  const chapterMatch = value.match(/^chapter(\d+)$/i);
  if (chapterMatch) {
    return `ch${chapterMatch[1].padStart(2, "0")}`;
  }

  const chMatch = value.match(/^ch(\d+)$/i);
  if (chMatch) {
    return `ch${chMatch[1].padStart(2, "0")}`;
  }

  return value;
}

function chapterIdFromSlug(slug) {
  const match = String(slug).match(/^ch(\d+)$/i);
  if (!match) {
    return null;
  }
  return `chapter${Number.parseInt(match[1], 10)}`;
}

function resolveManifestFile(fileEntry) {
  if (!fileEntry) {
    return null;
  }

  const cleaned = fileEntry.replace(/^\.\//, "").replace(/^chapters\//, "");
  return path.join(CHAPTERS_DIR, cleaned);
}

function chapterWordCount(content) {
  const withoutTags = content
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&[a-zA-Z0-9#]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!withoutTags) {
    return 0;
  }

  return (withoutTags.match(/\b[\w'’-]+\b/g) || []).length;
}

function checkChapter(identifier) {
  const slug = normalizeSlug(identifier);
  const filepath = path.join(CHAPTERS_DIR, `${slug}.html`);
  const content = readFile(filepath);

  if (!content) {
    log(`[FAIL] ${identifier}: file not found (${slug}.html)`);
    return false;
  }

  const chapterId = chapterIdFromSlug(slug);
  if (chapterId && !content.includes(`<div class="chapter" id="${chapterId}"`)) {
    log(`[FAIL] ${identifier}: missing chapter wrapper for ${chapterId}`);
    return false;
  }

  if (!content.includes('class="chapter-title"')) {
    log(`[FAIL] ${identifier}: missing chapter-title element`);
    return false;
  }

  if (/id="section\d+"/.test(content)) {
    log(`[FAIL] ${identifier}: bare section ID detected (use chN-s format)`);
    return false;
  }

  const minWords = MIN_WORD_COUNT_BY_SLUG[slug];
  if (Number.isFinite(minWords)) {
    const words = chapterWordCount(content);

    if (words < minWords) {
      log(`[FAIL] ${identifier}: below minimum prose threshold (${words} < ${minWords})`);
      return false;
    }

    if (PLACEHOLDER_PATTERN.test(content)) {
      log(`[FAIL] ${identifier}: placeholder marker detected in chapter content`);
      return false;
    }

    log(`[PASS] ${identifier}: ${words} words`);
    return true;
  }

  log(`[PASS] ${identifier}`);
  return true;
}

function checkManifest(options = { failOnMissing: true }) {
  const content = readFile(MANIFEST_PATH);

  if (!content) {
    if (options.failOnMissing) {
      log("[FAIL] manifest: chapters/index.json is missing");
      return false;
    }
    log("[SKIP] manifest not yet created");
    return true;
  }

  let manifest;
  try {
    manifest = JSON.parse(content);
  } catch (error) {
    log(`[FAIL] manifest: invalid JSON - ${error.message}`);
    return false;
  }

  if (!Array.isArray(manifest)) {
    log("[FAIL] manifest: must be an array");
    return false;
  }

  let allPass = true;

  manifest.forEach((entry) => {
    const validFields =
      entry &&
      typeof entry.id === "string" &&
      typeof entry.file === "string" &&
      typeof entry.title === "string" &&
      Number.isInteger(entry.number);

    if (!validFields) {
      log("[FAIL] manifest entry: missing required fields (id, file, title, number)");
      allPass = false;
      return;
    }

    const filePath = resolveManifestFile(entry.file);
    if (!filePath || !fs.existsSync(filePath)) {
      log(`[FAIL] manifest entry ${entry.id}: file not found - ${entry.file}`);
      allPass = false;
      return;
    }

    log(`[PASS] manifest entry ${entry.id}`);
  });

  return allPass;
}

function lintFormatting() {
  if (!fs.existsSync(CHAPTERS_DIR)) {
    return true;
  }

  let hasFailures = false;

  fs.readdirSync(CHAPTERS_DIR).forEach((file) => {
    if (!file.endsWith(".html") || file === "index.html") {
      return;
    }

    const filepath = path.join(CHAPTERS_DIR, file);
    const content = fs.readFileSync(filepath, "utf-8");
    const chapterStart = content.indexOf('<div class="chapter"');
    const chapterEnd = content.lastIndexOf("</div>");

    if (chapterStart === -1 || chapterEnd === -1 || chapterEnd <= chapterStart) {
      return;
    }

    const chapterContent = content.slice(chapterStart, chapterEnd + 6);
    const styleRegex = /style="/g;
    let match;

    while ((match = styleRegex.exec(chapterContent)) !== null) {
      const lineNum = content.slice(0, chapterStart + match.index).split("\n").length;
      log(`[FAIL] ${file}:${lineNum} - inline style found`);
      hasFailures = true;
    }
  });

  if (!hasFailures) {
    log("[PASS] no inline styles found");
  }

  return !hasFailures;
}

function manifestIds() {
  const content = readFile(MANIFEST_PATH);
  if (!content) {
    return [];
  }

  try {
    const manifest = JSON.parse(content);
    if (!Array.isArray(manifest)) {
      return [];
    }
    return manifest.map((entry) => entry.id).filter(Boolean);
  } catch (error) {
    return [];
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage:");
    console.log("  node validate-chapters.cjs --check <slug-or-id> [slug-or-id...]");
    console.log("  node validate-chapters.cjs --manifest");
    console.log("  node validate-chapters.cjs --lint-formatting");
    console.log("  node validate-chapters.cjs --full");
    exit(1);
  }

  let exitCode = 0;

  if (args.includes("--full")) {
    log("Running --full validation...");
    log("");

    const manifestResult = checkManifest({ failOnMissing: false });
    if (!manifestResult) {
      exitCode = 1;
    }

    log("");

    manifestIds().forEach((identifier) => {
      if (!checkChapter(identifier)) {
        exitCode = 1;
      }
    });

    log("");

    if (!lintFormatting()) {
      exitCode = 1;
    }

    log("");
    log(`Validation complete. Exit code: ${exitCode}`);
    exit(exitCode);
  }

  if (args.includes("--manifest")) {
    if (!checkManifest({ failOnMissing: true })) {
      exitCode = 1;
    }
  }

  const checkIndex = args.indexOf("--check");
  if (checkIndex !== -1) {
    const identifiers = args.slice(checkIndex + 1);
    identifiers.forEach((identifier) => {
      if (!checkChapter(identifier)) {
        exitCode = 1;
      }
    });
  }

  if (args.includes("--lint-formatting")) {
    if (!lintFormatting()) {
      exitCode = 1;
    }
  }

  exit(exitCode);
}

main();
