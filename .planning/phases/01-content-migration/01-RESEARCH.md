# Phase 1: Content Migration - Research

**Researched:** 2026-03-10
**Domain:** Docx-to-HTML conversion, dynamic chapter loading, content fragment architecture
**Confidence:** HIGH — all findings verified against live source files and existing codebase

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **HTML Architecture:** Hybrid shell approach — `index.html` becomes app shell (nav controls + empty container div); all chapter content moves to `chapters/` folder as HTML fragments; chapter files named `chapters/ch01.html`, `ch02.html`, etc. (zero-padded); each chapter file is a standalone HTML fragment (just `<div class="chapter">` with sections); shell fetches and injects dynamically.
- **Chapters 1 & 2** currently in `index.html` move OUT to `chapters/ch01.html` and `chapters/ch02.html`.
- **Source files** at: `C:\Users\gspea\Downloads\chapters-20260310T173927Z-1-001\chapters\`
- **Agent reads docx files directly using mammoth** (Node.js docx parser, no manual conversion).
- **Chapters 1 & 2 discrepancies:** Flag conflicts, do NOT auto-resolve — document discrepancies for user review.
- **Uncertain formatting passages:** Apply best-judgment class + add `<!-- TODO: verify formatting -->` comment.
- **`.bold-grow-*` pattern:** Infer from escalating emphasis in docx; annotate with comment.
- **New character voice classes:** Create new CSS classes as needed; document each new class created.
- **Existing classes to preserve:** `.poetic-text`, `.bold-grow-*`, `.centered-text`, `.right-aligned`, `.staggered-indent`, `.date-location`, `.chapter-title`

### Claude's Discretion
- Section ID numbering within chapter files (per-chapter reset vs. global)
- Internal HTML structure of chapter fragments (how many `<section>` divs per chapter)
- Whether to add a `chapters/index.json` or similar manifest for the nav system to auto-discover chapters

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CONT-01 | All HTML chapter content compared against docx source files; discrepancies documented | Comparison methodology defined; Ch1 and Ch2 word counts reveal immediate discrepancies (see Pitfalls section) |
| CONT-02 | Chapter 1 (The Ritual — Xander) replaced in HTML with updated docx version (~1,800 words vs ~300 words) | Docx confirmed: 1,761 HTML-token words from `The ritual + the rehersal(1D).docx`; current HTML has ~3,189 words — major content divergence documented |
| CONT-03 | Chapter 2 (The Routine — Nico) replaced in HTML with updated docx version (~2,700 words) | Docx confirmed: 2,650 HTML-token words from `The routine(2D).docx`; current HTML has ~1,977 words — docx is longer |
| CONT-04 | Chapters 3–7 (Nico's backstory flashbacks) added from `nico backstory(3-7D).docx` | Confirmed: 9,594 words; four named chapter titles found (Left Alone, A Library for One, The Girl with the Hammer, Hope, All Good Things) — maps to 5 chapters |
| CONT-05 | Chapter 7 (Static Between Stations) and Chapter 8 (Golden) added from `static between stations (8D).docx` | REQUIREMENT LABEL CONFLICT: TOC shows Static=ch8, Golden=ch9; file `static between stations (8D).docx` contains only Static (~3,518 words); `Gianna_s POV(9-10W).docx` self-labels as "Chapter 9: Golden" — see Open Questions |
| CONT-06 | Chapters 9–10 (Gianna's Week / Gianna's POV) added from `Gianna_s POV(9-10W).docx` | Confirmed: 3,576 words; file labels itself "Chapter 9"; weekly day structure (Monday–Sunday) visible; CONT-05/CONT-06 labeling may be off-by-one — see Open Questions |
| CONT-07 | Chapter 15 (Blackberries — Xander) added from `Blackberries (15D).docx` | Confirmed: 567 words; also contains two short poems (`Behind a Closed Door`, `A Face is One-Thousand Things`) as `<h3>` sections within the file |
| CONT-08 | All chapter formatting conventions preserved (`.poetic-text`, `.bold-grow-*`, `.centered-text`, `.right-aligned`, date/location headers, chapter titles) | All target classes confirmed in `styles.css`; formatting signals in docx identified; mapping rules defined in Architecture Patterns section |
| CONT-09 | Chapter navigation dropdown updated to include all added chapters with correct titles | `showChapter()` and dropdown population logic documented; `fetch()`-based rewrite pattern defined; `chapters/index.json` manifest approach identified as recommended solution |
</phase_requirements>

---

## Summary

Phase 1 is a content migration and architecture refactor. The primary work is twofold: (1) convert all source docx files to HTML fragments and place them in a new `chapters/` directory, and (2) rewrite `script.js`'s `showChapter()` function and chapter discovery logic to use dynamic `fetch()` loading instead of operating on pre-rendered DOM elements.

The existing codebase is small and coherent (426-line HTML, 466-line JS, 352-line CSS — all vanilla, no build step). The CSS already defines every formatting class needed. Mammoth 1.11.0 is confirmed available globally (`npm install -g mammoth`) and produces clean HTML from all source docx files with zero warnings.

The most important findings are two content discrepancies that must be documented before writing any HTML: (1) Chapter 1 in `index.html` is significantly richer (~3,189 words) than the docx (~1,761 words) — the HTML version contains the elaborate `.bold-grow-*` SAME/SAME/SAME sequence and Sisyphus book/hairpin scene that do not exist in the docx; (2) Chapter 2 in `index.html` includes Harley as a named character with `.harley` CSS styling, but the docx renders Harley's voice as anonymous italicized commands ("You're already clean", "Stop"). These divergences require a comparison report before any replacement happens.

**Primary recommendation:** Produce a DISCREPANCY.md comparison report for Ch1 and Ch2 before touching either chapter's HTML. Then convert all new chapters (3–15) from docx to fragments. Last, refactor `showChapter()` to use `fetch()` and update the nav manifest.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| mammoth | 1.11.0 | Convert .docx to HTML | Zero-config, zero warnings on all 5 source files; confirmed installed globally via npm |
| Node.js built-ins (fs, path) | v25.8.0 (project) | Read docx files, write HTML fragments | No additional dependencies needed for conversion script |
| Vanilla JS Fetch API | Browser native | Dynamic chapter loading in shell | Already the project's constraint (no frameworks, no build step) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| JSON manifest (`chapters/index.json`) | n/a | Source of truth for chapter list, titles, and file paths | Enables nav auto-discovery without scanning DOM; Claude's discretion per CONTEXT.md |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| mammoth (Node script) | Manual copy-paste from Word | Manual is error-prone at scale (9,594-word backstory file alone); mammoth preferred |
| `fetch()` per chapter | Preloading all fragments at page load | Preloading adds unnecessary payload for 10+ chapters; fetch-on-demand is correct |
| `chapters/index.json` manifest | Hardcoded chapter list in `script.js` | Hardcoded makes adding future chapters require JS edits; manifest preferred |

**Installation (mammoth already installed globally):**
```bash
# Already installed - verify with:
npm list -g mammoth
# Expected: mammoth@1.11.0

# If missing:
npm install -g mammoth
```

---

## Architecture Patterns

### Recommended Project Structure
```
Book/
├── index.html          # App shell: nav controls + empty #chapter-container div
├── script.js           # Updated: fetch-based showChapter(), manifest-driven nav
├── styles.css          # Unchanged
├── chapters/
│   ├── index.json      # Chapter manifest: [{id, file, title, number}]
│   ├── ch01.html       # Fragment: <div class="chapter" id="chapter1">...</div>
│   ├── ch02.html
│   ├── ch03.html
│   ├── ch04.html
│   ├── ch05.html
│   ├── ch06.html
│   ├── ch07.html
│   ├── ch08.html
│   ├── ch09.html
│   ├── ch15.html
│   └── DISCREPANCY.md  # Ch1 and Ch2 comparison report (produced before replacement)
├── Eva_Angelina.mp3
├── Mojo_Pin.mp3
└── Rose_Parade.mp3
```

**Note on chapter numbering gap:** Chapters 10–14 do not exist in source files. The manifest simply omits them. The dropdown will show chapters 1–9 and 15 with no dead entries.

### Pattern 1: Chapter Fragment Format

**What:** Each `chapters/chNN.html` file is a self-contained HTML fragment (no `<!DOCTYPE>`, no `<head>`, no `<body>`).
**When to use:** For every chapter file.

```html
<!-- chapters/ch01.html -->
<div class="chapter" id="chapter1">
  <section id="ch1-s1" class="book-section">
    <p class="date-location"><em>Sunday, March 8th, 2036<br>Olympia, Washington</em></p>
    <h2 class="chapter-title"><strong>THE RITUAL.</strong></h2>
    <!-- chapter prose -->
  </section>
  <section id="ch1-s2" class="book-section">
    <!-- continuation -->
  </section>
</div>
```

**Section ID convention (Claude's discretion):** Use per-chapter prefix (`ch1-s1`, `ch1-s2`, etc.) to avoid global ID conflicts. This is critical because `sectionToSongMap` in `script.js` uses section IDs as keys — new chapter sections must not clash with the three existing mapped IDs (`section1`, `section2`, `section3`) until Phase 2 replaces that system.

### Pattern 2: Manifest File

**What:** `chapters/index.json` lists all available chapters. The shell reads this once on load to populate the dropdown.
**When to use:** Enables adding future chapters without touching JS.

```json
[
  { "id": "chapter1",  "file": "chapters/ch01.html", "title": "The Ritual",              "number": 1  },
  { "id": "chapter2",  "file": "chapters/ch02.html", "title": "The Routine",             "number": 2  },
  { "id": "chapter3",  "file": "chapters/ch03.html", "title": "Left Alone",              "number": 3  },
  { "id": "chapter4",  "file": "chapters/ch04.html", "title": "A Library for One",       "number": 4  },
  { "id": "chapter5",  "file": "chapters/ch05.html", "title": "The Girl with the Hammer","number": 5  },
  { "id": "chapter6",  "file": "chapters/ch06.html", "title": "Hope",                    "number": 6  },
  { "id": "chapter7",  "file": "chapters/ch07.html", "title": "All Good Things",         "number": 7  },
  { "id": "chapter8",  "file": "chapters/ch08.html", "title": "Static Between Stations", "number": 8  },
  { "id": "chapter9",  "file": "chapters/ch09.html", "title": "Golden",                  "number": 9  },
  { "id": "chapter15", "file": "chapters/ch15.html", "title": "Blackberries",            "number": 15 }
]
```

### Pattern 3: Fetch-Based showChapter()

**What:** Replace the current show/hide approach with fetch-and-inject.
**When to use:** Required once chapters live in separate files.

```javascript
// Replaces current showChapter() in script.js
let chapterCache = {};

async function showChapter(chapterId, shouldScrollToTop = true) {
    const container = document.getElementById('chapter-container');
    const chapter = chapterManifest.find(c => c.id === chapterId);
    if (!chapter) {
        logDebug(`[ERROR] Chapter ID ${chapterId} not found in manifest.`);
        return;
    }

    // Use cache to avoid re-fetching
    if (!chapterCache[chapterId]) {
        const response = await fetch(chapter.file);
        chapterCache[chapterId] = await response.text();
    }

    container.innerHTML = chapterCache[chapterId];
    updateChapterFooter(chapter.title);
    if (shouldScrollToTop) window.scrollTo(0, 0);
    localStorage.setItem('selectedChapter', chapterId);
}
```

**localStorage compatibility:** `selectedChapter` key unchanged — same string IDs (`chapter1`, `chapter2`, etc.) preserve backward compatibility for any user who has a saved position.

### Pattern 4: Docx-to-HTML Conversion Script

**What:** A one-off Node.js script to batch-convert all source docx files. Run once during the plan, not shipped with the site.
**When to use:** Execute as part of Wave 1 before any HTML authoring.

```javascript
// tools/convert-chapters.cjs (not shipped to site)
const mammoth = require('mammoth');
const fs = require('fs');

// NODE_PATH must be set: C:/Users/gspea/AppData/Roaming/npm/node_modules
const SOURCE_DIR = 'C:/Users/gspea/Downloads/chapters-20260310T173927Z-1-001/chapters/';

const conversions = [
  { file: 'The ritual + the rehersal(1D).docx', output: 'ch01-raw.html' },
  { file: 'The routine(2D).docx',               output: 'ch02-raw.html' },
  // ... etc
];

for (const { file, output } of conversions) {
  const result = await mammoth.convertToHtml({ path: SOURCE_DIR + file });
  fs.writeFileSync('chapters/' + output, result.value);
  if (result.messages.length) console.warn(file, result.messages);
}
```

### Anti-Patterns to Avoid
- **Serving mammoth from the browser:** mammoth is a Node.js library — never import it into client-side JS. Conversion happens at authoring time, not at read time.
- **Using innerHTML on the full page:** inject only into the `#chapter-container` div, never replace `document.body.innerHTML`.
- **Keeping chapters in index.html:** the entire point of this phase is the move to fragments — do not leave any `<div class="chapter">` in `index.html` after this phase is complete.
- **Using global section IDs (section7, section8...):** new chapters must use per-chapter prefixed IDs to avoid collisions with the existing audio section map until Phase 2 replaces it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Docx parsing | Manual regex on raw XML inside .docx ZIP | mammoth 1.11.0 | .docx is a ZIP of XML — mammoth handles bold, italic, headings, lists, special chars, em-dashes, and encoding correctly |
| Docx word counting | Manual wc -w on extracted text | `mammoth.extractRawText()` + split | extractRawText gives clean plain text without HTML artifacts |
| Chapter file discovery | Reading `chapters/` directory at runtime | `chapters/index.json` manifest | Static hosting (GitHub Pages) cannot list directory contents — there is no equivalent of `readdir()` in the browser |

**Key insight:** GitHub Pages is a pure static file server. There is no server-side directory listing. A manifest JSON is not optional — it is the only way for the browser to know what chapter files exist.

---

## Common Pitfalls

### Pitfall 1: Chapter 1 Content Divergence (CRITICAL)
**What goes wrong:** The current `index.html` Chapter 1 (~3,189 words) is substantially richer than the docx (~1,761 words). The HTML version contains:
- The escalating `.bold-grow-1` through `.bold-grow-4` SAME/SAME/SAME/SAME sequence (not in docx — docx uses lowercase "same. The same walls.")
- Extended Sisyphus book scene including the hairpin discovery, the bleeding finger, self-harm reflection, the Jeff Buckley t-shirt, and the margin-writing moment
- The Xander/Nico meeting at the library desk ("Friend? Acquaintance?" passage)
The docx ends at the library entrance — it does not contain the Sisyphus/hairpin section at all.

**Why it happens:** The docx appears to be an earlier or parallel draft. The HTML was authored independently and diverged significantly.

**How to avoid:** Produce DISCREPANCY.md before touching any HTML. List every scene, passage, and formatting element present in one version but not the other. The user decides which version is canonical — do not auto-replace.

**Warning signs:** Word count mismatch (docx: ~1,761 vs HTML: ~3,189) was the first signal.

### Pitfall 2: Chapter 2 Harley Characterization Divergence (CRITICAL)
**What goes wrong:** The current `index.html` Chapter 2 presents Harley as a named character with explicit `.harley` CSS class (Cinzel Decorative font) used extensively throughout. The docx version renders what appears to be Harley's voice as anonymous, unattributed italic commands ("You're already clean.", "Stop.", "That's enough.") — no Harley name appears anywhere in the docx.

**Why it happens:** Same docx/HTML authoring divergence as Ch1.

**How to avoid:** Flag this in DISCREPANCY.md. The question of whether the Harley character is named or anonymous is a creative/authorial decision, not a technical one.

**Warning signs:** Zero Harley mentions in docx; the `.harley` class used ~8 times in current HTML.

### Pitfall 3: Chapter 2 Docx is LONGER Than Current HTML
**What goes wrong:** Unlike Ch1 (where HTML is richer), Ch2's docx (~2,650 words) is longer than the current HTML (~1,977 words). The docx contains additional content the HTML lacks, including: the full ending scene with Gianna on the couch, the "She's alone" / "She made her choices" dialogue, Loaf kneading Nico's lap, and the complete poem "The Ever-Absent Mercy of a Clock."
**How to avoid:** The docx content not in the HTML should be added (flagging the join point with a comment).

### Pitfall 4: CONT-05 Chapter Number Mislabel
**What goes wrong:** REQUIREMENTS.md CONT-05 says "Chapter 7 (Static Between Stations) and Chapter 8 (Golden) added from `static between stations (8D).docx`." This conflicts with:
- The TOC.docx ordering: Ritual(1), Routine(2), Left Alone(3), A Library for One(4), The Girl with the Hammer(5), Hope(6), All Good Things(7), **Static Between Stations(8)**, Golden pt.1(9), Golden pt.2(10)
- The file name itself: `static between stations (8D).docx` — the `8D` suffix matches the TOC
- The Gianna POV file self-labeling: "Chapter 9: Golden (Gianna's Week)"

**What the actual chapter mapping is:**
- Ch 3: Left Alone
- Ch 4: A Library for One (renamed from "Breaking Through" in earlier roadmap — actual docx title is "A library for one")
- Ch 5: The Girl with the Hammer (renamed from "Grad" in earlier roadmap)
- Ch 6: Hope
- Ch 7: All Good Things
- Ch 8: Static Between Stations (from `static between stations (8D).docx`)
- Ch 9: Golden / Golden pt.1 (from `Gianna_s POV(9-10W).docx`)
- Ch 10: Gianna's Week / Golden pt.2 (also from `Gianna_s POV(9-10W).docx` — the weekly day structure Monday–Sunday appears to be a continuation)

**How to avoid:** Use TOC.docx and file suffixes as the authoritative numbering source, not REQUIREMENTS.md chapter labels. Flag this discrepancy during implementation.

### Pitfall 5: Section ID Collisions Breaking Audio
**What goes wrong:** Current `script.js` has `sectionToSongMap` with keys `section1`, `section2`, `section3`. If new chapter fragments use section IDs `section4`, `section5`, etc., they would match nothing — but if a future edit accidentally reuses `section1`–`section3`, the audio observer would fire on the wrong chapter.
**How to avoid:** Use per-chapter prefixed section IDs: `ch1-s1`, `ch2-s1`, `ch3-s1`, etc. Do not continue the global `section7`, `section8` sequence.

### Pitfall 6: mammoth NODE_PATH on This Machine
**What goes wrong:** `node -e "require('mammoth')"` fails because mammoth was installed globally but Node's module resolution doesn't find it without `NODE_PATH` set.
**How to avoid:** Any Node script that uses mammoth must either:
- Set `NODE_PATH=C:/Users/gspea/AppData/Roaming/npm/node_modules` in the environment before running, or
- Install mammoth locally: `cd C:\Users\gspea\Book && npm init -y && npm install mammoth`
- The local install approach is cleaner and avoids environment variable dependency.

### Pitfall 7: Blackberries (Ch15) Contains Three Sections
**What goes wrong:** `Blackberries (15D).docx` is not just prose — it contains the main Blackberries narrative plus two poems (`Behind a Closed Door` and `A Face is One-Thousand Things`) as `<h3>` sections. If treated as a single `<section>`, the structural semantics are lost.
**How to avoid:** Split into three sections within `ch15.html`: one for the Blackberries prose, one for each poem. Apply `.poetic-text` class to the poem content.

### Pitfall 8: Chapter 1 Docx Contains "The Rehearsal" Poem
**What goes wrong:** The file `The ritual + the rehersal(1D).docx` ends with an `<h3>The rehearsal.</h3>` poem section — this is a named subsection within Chapter 1, not a separate chapter. If the conversion is done without inspecting the output, this `<h3>` may be mistakenly treated as a chapter title.
**How to avoid:** The Rehearsal poem becomes a third section within `ch01.html` with `.poetic-text` applied to the poem lines.

### Pitfall 9: fetch() Fails on file:// Protocol
**What goes wrong:** If the developer opens `index.html` directly by double-clicking (file:// protocol), `fetch('chapters/ch01.html')` will fail with a CORS error in most browsers.
**How to avoid:** Document in a comment in `script.js` that a local HTTP server is required for development (e.g., `npx serve .` or VS Code Live Server). This is not a production issue — GitHub Pages serves over HTTPS.

---

## Code Examples

Verified patterns from source inspection:

### Formatting Classes Already in styles.css (Confirmed)
```css
/* All of these exist — do not recreate */
.bold-grow-1  { font-weight: bold; font-size: 1em; }
.bold-grow-2  { font-weight: bold; font-size: 1.1em; }
.bold-grow-3  { font-weight: bold; font-size: 1.2em; }
.bold-grow-4  { font-weight: bold; font-size: 1.4em; }
.centered-text   { text-align: center; }
.right-aligned   { text-align: right; }
.staggered-indent p:nth-child(1) { text-indent: 2em; }
/* ... through p:nth-child(5) */
.harley { font-family: "Cinzel Decorative", serif; font-weight: 400; }
.poetic-text /* not defined in styles.css yet — needs adding or confirming */
```

**IMPORTANT:** `.poetic-text` is referenced in CONTEXT.md and REQUIREMENTS.md as an existing class to preserve, but it does NOT appear in the current `styles.css`. It appears in comments in `index.html` as a class on a `<div>`. A CSS rule for `.poetic-text` must be confirmed or created.

### Date/Location Header Pattern (from current index.html)
```html
<p class="date-location"><em>Sunday, March 8th, 2036<br>Olympia, Washington</em></p>
```
Mammoth outputs date/location lines as plain `<p>` — manual wrapping in `class="date-location"` is required post-conversion.

### Bold-Grow Pattern (from current index.html — NOT in docx)
```html
<p>It's the
<span class="bold-grow-1">SAME</span>.
The <span class="bold-grow-2">SAME</span> walls. The
<span class="bold-grow-3">SAME</span> dull hum. The
<span class="bold-grow-4">SAME</span> list...</p>
```
Mammoth cannot infer these from the docx — the docx uses lowercase "same" with no escalating bold. This pattern exists only in the current HTML and represents human-authored enhancement above the docx content.

### Staggered Indent Pattern (from current index.html)
```html
<div class="staggered-indent">
  <p>Hangers lined with leather,</p>
  <p>shelves stacked with shirts,</p>
  <p>jackets he bought for a version of himself that never arrived.</p>
  <p>Shoes worn once, then abandoned when he realized they couldn't fix his posture or his presence.</p>
</div>
```
Mammoth outputs these as a sequence of plain `<p>` tags — the `staggered-indent` wrapper div must be added manually.

### Poetic Section (Chapter 1 Rehearsal, from docx conversion)
```html
<!-- mammoth output (h3 = poem title, subsequent <p> = poem lines) -->
<h3>The rehearsal.</h3>
<p>I wear a leased laugh and a stolen smile</p>
<p>stretched to fit my face.</p>
```
Should become in the fragment:
```html
<section id="ch1-s3" class="book-section">
  <h3 class="chapter-title">The Rehearsal.</h3>
  <div class="poetic-text">
    <p>I wear a leased laugh and a stolen smile</p>
    <p>stretched to fit my face.</p>
    <!-- ... -->
  </div>
</section>
```

### index.html Shell Container (what index.html becomes)
```html
<!-- Remove all <div class="chapter"> blocks from index.html -->
<!-- Add this single container in their place: -->
<div class="book-container">
  <div id="chapter-container">
    <!-- Chapter content injected here by script.js -->
  </div>
  <!-- Highlighting, comments, chapter-footer stay in place -->
</div>
```

---

## Source File Inventory (Verified)

All files confirmed present at `C:\Users\gspea\Downloads\chapters-20260310T173927Z-1-001\chapters\`:

| File | Chapters | Word Count | Mammoth Warnings | Notes |
|------|----------|------------|-----------------|-------|
| `The ritual + the rehersal(1D).docx` | Ch1 | ~1,761 | 0 | Ends with "The Rehearsal" poem (h3) |
| `The routine(2D).docx` | Ch2 | ~2,650 | 0 | Ends with "The Ever-Absent Mercy of a Clock" poem; no Harley name |
| `nico backstory(3-7D).docx` | Ch3–7 | ~9,594 | 0 | 5 chapters: Left Alone, A Library for One, The Girl with the Hammer, Hope, All Good Things |
| `static between stations (8D).docx` | Ch8 | ~3,518 | 0 | Single chapter; "Present Day" subtitle |
| `Gianna_s POV(9-10W).docx` | Ch9–10 | ~3,576 | 0 | Self-labels as "Chapter 9"; Monday–Sunday week structure suggests Ch10 is embedded |
| `Blackberries (15D).docx` | Ch15 | ~567 | 0 | Prose + 2 poems (Behind a Closed Door, A Face is One-Thousand Things) |
| `TOC.docx` | — | — | — | Authoritative chapter ordering reference |
| `Removed from chapter 14.md` | — | — | — | Excised content; not for inclusion |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| All chapters in index.html (pre-rendered) | Chapter fragments fetched dynamically | This phase | Enables 10+ chapters without bloating initial HTML |
| script.js queries `.chapter` from DOM | script.js reads manifest, fetches fragments | This phase | Nav system decoupled from DOM structure |
| Chapters discovered by `querySelectorAll('.chapter')` | Chapters discovered from `chapters/index.json` | This phase | GitHub Pages cannot list directories — manifest is required |

---

## Open Questions

1. **CONT-05 chapter number labeling conflict**
   - What we know: REQUIREMENTS.md says "Chapter 7 (Static Between Stations)" but TOC.docx lists it as position 8; the file is named `static between stations (8D).docx`; `Gianna_s POV(9-10W).docx` self-labels as "Chapter 9: Golden"
   - What's unclear: Whether requirements were written with an intentional renumbering or contain a labeling error
   - Recommendation: Use TOC.docx and file suffix numbering as canonical. Map: Static=Ch8, Golden=Ch9, Gianna's Week=Ch10. Flag this in the DISCREPANCY.md. The planner should treat CONT-05 as "add Static Between Stations as Ch8" and CONT-06 as "add Golden (Ch9) and Gianna's Week (Ch10) from the Gianna POV file."

2. **`.poetic-text` CSS class definition missing from styles.css**
   - What we know: `.poetic-text` is referenced as an existing class in CONTEXT.md and REQUIREMENTS.md, and used as a class on a div in `index.html` line 36; it is NOT defined in `styles.css`
   - What's unclear: Whether it was intentionally unstyled (relies on parent styles) or accidentally omitted
   - Recommendation: Add a minimal `.poetic-text` CSS rule during this phase (e.g., `font-style: italic; line-height: 2;`) and annotate with a `<!-- TODO: verify styling -->` comment, or treat it as an identity class for Phase 3 text effects to target.

3. **Gianna's Week chapter boundary**
   - What we know: `Gianna_s POV(9-10W).docx` (3,576 words) self-labels "Chapter 9" but contains a Monday–Sunday week structure; the `(9-10W)` suffix suggests it spans Ch9 and Ch10; the `W` suffix likely means "Week"
   - What's unclear: Exactly where Ch9 ends and Ch10 begins
   - Recommendation: Treat the "Golden" prose opening as Ch9 and the Monday–Sunday week diary as Ch10. If no explicit chapter break is found in the docx, use `<strong>Monday</strong>` as the start of Ch10 and annotate with `<!-- TODO: verify chapter split -->`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no jest.config, no pytest.ini, no test/ directory |
| Config file | None — see Wave 0 gap |
| Quick run command | `node tools/validate-chapters.cjs` (Wave 0 creation) |
| Full suite command | `node tools/validate-chapters.cjs --full` |

This is a static HTML/JS project with no existing test infrastructure. Validation is structural: do the generated files exist, do they contain the right elements, does the manifest match the files on disk?

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CONT-01 | DISCREPANCY.md produced and non-empty | smoke | `test -s chapters/DISCREPANCY.md` | ❌ Wave 0 |
| CONT-02 | `chapters/ch01.html` exists and contains `.chapter-title` | structural | `node tools/validate-chapters.cjs --check ch01` | ❌ Wave 0 |
| CONT-03 | `chapters/ch02.html` exists and word count > 2,500 | structural | `node tools/validate-chapters.cjs --check ch02` | ❌ Wave 0 |
| CONT-04 | `chapters/ch03.html` through `ch07.html` all exist | structural | `node tools/validate-chapters.cjs --check ch03 ch04 ch05 ch06 ch07` | ❌ Wave 0 |
| CONT-05 | `chapters/ch08.html` exists and contains "Static Between Stations" | structural | `node tools/validate-chapters.cjs --check ch08` | ❌ Wave 0 |
| CONT-06 | `chapters/ch09.html` and `ch10.html` exist | structural | `node tools/validate-chapters.cjs --check ch09 ch10` | ❌ Wave 0 |
| CONT-07 | `chapters/ch15.html` exists and contains "Blackberries" | structural | `node tools/validate-chapters.cjs --check ch15` | ❌ Wave 0 |
| CONT-08 | No chapter file contains inline `style=` for formatting (uses classes instead) | lint | `node tools/validate-chapters.cjs --lint-formatting` | ❌ Wave 0 |
| CONT-09 | `chapters/index.json` contains exactly 10 entries; all referenced files exist | structural | `node tools/validate-chapters.cjs --manifest` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `node tools/validate-chapters.cjs --check [chNN]` for each chapter just written
- **Per wave merge:** `node tools/validate-chapters.cjs --full` (all chapters + manifest + lint)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tools/validate-chapters.cjs` — covers CONT-01 through CONT-09 structural checks
- [ ] `chapters/` directory creation
- [ ] `npm init -y && npm install mammoth` (local install in project root to avoid NODE_PATH dependency)

---

## Sources

### Primary (HIGH confidence)
- Live source file inspection — all 6 docx files read via mammoth 1.11.0; all word counts and structure findings are from actual file content
- Live codebase inspection — `index.html`, `script.js`, `styles.css` read in full; all findings are from actual file content

### Secondary (MEDIUM confidence)
- mammoth npm registry — version 1.11.0 confirmed installed; API surface (`convertToHtml`, `extractRawText`, `convertToMarkdown`) confirmed via `Object.keys(mammoth)`

### Tertiary (LOW confidence)
- None — all findings are from direct file inspection

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — mammoth confirmed installed and tested against all source files; zero conversion warnings
- Architecture: HIGH — based on actual examination of script.js show/hide logic, localStorage keys, and section ID patterns in the live codebase
- Pitfalls: HIGH — discrepancies documented from direct word-count and content comparison between live docx files and live HTML
- Chapter numbering conflict: HIGH — conflict confirmed by cross-referencing TOC.docx, file suffix naming, and file self-labeling

**Research date:** 2026-03-10
**Valid until:** Stable content (docx files don't change) — valid until source files are modified
