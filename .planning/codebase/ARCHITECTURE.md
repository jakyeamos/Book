# Architecture

**Analysis Date:** 2026-03-11

## Pattern Overview

**Overall:** Single-Page Application (SPA) with a data-driven chapter experience layer

**Key Characteristics:**
- One HTML shell (`index.html`) that never reloads; all chapter content is fetched and injected at runtime
- A central configuration module (`chapters/config.js`) drives all per-chapter behavior: themes, audio cues, particle effects, and parallax layers
- Two class-based controllers (`AudioController`, `ParticleController`) encapsulate stateful side-effects; all other logic lives in plain functions inside a single DOMContentLoaded closure in `script.js`
- Requires an HTTP server at runtime; `fetch()` is used for chapter HTML fragments and the manifest — `file://` protocol is explicitly unsupported

## Layers

**Shell Layer:**
- Purpose: Static HTML scaffold that is loaded once; provides DOM anchor points for all dynamic content
- Location: `index.html`
- Contains: Audio elements, fixed controls bar, parallax root, chapter container, comments widget container, chapter footer
- Depends on: CDN scripts (GSAP, ScrollTrigger, tsParticles), `styles.css`, `script.js`
- Used by: Browser directly

**Configuration Layer:**
- Purpose: Single source of truth for every chapter's theme, audio cue timeline, particle preset, and parallax layers
- Location: `chapters/config.js`
- Contains: `CHAPTERS` object (keyed by `chapterId`), `PARTICLE_PRESETS`, `LAYER_LIBRARY`, `SITE_CONFIG`, and all exported getter functions
- Depends on: Nothing (pure data + utility functions)
- Used by: `script.js` via named imports

**Application Logic Layer:**
- Purpose: Orchestrates chapter lifecycle: manifest loading, content fetching, effect setup, navigation, and user interactions
- Location: `script.js`
- Contains: `AudioController` class, `ParticleController` class, and all chapter lifecycle functions inside a single `DOMContentLoaded` handler
- Depends on: `chapters/config.js`, `chapters/index.json` (manifest), GSAP/ScrollTrigger/tsParticles (optional, gracefully degraded), `localStorage`
- Used by: Browser (loaded as ES module via `<script type="module">`)

**Content Layer:**
- Purpose: Per-chapter HTML fragments injected into `#chapter-container` on demand
- Location: `chapters/ch01.html` through `chapters/ch15.html`
- Contains: Semantic HTML structured with `.chapter`, `.book-section`, `.chapter-title`, `.poetic-text`, `.bold-grow-*`, `.staggered-indent`, `.centered-text`, `.date-location`, `.pov-marker` classes
- Depends on: Nothing (inert HTML fragments, no scripts)
- Used by: `script.js` via `fetch()` + `innerHTML` injection

**Manifest Layer:**
- Purpose: Ordered list of chapters used to populate the dropdown and drive navigation
- Location: `chapters/index.json`
- Contains: Array of `{ id, file, title, number }` objects — 11 chapters currently
- Depends on: Nothing
- Used by: `script.js` at boot (`loadManifestAndBoot`)

**Style Layer:**
- Purpose: All visual presentation including dark mode, per-chapter theming via CSS custom properties, animation classes, and responsive layout
- Location: `styles.css`
- Contains: CSS custom properties (`--chapter-accent-color`, `--chapter-background-tint`, `--chapter-background-image`, `--chapter-transition-duration`), animation keyframes, component styles
- Depends on: Google Fonts CDN (4 typefaces: Alegreya Sans SC, BioRhyme, Annie Use Your Telescope, Cinzel Decorative)
- Used by: `index.html`

**Tooling Layer (offline only):**
- Purpose: One-time conversion of source `.docx` files to raw HTML, and validation of chapter HTML structure
- Location: `tools/convert-chapters.cjs`, `tools/validate-chapters.cjs`
- Contains: Node.js CommonJS scripts using `mammoth` for DOCX-to-HTML conversion
- Depends on: `mammoth` npm package, local filesystem paths
- Used by: Developers manually; not part of the served application

## Data Flow

**Boot sequence:**

1. Browser loads `index.html`, which fetches GSAP + tsParticles from CDN and then `script.js` as an ES module
2. `DOMContentLoaded` fires in `script.js`; environment is detected (dev/prod, mobile, `prefers-reduced-motion`)
3. `AudioController` and `ParticleController` are instantiated; `localStorage` is read for saved chapter, scroll position, highlights, dark mode, and mute state
4. `loadManifestAndBoot` fetches `chapters/index.json`, populates the chapter `<select>` dropdown, and calls `showChapter` for the initial chapter
5. `showChapter` fetches the chapter HTML fragment, injects it into `#chapter-container`, then calls `setupChapterExperience`
6. `setupChapterExperience` calls config getters to apply CSS custom properties (theme), init parallax layers, run text animations, set up audio cue scroll listeners, and load particle effects

**Chapter navigation flow:**

1. User changes `<select>`, clicks Prev/Next, or code calls `showChapter(chapterId)`
2. Current chapter fades out (CSS class `fading-out` + CSS transition duration read from custom property)
3. `resetChapterEffects` runs all registered cleanup functions (kills ScrollTriggers, removes scroll listeners, disconnects IntersectionObservers, clears parallax DOM)
4. New chapter HTML is fetched (or served from `state.chapterCache` Map)
5. New chapter is injected and fades in; `setupChapterExperience` runs for the new chapter

**Audio cue scroll sync flow:**

1. Chapter loads with `lineCues` array from config (normalized via `normalizeCue`)
2. `collectLineAnchors` assigns sequential `data-line-number` attributes to all headings, paragraphs, and list items within `.book-section`
3. On each scroll event (throttled via `requestAnimationFrame`), `getViewportLineNumber` finds the element closest to 45% viewport height
4. `resolveCueForLine` matches the line number to a cue range; `calculateCueVolume` applies fade-in/fade-out gain envelopes
5. `AudioController.crossfadeTo` / `crossfadeAmbientTo` handle track switching with GSAP-animated volume transitions

**State Management:**
- Runtime state lives in a single `state` object inside the `DOMContentLoaded` closure: `{ chapterManifest, chapterCache, currentChapterId, cleanupFns, highlights }`
- Persistent state is stored in `localStorage`: `selectedChapter`, `scrollPosition`, `highlights`, `darkMode`, `audioMuted`
- No framework state management; no reactive bindings

## Key Abstractions

**`AudioController` class:**
- Purpose: Manages two primary audio elements in a double-buffer pattern for crossfading, plus a single ambient channel
- Examples: `script.js` lines 24–215
- Pattern: Active/standby swap — `activeMain` and `standbyMain` references are swapped after each crossfade so the previously active element becomes the next standby

**`ParticleController` class:**
- Purpose: Wraps tsParticles lifecycle (load/destroy) with chapter-aware preset selection and mobile particle-count capping
- Examples: `script.js` lines 217–272
- Pattern: Destroy-and-reload on chapter change; no incremental updates

**Chapter config getters:**
- Purpose: Pure functions that accept a `chapterId` string and return normalized config objects, with safe fallbacks to defaults
- Examples: `getChapterTheme`, `getAudioCues`, `getParticleConfig`, `getParticlePreset` — all in `chapters/config.js`
- Pattern: Spread merge with `DEFAULT_THEME` for theme; `normalizeCue` for audio cue normalization with sensible defaults

**`cleanupFns` registry:**
- Purpose: Allows ephemeral effects (ScrollTriggers, scroll listeners, IntersectionObservers) to register their own teardown via `registerCleanup(fn)` so chapter transitions can cleanly dispose all active effects
- Examples: `script.js` — `registerCleanup`, `resetChapterEffects`
- Pattern: Push-on-register, pop-all-on-reset

**Chapter HTML fragments:**
- Purpose: Self-contained content units that carry no logic — only semantic markup with prescribed CSS class names that `script.js` hooks into
- Examples: `chapters/ch01.html` through `chapters/ch15.html`
- Pattern: Root `.chapter` > multiple `.book-section` > paragraphs/headings/`.poetic-text`/`.bold-grow-*` spans

## Entry Points

**Browser entry point:**
- Location: `index.html`
- Triggers: Direct HTTP request; GitHub Pages serves this as the root
- Responsibilities: Load CDN dependencies, declare audio elements, define static DOM structure, load `script.js`

**Application init:**
- Location: `script.js` — `DOMContentLoaded` handler (line 274)
- Triggers: DOM ready
- Responsibilities: Wire all UI events, instantiate controllers, restore persisted state, boot chapter loading

**Configuration entry point:**
- Location: `chapters/config.js` — default export `chapterConfig` + named exports
- Triggers: Imported by `script.js` at module parse time
- Responsibilities: Provide all per-chapter data; nothing is fetched at runtime from this module

## Error Handling

**Strategy:** Fail-soft with user-visible fallback messages; audio/particle errors are silently logged in dev only

**Patterns:**
- `loadManifestAndBoot` wraps the entire boot sequence in try/catch; on failure, injects an error message into `#chapter-container` explaining the HTTP server requirement
- `showChapter` catches fetch errors and displays a tailored message including the failing filename
- `AudioController.crossfadeTo` / `crossfadeAmbientTo` catch browser autoplay blocks silently (logged as `debug` only)
- `ParticleController.updateForChapter` / `destroy` catch tsParticles errors silently
- Cleanup functions are individually wrapped in try/catch inside `resetChapterEffects`
- `highlightSelectedText` falls back to a text-search-and-re-apply strategy when `Range.surroundContents` throws (cross-node selections)

## Cross-Cutting Concerns

**Logging:** `Logger` object with `debug`, `info`, `error` methods; `debug` and `info` are suppressed unless `window.location.hostname` is localhost/127.0.0.1 or `?debug` query param is present

**Accessibility:** `prefers-reduced-motion` media query is checked at boot; when true, parallax is disabled and particles are skipped. ARIA labels are on all control buttons and the chapter selector.

**Responsiveness:** Mobile user agent detection caps particle count at 50; layout handled via CSS

**Progressive enhancement:** All animation and audio features degrade gracefully when GSAP, ScrollTrigger, or tsParticles are unavailable — fallbacks use `IntersectionObserver`, `requestAnimationFrame`-based scroll handlers, and direct volume assignment

---

*Architecture analysis: 2026-03-11*
