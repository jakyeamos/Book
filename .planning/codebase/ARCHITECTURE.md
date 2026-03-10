# Architecture

**Analysis Date:** 2026-03-10

## Pattern Overview

**Overall:** Single-Page Application (SPA) with Progressive Enhancement

**Key Characteristics:**
- Client-side rendering with vanilla JavaScript (no framework dependencies)
- Document-based narrative structure with interactive features
- Observable pattern for section visibility tracking
- Persistent state management via localStorage
- Modular feature isolation (chapters, audio, highlighting, dark mode)

## Layers

**Presentation Layer:**
- Purpose: Renders narrative content and UI controls
- Location: `index.html`
- Contains: Semantic HTML markup for chapters, sections, navigation controls
- Depends on: CSS styling, JavaScript for interactivity
- Used by: Main application bootstrap

**Interaction Layer:**
- Purpose: Handles user input, events, and DOM manipulation
- Location: `script.js` (lines 1-438)
- Contains: Event listeners, state updates, localStorage synchronization
- Depends on: DOM API, IntersectionObserver API, localStorage API
- Used by: All interactive features (chapter navigation, dark mode, highlighting, audio)

**State Management Layer:**
- Purpose: Persists user preferences and reading progress
- Mechanism: Browser localStorage with JSON serialization
- Manages: Selected chapter, scroll position, dark mode preference, audio mute state, highlights
- Access pattern: Key-value pairs stored as strings, parsed on load

**Audio Engine:**
- Purpose: Background music playback tied to section visibility
- Location: `script.js` (lines 275-340)
- Audio element: `<audio id="background-audio">` in `index.html`
- Mapping: Section IDs to local MP3 files via `sectionToSongMap` object
- Trigger: IntersectionObserver fires when section reaches 50% visibility

**Styling System:**
- Purpose: Visual presentation and theming
- Location: `styles.css`
- Contains: Layout, typography, dark mode styles, custom font classes
- Depends on: Google Fonts API (Alegreya Sans SC, BioRhyme, Annie Use Your Telescope, Cinzel Decorative)

## Data Flow

**Chapter Navigation Flow:**

1. User clicks dropdown or prev/next button
2. Event listener captures selection (line 112-117)
3. Chapter ID saved to localStorage (line 114)
4. `showChapter()` hides all chapters except selected (line 343-363)
5. Footer and page number update (line 361-362)
6. Navigation buttons update visibility (line 366-374)

**Audio Playback Flow:**

1. IntersectionObserver monitors all mapped sections
2. Section becomes 50%+ visible on screen
3. `playSongForSection()` triggered (line 285-317)
4. Song file mapped via `sectionToSongMap` (line 276-280)
5. Audio element source updated and playback initiated (line 291-308)
6. Current song cached to prevent re-triggering (line 304)

**Highlighting Feature Flow:**

1. User selects text in chapter
2. `highlightSelectedText()` extracts selection (line 143-198)
3. Validation ensures selection is within chapter (line 161-176)
4. Text wrapped in `<mark>` element via `surroundContents()` (line 179-181)
5. Highlight object stored in localStorage with chapter context (line 185-186)
6. On page load, `loadAndApplyHighlights()` re-applies all highlights (line 201-273)

**Dark Mode Flow:**

1. User clicks dark mode button (line 74-79)
2. Preference saved to localStorage (line 77)
3. `dark-mode` class toggled on body element (line 75)
4. CSS dark mode selectors apply inverted colors
5. Preference persists across sessions (line 58-61)

**State Management:**

- **localStorage Keys:**
  - `selectedChapter`: Active chapter ID
  - `scrollPosition`: Pixel offset from top
  - `darkMode`: "enabled" or "disabled"
  - `audioMuted`: "true" or "false"
  - `highlights`: JSON array of highlight objects

- **Restoration Pattern:** On window load event, localStorage values retrieve and apply UI state

## Key Abstractions

**Section-to-Song Mapping:**
- Purpose: Declarative audio assignment to narrative sections
- Location: `script.js` lines 276-280
- Pattern: Simple object literal mapping section IDs to filename strings
- Extensible: Add new entries to map new sections to audio files

**Chapter Manager:**
- Purpose: Encapsulates chapter visibility and navigation logic
- Implemented via: `chapters` array (line 14) and related helper functions
- Functions: `showChapter()`, `navigateChapter()`, `updateNavigationButtons()`
- Scope: All chapter-related state and DOM updates isolated to these functions

**Highlight System:**
- Purpose: Persistent markup of user-selected text across sessions
- Dual responsibility: Save on user selection, re-apply on page load
- Challenge: Text nodes split/merged during DOM operations
- Mitigation: Reverse-iteration through nodesToReplace array (line 243)

**Observer System:**
- Purpose: Trigger audio playback based on section visibility
- Technology: IntersectionObserver API with 0.5 threshold
- Benefit: Automatic triggering without manual scroll tracking
- Coverage: Only sections in `sectionToSongMap` are observed

## Entry Points

**Application Bootstrap:**
- Location: `index.html` (line 1-10)
- Triggers: Page load in browser
- Responsibilities: Load stylesheets, define HTML structure, defer script execution

**Script Initialization:**
- Location: `script.js` (line 1-2)
- Triggers: `DOMContentLoaded` event
- Responsibilities: Initialize DOM references, set up event listeners, restore state

**Primary User Interactions:**
- Chapter selection: `#chapter-selector` change event (line 112-117)
- Previous/Next buttons: Click events (line 134-135)
- Dark mode toggle: Click event (line 74-79)
- Mute toggle: Click event (line 82-91)
- Highlight button: Click event (line 95)
- Scroll events: Window scroll triggers page number and chapter updates (line 424-425)
- Window resize: Recalculates page breaks and reapplies highlights (line 428-435)

## Error Handling

**Strategy:** Defensive null checking with console/debug logging

**Patterns:**

- **Element Not Found:** Check if element exists before accessing (line 65-72, 82-91, 94-98)
- **DOM Operations Failure:** Try-catch around `surroundContents()` with fallback (line 180-194)
- **Audio Playback Issues:** Promise-based error handling with retry-safe state (line 299-311)
- **localStorage Parsing:** Default to empty objects/arrays if parsing fails (line 184, 202)
- **Missing Chapter:** Validation that chapter exists before showing (line 357-359)

**Debug Output:**

- Custom logger function `logDebug()` outputs timestamped messages to in-page console (line 441-466)
- Messages auto-clear after 30 seconds (line 454-458)
- Max 50 concurrent messages kept to prevent memory bloat (line 461-463)
- Categories: `[DEBUG]`, `[ERROR]`, `[WARNING]`, `[INFO]`, `[AUDIO]`, `[OBSERVER]`

## Cross-Cutting Concerns

**Logging:**
- Approach: Custom `logDebug()` function with DOM output
- Usage: Audio operations, IntersectionObserver events, chapter transitions, initialization
- Audience: Developer/user debugging rather than production analytics

**Validation:**
- Approach: Inline checks before operations
- Examples: Text selection validation (line 145-158), chapter existence checks (line 357-359)
- Strategy: Fail gracefully with informative logging rather than throwing

**Authentication:**
- Approach: Not applicable - client-side only application
- Note: No user identity or permission system

**Performance Optimization:**
- Lazy restoration: Scroll position restored with 100ms delay (line 47-50)
- Lazy reapplication: Highlights only applied to visible chapters (line 211)
- Debounced calculations: Window resize recalculates page offsets (line 428-435)
- Audio promise handling: Prevents duplicate play attempts (line 304)

---

*Architecture analysis: 2026-03-10*
