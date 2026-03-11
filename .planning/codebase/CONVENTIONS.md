# Coding Conventions

**Analysis Date:** 2026-03-11

## Naming Patterns

**Files:**
- HTML chapter files: `ch{NN}.html` (zero-padded two digits, e.g. `ch01.html`, `ch15.html`)
- Raw conversion output: `ch{NN}-raw.html` in `chapters/raw/`
- Tool scripts: kebab-case `.cjs` (e.g. `validate-chapters.cjs`, `convert-chapters.cjs`)
- Main entry files: lowercase flat names (`script.js`, `styles.css`, `index.html`)

**Functions (JavaScript — `script.js`, `chapters/config.js`):**
- Camelcase for all functions: `showChapter`, `fetchChapterMarkup`, `updateNavigationButtons`, `initializeDarkMode`
- Verb-noun pattern for action functions: `applyTheme`, `setupGiscus`, `resetChapterEffects`, `registerCleanup`
- Verb-noun-subject for setup functions scoped to a DOM element: `setupParagraphAnimations(chapterElement)`, `setupTitleAnimation(chapterElement)`, `setupPoetryTypewriter(chapterElement)`, `setupBoldGrowAnimation(chapterElement)`
- Getter functions in config: prefix `get` + noun: `getChapterTheme`, `getAudioTrack`, `getAudioCues`, `getParticlePreset`

**Variables:**
- camelCase throughout: `lineAnchors`, `groupedByParent`, `fadeOutTarget`, `durationSeconds`
- Boolean flags: descriptive adjective names: `isDev`, `isMobile`, `prefersReducedMotion`, `rafScheduled`, `destroyed`
- DOM element collections: named `elements` object with descriptive keys (e.g. `elements.chapterContainer`, `elements.prevButton`)
- Loop/iteration variables: full descriptive names, not `i`: `entry`, `chapter`, `layer`, `group`, `cue`, `paragraph`

**Constants (config.js):**
- SCREAMING_SNAKE_CASE for module-level constants: `DEFAULT_THEME`, `BASE_AUDIO`, `PARTICLE_PRESETS`, `LAYER_LIBRARY`, `SITE_CONFIG`
- Chapter IDs: camelCase string keys: `"chapter1"`, `"chapter2"`, `"chapter15"`
- Section IDs in HTML: `ch{N}-s{N}` format (e.g. `id="ch1-s1"`, `id="ch1-s2"`)

**CSS Classes:**
- kebab-case throughout: `.book-container`, `.chapter-title`, `.parallax-layer-bg`, `.bold-grow-1`, `.paragraph-fade`, `.fading-out`
- State modifier classes appended directly: `.fading-out`, `.fading-in`, `.is-visible`, `.hidden`, `.revealed`, `.visible`
- BEM-lite: base class + modifier suffix (e.g. `.parallax-layer`, `.parallax-layer-bg`, `.parallax-layer-mid`, `.parallax-layer-front`)

**Classes (JavaScript):**
- PascalCase: `AudioController`, `ParticleController`

## Code Style

**Formatting:**
- 2-space indentation in `script.js` and `chapters/config.js`
- 4-space indentation in `tools/convert-chapters.cjs` and `tools/validate-chapters.cjs` (tool files are inconsistent with main source)
- 4-space indentation in HTML files (`index.html`, chapter `.html` files)
- No trailing semicolons are absent (semicolons are used consistently in JS)
- Single quotes in CJS tool files; no quotes preference difference in ES module files (both patterns appear)

**Linting:**
- No ESLint or Prettier configuration files present in the project
- No `.editorconfig` detected
- `validate-chapters.cjs` enforces an HTML convention: inline `style=""` attributes are forbidden inside chapter content (`lintFormatting()` function)

## Import Organization

**ES Module (`script.js`):**
- Named imports grouped at top, single `import` statement from one module: `import chapterConfig, { SITE_CONFIG, getAmbientTrack, ... } from "./chapters/config.js"`
- No external library imports (libraries loaded via CDN `<script>` tags in `index.html`)
- Libraries accessed via `window.gsap`, `window.ScrollTrigger`, `window.tsParticles` — never assumed present without guard check

**CJS tool files:**
- `require()` at top: Node built-ins first (`fs`, `path`), then npm packages (`mammoth`)

**Path Aliases:**
- None — relative paths used throughout

## Error Handling

**Guard pattern before DOM operations:**
```javascript
if (!elements.chapterContainer || !elements.chapterSelector || !primaryAudio || ...) {
  Logger.error("Missing critical DOM elements. App initialization aborted.");
  return;
}
```

**try/catch on all async browser APIs that can throw:**
- `await audio.play()` always wrapped: `try { await this.standbyMain.play(); } catch (error) { ... }`
- `await this.instance.destroy()` always wrapped in `ParticleController.destroy()`
- `fetchChapterMarkup`: response status checked via `if (!response.ok) { throw new Error(...) }`
- JSON.parse in tools always wrapped

**Error message pattern:**
- Use `error?.message || error` when logging caught errors to safely handle both Error objects and raw strings:
  ```javascript
  Logger.debug("Ambient audio play blocked by browser", error?.message || error);
  ```

**Optional chaining used defensively:**
- `chapter?.audio?.mainTrack`, `cue?.endLine`, `theme.transitionDuration || chapterConfig.defaultTheme.transitionDuration`

**Cleanup functions registered for all side effects:**
- Every event listener, `IntersectionObserver`, `ScrollTrigger`, and interval added during chapter setup is registered via `registerCleanup(fn)` and torn down in `resetChapterEffects()` before the next chapter loads

## Logging

**Logger object (not `console` directly):**
```javascript
const Logger = {
  debug: (...args) => { if (isDev) { console.log("[DEBUG]", ...args); } },
  info:  (...args) => { if (isDev) { console.info("[INFO]", ...args); } },
  error: (...args) => { console.error("[ERROR]", ...args); }
};
```
- `Logger.debug` and `Logger.info`: dev-only (localhost or `?debug` query param)
- `Logger.error`: always visible in production
- Tool scripts (`validate-chapters.cjs`) use bare `console.log` with `[PASS]`/`[FAIL]`/`[SKIP]`/`[WARN]`/`[OK]`/`[ERROR]` prefixes

**`isDev` detection:**
```javascript
const isDev =
  window.location.hostname.includes("localhost") ||
  window.location.hostname === "127.0.0.1" ||
  new URLSearchParams(window.location.search).has("debug");
```

## Comments

**When to Comment:**
- Block comments used to explain non-obvious HTML structure in `index.html`: `<!-- Chapter content is injected dynamically by script.js. Development note: ... -->`
- Inline comments are absent in JS — code relies on descriptive naming instead
- No JSDoc or TSDoc — the project is plain JavaScript with no type tooling

## Function Design

**Size:** Functions are focused and small-to-medium. Large orchestration functions (`showChapter`, `setupChapterExperience`, `loadManifestAndBoot`) call smaller single-purpose helpers rather than being monolithic.

**Parameters:** Descriptive parameter names always. Default parameter values used for optional timing arguments: `crossfadeTo(trackName, durationSeconds = 1.5)`, `setMainVolume(volume, durationSeconds = 0.25)`.

**Return Values:**
- Early return used as guard pattern — functions return `null` or `void` early rather than nesting:
  ```javascript
  if (!trackName) { this.pauseMain(); return; }
  if (this.currentTrack === trackName && !this.activeMain.paused) { return; }
  ```
- Async functions return `Promise<void>` implicitly; no explicit return type annotations

**`void` operator for fire-and-forget async:**
```javascript
void syncToViewportLine();
```
Used to explicitly signal an async call's return value is intentionally discarded.

## Module Design

**Exports (`chapters/config.js`):**
- Named exports for all public functions and constants: `export function getChapterTheme(...)`, `export const PARTICLE_PRESETS`
- Default export is a config summary object: `export default chapterConfig`
- Internal helpers (e.g. `normalizeCue`, `clamp01`, `DEFAULT_THEME`) are NOT exported — module-private by declaration

**No Barrel Files:**
- Single config module; `script.js` imports directly from `./chapters/config.js`

## HTML Chapter Conventions

**Required structure per chapter file:**
```html
<div class="chapter" id="chapterN">
  <section id="chN-sN" class="book-section">
    <p class="date-location">...</p>
    <h2 class="chapter-title">...</h2>
    ...
  </section>
</div>
```

**Enforced by `validate-chapters.cjs`:**
- Must have `<div class="chapter" id="chapterN">` wrapper
- Must have `class="chapter-title"` element
- Section IDs must use `chN-s` format (bare `id="section1"` is a lint failure)
- Inline `style=""` attributes forbidden inside chapter content

**CSS class vocabulary for chapter authors:**
- `.poetic-text` — poetry blocks (animated stagger on scroll)
- `.bold-grow-1` through `.bold-grow-4` — inline emphasis with scale animation
- `.centered-text` — centered paragraph
- `.right-aligned` — right-aligned paragraph
- `.staggered-indent` — indented stanza block
- `.date-location` — excluded from paragraph fade animation
- `.pov-marker` — point-of-view attribution

---

*Convention analysis: 2026-03-11*
