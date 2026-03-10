# Coding Conventions

**Analysis Date:** 2026-03-10

## Naming Patterns

**Files:**
- HTML: `index.html` - Single entry point
- JavaScript: `script.js` - Single monolithic file (no module structure)
- CSS: `styles.css` - Single stylesheet
- Assets: `{SongName}.mp3` - All media files with descriptive names (e.g., `Eva_Angelina.mp3`, `Mojo_Pin.mp3`)

**Functions:**
- camelCase for all function declarations
- Verb-first pattern: `playSongForSection()`, `highlightSelectedText()`, `updatePageNumber()`, `showChapter()`, `navigateChapter()`
- Helper functions prefixed with underscore convention not used; instead use descriptive names
- Event handler functions named descriptively: `updateChapterOnScroll()`, `handleResize()`
- Private scope achieved through block scope, not naming conventions

**Variables:**
- camelCase for all variable declarations
- Descriptive names reflecting purpose: `chapterSelector`, `darkModeButton`, `sectionToSongMap`, `observerOptions`
- Constants use camelCase (not UPPER_SNAKE_CASE): `sectionToSongMap`, `observerOptions`
- Boolean variables often prefixed with `is` or `should`: `isMuted`, `isDark`, `inChapter`, `shouldScrollToTop`, `isCollapsed`

**Types/Classes:**
- HTML element references use `camelCase`: `audio`, `chapterSelector`, `pageNumber`, `currentChapter`
- No TypeScript or formal type system; types are implicit via usage
- DOM elements selected once at init and stored in variables

## Code Style

**Formatting:**
- No explicit code formatter (Prettier, ESLint, or Biome) detected
- Indentation: 4 spaces (observed in script.js)
- Line length: Mixed; some lines exceed 100 characters
- Semicolons: Consistently used at end of statements
- Spacing: Single space around operators, after `if/for/while`, before opening braces

**Linting:**
- No linting configuration found (.eslintrc, .eslintignore, eslint.config.js absent)
- Code follows informal conventions rather than enforced rules
- Comments use emoji for visual organization: `📌`, `🌙`, `🎵`, `🎯`, `👀`, `🔇`, `✨`, `🔄`, `📌`, `📚`, `📖`, `📐`, `🛠`, `🐞`, `🌙`

## Import Organization

**Global Scope:**
- No explicit imports (vanilla JavaScript)
- DOM elements queried directly: `document.getElementById()`, `document.querySelectorAll()`, `document.createElement()`
- External script loaded via `<script>` tag at end of HTML: `<script src="script.js"></script>`
- Audio files referenced by string literals in `sectionToSongMap` object

**Code Organization:**
- Single `script.js` file contains all logic
- Initialization wrapped in `DOMContentLoaded` event listener (lines 1-438)
- Global functions outside event listener: `logDebug()` (line 441+)
- Global constant objects: `sectionToSongMap` (line 276)

## Error Handling

**Patterns:**

**Try-Catch:**
- Used for DOM manipulation errors in `highlightSelectedText()` (lines 180-197)
- Used in `loadAndApplyHighlights()` (lines 212-268) with comprehensive error logging
- Catch blocks log errors but continue execution where safe

**Fallback Logic:**
- Selection validation before manipulation (lines 144-158)
- Range checks before DOM traversal (lines 163-169)
- Optional chaining via null/undefined checks: `if (chapterTitleElement) { ... }`
- Null coalescing pattern: `let isMuted = localStorage.getItem("audioMuted") === "true"`

**Promise Handling:**
- Audio playback wrapped in promise with `.then().catch()` (lines 299-311)
- Error messages logged to both debug UI and console

**Logging on Error:**
```javascript
// Example from highlightSelectedText():
logDebug(`[ERROR] Could not surround contents for highlighting: ${e.message}. ...`);

// Example from playSongForSection():
logDebug(`[AUDIO] Playback FAILED for: ${audio.src}. Error: ${error.name} - ${error.message}`);
```

## Logging

**Framework:** Custom `logDebug()` function (lines 441-466)

**Implementation:**
- No external logging library (Winston, Pino, etc.)
- Custom debug UI appended to DOM element `#debug-log`
- Timestamps added automatically in HH:MM:SS format
- Auto-clear: Log entries removed after 30 seconds (line 454)
- Circular buffer: Only last 50 messages kept (lines 461-463)

**Patterns:**

**Log Levels:**
- `[DEBUG]` - State changes, initialization, calculations
- `[INFO]` - User interactions, non-error state
- `[WARNING]` - Expected edge cases, unusual but handled conditions
- `[ERROR]` - Unexpected failures, exceptions
- `[AUDIO]` - Audio-specific events (playback, muting, song switching)
- `[OBSERVER]` - Intersection observer events

**When to Log:**
- Initialization: Line 2, 32, 437
- State changes: Lines 49, 69, 87, 146, 155
- User interactions: Lines 115, 187, 263
- Error conditions: Lines 18, 71, 90, 97, 190, 267, 270, 358
- Calculations: Lines 402-406

**Examples:**
```javascript
logDebug("[DEBUG] DOM fully loaded. Initializing scripts...");
logDebug(`[AUDIO] New song detected. Attempting to play: ${songFile} for section: ${sectionId}.`);
logDebug(`[ERROR] Chapter ID ${chapterId} not found.`);
logDebug(`[WARNING] Highlight attempt outside of a chapter. Ignoring.`);
```

## Comments

**When to Comment:**
- Emoji section headers used extensively (📌, 🌙, 🎵, etc.) instead of text comments
- Inline comments explain non-obvious logic (lines 139, 222-223, 249, 254)
- No JSDoc or formal documentation comments
- Comments clarify intent rather than restate code

**Examples:**
```javascript
// 📌 Precompute total pages for all chapters
function computeChapterPageOffsets() { ... }

// ✨ Helper function to escape RegExp special characters
function escapeRegExp(string) { ... }

// Basic check: Ensure selection is within a chapter
let inChapter = false;
```

## Function Design

**Size:**
- Functions range from 2-80 lines
- Average function: 15-25 lines
- Largest function: `loadAndApplyHighlights()` at ~73 lines (lines 201-273) - performs complex DOM tree walking and replacement

**Parameters:**
- Most functions take 0-2 parameters
- Boolean flags used for control flow: `showChapter(chapterId, shouldScrollToTop = true)`
- Default parameter values: `shouldScrollToTop = true`
- No rest parameters or destructuring observed

**Return Values:**
- Most functions return nothing (void)
- One function returns modified boolean: `escapeRegExp()` returns string
- Functions relied upon for side effects (DOM mutation, localStorage updates)

**Examples:**
```javascript
// No return, side effects on DOM
function showChapter(chapterId, shouldScrollToTop = true) { ... }

// Return value used
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Side effects: event listener registration, state mutation
chapterSelector.addEventListener("change", function () {
    localStorage.setItem("selectedChapter", selectedChapter);
    updateNavigationButtons(selectedChapter);
});
```

## Module Design

**Exports:**
- No module system (no `export`, `module.exports`, ES6 modules)
- Single global scope containing all functions and variables
- Functions accessed via window object when needed

**Global State:**
- DOM element references cached at initialization (lines 4-12)
- `chapters` array: Global reference to all chapter elements (line 14)
- `chapterPageOffsets` object: Computed and maintained globally (line 15)
- `currentSong` variable: Tracks currently playing song (line 282)
- `sectionToSongMap` object: Constant mapping configuration (lines 276-280)

**Initialization Pattern:**
```javascript
// Wait for DOM load
document.addEventListener("DOMContentLoaded", function () {
    // Query DOM once
    const audio = document.getElementById("background-audio");
    const chapters = Array.from(document.querySelectorAll(".chapter"));

    // Compute initial state
    computeChapterPageOffsets();

    // Register event listeners
    window.addEventListener("load", function () { ... });
    chapterSelector.addEventListener("change", function () { ... });

    // Initialize features
    logDebug("[DEBUG] Initialization complete.");
});

// Utility functions available globally
function logDebug(message) { ... }
```

## Object Patterns

**Configuration Objects:**
```javascript
// Mapping configuration
const sectionToSongMap = {
  section1: "Eva_Angelina.mp3",
  section2: "Mojo_Pin.mp3",
  section3: "Rose_Parade.mp3"
};

// Observer configuration
const observerOptions = { threshold: 0.5 };

// Highlight data structure
let highlights = JSON.parse(localStorage.getItem("highlights")) || [];
highlights.push({ chapterId: currentChapterId, text: selectedText });
```

**Immutable Data Patterns:**
- Used sparingly; no freeze/seal
- Rely on localStorage serialization for persistence

---

*Convention analysis: 2026-03-10*
