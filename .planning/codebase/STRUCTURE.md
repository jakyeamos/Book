# Codebase Structure

**Analysis Date:** 2026-03-10

## Directory Layout

```
/c/Users/gspea/Book/
├── .github/              # GitHub workflows and configuration
├── .planning/            # GSD planning documents
│   └── codebase/         # Architecture and structure analysis
├── index.html            # Main application entry point
├── script.js             # Interactive features and state management
├── styles.css            # Presentation layer and theming
├── Eva_Angelina.mp3      # Background music track 1
├── Mojo_Pin.mp3          # Background music track 2
├── Rose_Parade.mp3       # Background music track 3
└── .git/                 # Version control
```

## Directory Purposes

**Root Directory:**
- Purpose: Contains all application files, music assets, and configuration
- Contains: HTML entry point, JavaScript logic, CSS styling, audio files, git metadata
- Deployment: All files at root level deployed as-is to static hosting

**.planning/codebase/:**
- Purpose: Holds architectural analysis documents
- Contains: ARCHITECTURE.md, STRUCTURE.md, CONVENTIONS.md, TESTING.md, CONCERNS.md
- Generated: Yes (by GSD mapping commands)
- Committed: Yes (version controlled for team reference)

**.github/:**
- Purpose: GitHub Actions CI/CD workflows
- Key file: `jekyll-gh-pages.yml` (for GitHub Pages deployment)
- Generated: No (manually maintained)

## Key File Locations

**Entry Points:**

- `index.html`: HTML document structure - loads all chapters, sections, controls, audio element, and scripts. Single-page document served to browser. No routing or multiple pages.

**Configuration:**

- No traditional config files (no package.json, no build process)
- Audio mapping: Hardcoded in `script.js` lines 276-280 as `sectionToSongMap`
- Feature flags: None detected - all features enabled by default

**Core Logic:**

- `script.js`: All JavaScript functionality - chapter navigation, audio playback, highlighting, dark mode, state persistence
- `styles.css`: All CSS - layout, typography, colors, theming, animations
- `index.html`: Content markup - narrative text organized into chapters and sections

**Content:**

- `index.html` lines 27-230: Chapter 1 (sections 1-4) - "THE RITUAL" narrative
- `index.html` lines 293-386: Chapter 2 (sections 5-6) - "THE ROUTINE" narrative
- Sections identified by IDs: `section1` through `section6`
- Audio mappings: `section1` → Eva_Angelina.mp3, `section2` → Mojo_Pin.mp3, `section3` → Rose_Parade.mp3

**Static Assets:**

- `Eva_Angelina.mp3` (4.0 MB): Background music for Chapter 1, Section 1
- `Mojo_Pin.mp3` (5.5 MB): Background music for Chapter 1, Section 2
- `Rose_Parade.mp3` (3.3 MB): Background music for Chapter 1, Section 3
- Asset strategy: Files referenced by filename in `sectionToSongMap`, served from root directory

**Testing:**

- Not present - no test files, test configuration, or test directory structure

## Naming Conventions

**Files:**

- Pattern: `kebab-case.ext` or `camelCase.js`
- Examples: `index.html`, `script.js`, `styles.css`, `Eva_Angelina.mp3`
- CSS uses: English descriptive names (e.g., `chapter-controls`, `dark-mode-toggle`)

**HTML IDs:**

- Pattern: `kebab-case` or `lowercase`
- Examples: `chapter-controls`, `chapter-selector`, `background-audio`, `chapter1`, `section1`
- Purpose: Direct reference from JavaScript queries

**CSS Classes:**

- Pattern: `kebab-case`
- Examples: `book-container`, `chapter-title`, `book-section`, `hidden`, `dark-mode`
- Convention: One hyphen for regular classes, two hyphens for modifiers (dark-mode)

**JavaScript Functions:**

- Pattern: `camelCase`
- Public functions: `showChapter()`, `playSongForSection()`, `highlightSelectedText()`, `logDebug()`
- Helper functions: `navigateChapter()`, `updateNavigationButtons()`, `updateChapterOnScroll()`
- Event callbacks: Often inline arrow functions (lines 112-117, 74-79, 134-135)

**JavaScript Variables:**

- Pattern: `camelCase` for normal variables, `UPPERCASE` for constants
- Examples: `audio`, `darkModeButton`, `currentSong`, `sectionToSongMap` (object)
- Scope: Most variables declared within DOMContentLoaded event listener (line 1) for encapsulation

**CSS Variables:**

- Pattern: Not used - hardcoded color values
- Colors: Literal values like `#ffffff`, `#1a1a1a`, `rgba(0, 0, 0, 0.7)`
- Opportunity: Could migrate to CSS custom properties for theme management

## Where to Add New Code

**New Chapter Content:**

- File: `index.html`
- Location: Add new `<div class="chapter" id="chapterN">` block after existing chapters (after line 386)
- Pattern: Include `<section class="book-section" id="sectionN">` subsections with paragraph content
- Title: Include `<h2 class="chapter-title">` with chapter name
- Example structure:
  ```html
  <div class="chapter" id="chapter3">
    <section id="section7" class="book-section">
      <h2 class="chapter-title"><strong>CHAPTER NAME</strong></h2>
      <p>Content goes here...</p>
    </section>
  </div>
  ```

**New Audio Track for Section:**

- File: `script.js` lines 276-280
- Location: Add entry to `sectionToSongMap` object
- Pattern: `sectionId: "filename.mp3"`
- Example: `section7: "new_track.mp3"`
- Requirements: MP3 file must exist in root directory and be referenced by exact filename
- Note: No file validation - missing files fail silently in audio playback

**New Interactive Feature:**

- File: `script.js` (within DOMContentLoaded listener, after line 2)
- Pattern: Add HTML control element (button, toggle) to `index.html`
- Query element: `const newElement = document.getElementById("element-id");`
- Add listener: `newElement.addEventListener("click", function() { ... })`
- State storage: Use `localStorage.setItem(key, value)` for persistence
- Example: Follow pattern of dark mode toggle (lines 74-79) or mute toggle (lines 82-91)

**New Theme or Font Style:**

- File: `styles.css`
- Location: Add CSS class at appropriate section (typography section starts line 197)
- Pattern: Define class with font-family, font-weight, font-style
- Usage: Apply class to HTML elements in `index.html` (e.g., `<span class="new-style">text</span>`)
- Theme colors: Add dark mode rule (e.g., `.dark-mode .class-name { ... }`)

**New Debug Feature:**

- Utilize existing: `logDebug()` function (line 441-466)
- Location: `script.js` lines 441-466
- Usage: Call `logDebug("[CATEGORY] message")` from anywhere
- Auto-display: Messages appear in fixed debug panel (bottom-right)
- Categories observed: `[DEBUG]`, `[ERROR]`, `[WARNING]`, `[INFO]`, `[AUDIO]`, `[OBSERVER]`

## Special Directories

**.git/:**
- Purpose: Version control metadata
- Generated: Yes (git initialization)
- Committed: Yes (part of git repo)
- Note: Standard git directory structure

**.github/:**
- Purpose: GitHub-specific configuration and CI/CD
- Files: `jekyll-gh-pages.yml` (GitHub Actions workflow)
- Generated: No (manually created)
- Committed: Yes

**.planning/:**
- Purpose: GSD (Goal-Driven Strategy) planning documents
- Subdirectory: `.planning/codebase/` contains analysis docs
- Generated: Yes (by GSD mapper commands)
- Committed: Yes (reference documents for team)

**No build output directory:**
- Architecture note: This is a static site with no build process
- Assets: HTML, CSS, JS deployed directly, no minification or bundling
- Opportunity: Could add build tooling (webpack, esbuild) for minification/optimization

## File Size Notes

- `index.html`: ~41 KB (large due to narrative content)
- `script.js`: ~21 KB (comprehensive feature set)
- `styles.css`: ~8 KB (extensive font/style definitions)
- `Eva_Angelina.mp3`: ~4.0 MB
- `Mojo_Pin.mp3`: ~5.5 MB
- `Rose_Parade.mp3`: ~3.3 MB
- **Total with audio:** ~12.9 MB

---

*Structure analysis: 2026-03-10*
