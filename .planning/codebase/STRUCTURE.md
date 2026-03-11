# Codebase Structure

**Analysis Date:** 2026-03-11

## Directory Layout

```
Book/                          # Project root — served as GitHub Pages site
├── index.html                 # Single HTML shell (the entire app entry point)
├── script.js                  # All application logic (ES module, ~1230 lines)
├── styles.css                 # All styles — layout, animations, theming (~9KB)
├── package.json               # Node metadata; only runtime dep is mammoth (tooling only)
├── package-lock.json          # Lockfile
├── .gitignore                 # Ignores node_modules/ and .planning/
├── Eva_Angelina.mp3           # Primary music track (root-level asset)
├── Mojo_Pin.mp3               # Primary music track (root-level asset)
├── Rose_Parade.mp3            # Primary music track (root-level asset)
├── chapters/                  # All chapter content and configuration
│   ├── index.json             # Chapter manifest (ordered array — source of truth for nav)
│   ├── config.js              # Chapter configuration (themes, audio, particles, parallax)
│   ├── ch01.html              # Chapter 1 HTML fragment
│   ├── ch02.html              # Chapter 2 HTML fragment
│   ├── ch03.html              # Chapter 3 HTML fragment (stub — minimal content)
│   ├── ch04.html              # Chapter 4 HTML fragment (stub)
│   ├── ch05.html              # Chapter 5 HTML fragment (stub)
│   ├── ch06.html              # Chapter 6 HTML fragment (stub)
│   ├── ch07.html              # Chapter 7 HTML fragment
│   ├── ch08.html              # Chapter 8 HTML fragment
│   ├── ch09.html              # Chapter 9 HTML fragment
│   ├── ch10.html              # Chapter 10 HTML fragment
│   ├── ch15.html              # Chapter 15 HTML fragment
│   ├── DISCREPANCY.md         # Notes on chapter content discrepancies
│   └── raw/                   # Raw HTML output from DOCX conversion (not served directly)
│       ├── ch01-raw.html
│       ├── ch02-raw.html
│       ├── ch03-07-raw.html
│       ├── ch08-raw.html
│       ├── ch09-10-raw.html
│       └── ch15-raw.html
├── tools/                     # Offline developer tooling (Node.js scripts, not served)
│   ├── convert-chapters.cjs   # Converts source .docx files to raw HTML via mammoth
│   └── validate-chapters.cjs  # Validates chapter HTML structure
├── .planning/                 # GSD planning docs (gitignored — never deployed)
│   ├── PROJECT.md
│   ├── REQUIREMENTS.md
│   ├── ROADMAP.md
│   ├── STATE.md
│   ├── config.json
│   ├── codebase/              # Codebase map docs (this directory)
│   ├── phases/                # Per-phase implementation plans
│   └── research/
└── .github/
    └── workflows/
        └── jekyll-gh-pages.yml  # GitHub Pages deployment workflow
```

Note: `assets/` directory is referenced in config (e.g., `assets/ch1/fog.png`, `assets/ambient/wind_loop.mp3`) but does not yet exist in the repository. These are planned assets.

## Directory Purposes

**`chapters/` (served):**
- Purpose: All chapter data consumed at runtime
- Contains: Chapter HTML fragments, the manifest JSON, and the config module
- Key files: `chapters/index.json` (navigation manifest), `chapters/config.js` (all per-chapter data)

**`chapters/raw/` (not directly served):**
- Purpose: Intermediate output from `tools/convert-chapters.cjs`; raw HTML from DOCX before manual cleanup and semantic markup is applied
- Contains: Bulk-converted HTML, one file per source DOCX (some span multiple chapters)
- Generated: Yes, by `tools/convert-chapters.cjs`
- Committed: Yes (serves as reference during content migration)

**`tools/` (not served):**
- Purpose: Developer utilities for content migration pipeline
- Contains: Node.js CommonJS scripts
- Key files: `tools/convert-chapters.cjs` (DOCX→HTML conversion), `tools/validate-chapters.cjs` (HTML structure validation)

**`.planning/` (gitignored):**
- Purpose: All GSD planning artifacts
- Generated: No (human + AI authored)
- Committed: No (in `.gitignore`)

## Key File Locations

**Entry Points:**
- `index.html`: Browser entry point — the only HTML file served; loads everything else
- `script.js`: Application logic entry point — `DOMContentLoaded` at line 274 is where boot starts

**Configuration:**
- `chapters/config.js`: Per-chapter config — edit this to change any chapter's theme, audio, particles, or parallax layers
- `chapters/index.json`: Navigation manifest — edit this to add, remove, or reorder chapters shown in the UI

**Core Logic:**
- `script.js`: All runtime logic — `AudioController` (line 24), `ParticleController` (line 217), chapter lifecycle functions (`showChapter`, `setupChapterExperience`, `loadManifestAndBoot`)

**Styles:**
- `styles.css`: All CSS — theming custom properties, dark mode, animation classes, layout

**Chapter Content:**
- `chapters/ch01.html` — `chapters/ch15.html`: Individual chapter HTML fragments injected at runtime

**Tooling:**
- `tools/convert-chapters.cjs`: Run with `node tools/convert-chapters.cjs` to convert .docx source files
- `tools/validate-chapters.cjs`: Run with `node tools/validate-chapters.cjs` to check chapter HTML

## Naming Conventions

**Files:**
- Chapter HTML fragments: `ch{NN}.html` — zero-padded two-digit chapter number (e.g., `ch01.html`, `ch15.html`)
- Raw conversion output: `ch{NN}-raw.html` or `ch{NN}-{MM}-raw.html` for multi-chapter source files
- Tools: kebab-case `.cjs` extension (CommonJS, not ES module)
- Config: `config.js` (ES module with named + default exports)

**Chapter IDs:**
- Format: `chapter{N}` — no zero-padding, no hyphens (e.g., `chapter1`, `chapter15`)
- Used as: Object keys in `CHAPTERS` (config.js), `data-chapter` attribute on `.book-container`, values in `chapters/index.json`

**CSS Classes (chapter content):**
- `.chapter` — root wrapper of each injected chapter fragment
- `.book-section` — semantic section within a chapter; animation hooks target `.book-section > p`
- `.chapter-title` — the chapter heading; receives entrance animation
- `.poetic-text` — poetry/lyrical blocks; receives typewriter reveal animation
- `.bold-grow-1` / `.bold-grow-2` / `.bold-grow-3` / `.bold-grow-4` — inline spans for scroll-triggered scale emphasis (scale set by CSS custom properties `--bold-grow-{N}-scale`)
- `.staggered-indent` — indented list-style block
- `.centered-text` — centered paragraph variant
- `.date-location` — italicized scene-setting metadata at top of section
- `.pov-marker` — point-of-view character label

**CSS Custom Properties (theme, set dynamically by `script.js`):**
- `--chapter-accent-color` — per-chapter accent color applied to UI controls and highlights
- `--chapter-background-tint` — overlay tint color
- `--chapter-background-image` — gradient background
- `--chapter-transition-duration` — chapter fade transition duration in seconds

## Where to Add New Code

**New chapter content:**
1. Write the chapter HTML fragment using the established class structure; save as `chapters/ch{NN}.html`
2. Add an entry to `chapters/index.json` with `{ id, file, title, number }` in the desired navigation order
3. Add a `chapter{N}` key to `CHAPTERS` in `chapters/config.js` with `metadata`, `theme`, `audio`, and `particles`
4. Add a matching entry to `LAYER_LIBRARY` in `chapters/config.js` if parallax layers are needed

**New particle preset:**
- Add to `PARTICLE_PRESETS` object in `chapters/config.js`; reference by name in any chapter's `particles.type` field

**New visual effect (scroll-triggered):**
- Add setup function following the pattern of `setupParagraphAnimations` / `setupPoetryTypewriter` in `script.js`
- Register all ScrollTriggers and event listeners via `registerCleanup(fn)` so they are torn down on chapter transition
- Call the new function from `setupChapterExperience`

**New UI control:**
- Add the button/element to `index.html`
- Reference it in the `elements` object (line 296 in `script.js`)
- Attach event listener in the event wiring section (lines 1181–1216 in `script.js`)

**New ambient audio track:**
- Place the file at `assets/ambient/{name}.mp3`
- Reference the path in the relevant chapter's `audio.ambientTrack` or `lineCues[*].ambientTrack` in `chapters/config.js`

**Developer tooling:**
- Add new scripts to `tools/` as `.cjs` files (CommonJS); they are never bundled or served

## Special Directories

**`chapters/raw/`:**
- Purpose: Stores raw mammoth-converted HTML from source .docx files before editorial cleanup
- Generated: Yes (by `tools/convert-chapters.cjs`)
- Committed: Yes

**`.planning/`:**
- Purpose: GSD planning artifacts (requirements, roadmap, phase plans, codebase maps)
- Generated: No
- Committed: No (listed in `.gitignore`)

**`node_modules/`:**
- Purpose: npm dependencies (only `mammoth` — used by tooling only, not the served app)
- Generated: Yes
- Committed: No (listed in `.gitignore`)

---

*Structure analysis: 2026-03-11*
