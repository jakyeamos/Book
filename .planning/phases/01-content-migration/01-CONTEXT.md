# Phase 1: Content Migration - Context

**Gathered:** 2026-03-10
**Status:** Ready for planning

<domain>
## Phase Boundary

All drafted chapters (1–15, with gaps for 11–14) migrated from docx/md source files into HTML; chapter navigation updated to reflect all added chapters. Creating cinematic effects, audio mapping, or config systems are separate phases.

</domain>

<decisions>
## Implementation Decisions

### HTML Architecture
- Hybrid approach: `index.html` becomes the app shell (nav controls + empty container div only)
- All chapter content moves to a `chapters/` folder as HTML fragments
- Chapter files named `chapters/ch01.html`, `ch02.html`, etc. (zero-padded)
- Each chapter file is a standalone HTML fragment — just the `<div class="chapter">` with its sections and content
- The shell (`index.html`) fetches and injects chapter content dynamically
- Chapters 1 & 2 content moves OUT of `index.html` into `chapters/ch01.html`, `chapters/ch02.html`

### Source Files
- Docx source files are at: `C:\Users\gspea\Downloads\chapters-20260310T173927Z-1-001\chapters`
- Agent reads docx files directly using mammoth (Node.js docx parser, no manual conversion)

### Chapters 1 & 2 Status
- Current HTML versions are uncertain — compare against docx before deciding
- Docx is the ground truth for content, but if conflicts are found: **flag and don't auto-resolve** — document discrepancies for user review rather than picking a winner
- If Ch 2 appears truncated vs. the docx, add the missing content (flagging the join point)

### Formatting Conversion
- Uncertain passages: apply best-judgment class, add `<!-- TODO: verify formatting -->` comment
- `.bold-grow-*` pattern: infer from escalating emphasis in docx (series of bold words building intensity → `.bold-grow-1` through `.bold-grow-N`), annotate with comment
- Character voice classes (like `.harley`): create new CSS classes as needed for distinct inner voices or characters encountered in new chapters; document each new class created
- Existing classes to preserve: `.poetic-text`, `.bold-grow-*`, `.centered-text`, `.right-aligned`, `.staggered-indent`, `.date-location`, `.chapter-title`

### Claude's Discretion
- Section ID numbering within chapter files (e.g., per-chapter reset vs. global — not user-facing)
- Internal HTML structure of chapter fragments (how many `<section>` divs per chapter)
- Whether to add a `chapters/index.json` or similar manifest for the nav system to auto-discover chapters

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `index.html`: Nav controls, audio element, Giscus block, and `.chapter-footer` all stay in place — only the chapter content divs move out
- `script.js`: Chapter navigation populates the dropdown from `.chapter-title` elements found in the DOM — this logic will need updating to work with dynamically fetched fragments
- `styles.css`: All chapter formatting classes already defined (`.poetic-text`, `.bold-grow-1` through `.bold-grow-4`, `.harley`, `.centered-text`, `.right-aligned`, etc.)

### Established Patterns
- Chapters in HTML: `<div class="chapter" id="chapterN">` containing `<section id="sectionN" class="book-section">` blocks
- Navigation: script auto-populates dropdown from `.chapter-title` elements — chapter titles are the source of truth for the nav
- Audio sections: currently `section1`, `section2`, `section3` globally mapped in `sectionToSongMap` — new chapter sections will need IDs that don't conflict (Phase 2 concern, but naming must accommodate it)
- Debug log: `<div id="debug-log"></div>` exists at bottom of `index.html` — stays in shell, removal is Phase 2

### Integration Points
- The `showChapter()` function in `script.js` currently shows/hides pre-rendered `.chapter` divs — needs updating to fetch from `chapters/chNN.html` and inject into a container
- Chapter selector dropdown value = chapter div ID — this contract must be preserved or updated consistently
- `localStorage` saves `selectedChapter` by ID — needs to stay working after migration

</code_context>

<specifics>
## Specific Ideas

- Source path confirmed: `C:\Users\gspea\Downloads\chapters-20260310T173927Z-1-001\chapters`
- "Flag conflicts, don't auto-resolve" — for Ch 1 & 2 discrepancies, produce a comparison report for user review before touching the HTML
- "Best judgment + annotate" — uncertain formatting gets a `<!-- TODO: verify formatting -->` comment so the author can do a final pass

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 01-content-migration*
*Context gathered: 2026-03-10*
