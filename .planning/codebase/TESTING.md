# Testing Patterns

**Analysis Date:** 2026-03-11

## Test Framework

**Runner:**
- None. No test framework is installed or configured.
- `package.json` `"test"` script: `echo "Error: no test specified" && exit 1`
- No `jest.config.*`, `vitest.config.*`, `mocha.opts`, or equivalent found.

**Assertion Library:**
- None.

**Run Commands:**
```bash
# No test runner exists. The only test-adjacent commands are:
node tools/validate-chapters.cjs --full              # Full structural validation
node tools/validate-chapters.cjs --manifest          # Manifest JSON validation only
node tools/validate-chapters.cjs --check ch01        # Single chapter structural check
node tools/validate-chapters.cjs --lint-formatting   # Inline style lint on all chapters
```

## Test File Organization

**Location:**
- No `*.test.*` or `*.spec.*` files exist anywhere in the project.
- Validation tooling lives in `tools/` at project root.

**Naming:**
- Not applicable — no test files.

**Structure:**
```
tools/
  validate-chapters.cjs     # Structural validation + formatting lint
  convert-chapters.cjs      # One-time DOCX conversion utility (not a test)
```

## What Exists Instead of Tests

The project uses a **manual validation script** (`tools/validate-chapters.cjs`) as its sole quality gate. It is a Node.js CJS script with no testing library dependency.

**Checks performed by `validate-chapters.cjs`:**

1. **Manifest validation** (`--manifest` / `--full`):
   - `chapters/index.json` exists and is valid JSON
   - Manifest is an array
   - Each entry has required fields: `id` (string), `file` (string), `title` (string), `number` (integer)
   - Each `file` referenced in the manifest actually exists on disk

2. **Chapter structural checks** (`--check <slug>` / `--full`):
   - File exists at `chapters/{slug}.html`
   - Contains `<div class="chapter" id="{chapterId}">` wrapper element
   - Contains an element with `class="chapter-title"`
   - Does NOT contain bare section IDs like `id="section1"` (must use `chN-s` format)

3. **Formatting lint** (`--lint-formatting` / `--full`):
   - Scans all `chapters/*.html` files (excluding `index.html`)
   - Flags any `style="..."` inline style attribute found inside chapter content
   - Reports file and line number for each violation

**Output format (pass/fail to stdout):**
```
[PASS] ch01
[FAIL] ch02: missing chapter-title element
[PASS] manifest entry chapter1
[FAIL] ch03.html:47 - inline style found
```

## Validation Script Internals

**`tools/validate-chapters.cjs` — key functions:**

- `checkChapter(identifier)` — normalizes slug, reads file, runs DOM structure assertions
- `checkManifest(options)` — parses `chapters/index.json`, validates shape and file existence
- `lintFormatting()` — regex-scans chapter HTML for `style="` occurrences
- `normalizeSlug(input)` — converts `chapter1` or `ch1` → `ch01` (zero-padded)
- `chapterIdFromSlug(slug)` — converts `ch01` → `chapter1` (for wrapper ID matching)
- `resolveManifestFile(fileEntry)` — normalizes manifest `file` paths (strips `./` and `chapters/` prefixes)

**Entry modes via CLI args:**
```bash
--full              # Run all checks in sequence: manifest + all chapters + lint
--manifest          # Manifest only
--check <slug...>   # One or more chapter slugs
--lint-formatting   # Inline style scan only
```

## Mocking

**Framework:** None.

**Patterns:** Not applicable — no unit tests exist.

## Fixtures and Factories

**Test Data:** Not applicable.

**Chapter HTML files** (`chapters/ch01.html` through `chapters/ch15.html`) serve as the primary content under validation, but are not test fixtures — they are production content files.

**Raw conversion output** (`chapters/raw/ch*-raw.html`) are intermediate DOCX-to-HTML conversion artifacts used as source material, not for testing.

## Coverage

**Requirements:** None enforced.

**View Coverage:**
- Not applicable — no test runner.

## Test Types

**Unit Tests:** None.

**Integration Tests:** None.

**E2E Tests:** None.

**Manual Browser Testing:** The primary validation method for runtime behavior. The `isDev` flag in `script.js` enables `Logger.debug` and `Logger.info` output when running on `localhost` or with `?debug` in the URL query string, providing a manual debug mode:
```javascript
const isDev =
  window.location.hostname.includes("localhost") ||
  window.location.hostname === "127.0.0.1" ||
  new URLSearchParams(window.location.search).has("debug");
```

## Common Patterns

**Async Testing:** Not applicable.

**Error Testing:** Not applicable.

## Implications for Future Test Work

This project has zero automated test coverage of runtime JavaScript behavior. If tests are added, the following are the highest-value targets given current code:

- `chapters/config.js` pure functions: `getChapterTheme`, `getAudioCues`, `normalizeCue`, `getParticlePreset` — all are pure or near-pure and can be unit tested with Node.js directly
- `clamp01(value)` — pure utility, trivially testable
- `resolveCueForLine(cues, lineNumber)` and `calculateCueVolume(cue, lineNumber, type)` in `script.js` — pure calculation functions with clear input/output contracts
- Manifest structure validation logic already exists in `validate-chapters.cjs` and could be ported to a proper test suite

**Recommended framework if tests are introduced:** Vitest (works without a build step config for pure-function modules; compatible with ES module syntax used in `script.js` and `chapters/config.js`).

---

*Testing analysis: 2026-03-11*
