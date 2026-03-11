# Simplifier Hotspot Audit

**Audited:** 2026-03-11
**Files reviewed:** `script.js` (1,223 lines), `chapters/config.js` (834 lines), `styles.css` (389 lines)

---

## Priority Order

| # | Hotspot | File | Effort | Impact |
|---|---------|------|--------|--------|
| 1 | `destroyed` guard after each `await` | `script.js:882` | 5 min | Bug fix — silent incorrect behavior |
| 2 | Scroll save throttle | `script.js:1209` | 5 min | Perf — eliminates IO on every scroll tick |
| 3 | `onEnterViewport` helper | `script.js:506,664,756` | 30 min | −45 lines, DRY |
| 4 | `crossfadeAmbientTo` fade-out dedup | `script.js:141` | 20 min | Readability |
| 5 | Dead `.chapter-theme` CSS | `styles.css:109` | 2 min | Clean removal |
| 6 | `normalizeCue` endLine | `chapters/config.js:774` | 5 min | Readability |
| 7 | Remove `"type": "commonjs"` | `package.json` | 1 min | Removes confusion |

---

## Hotspot 1 — `destroyed` guard after each `await` (Bug Risk)

**File:** `script.js` lines 868–913
**Severity:** Medium — silent incorrect behavior on fast chapter navigation

`destroyed` is checked at entry but not after each `await`. If the user navigates away mid-crossfade, the audio crossfade continues to completion against the torn-down chapter.

```js
// Current — only one guard at top
const syncToViewportLine = async () => {
  if (destroyed) return;
  ...
  await audioController.crossfadeTo(...);          // destroyed can become true here
  await audioController.crossfadeAmbientTo(...);   // continues anyway
};
```

**Fix:** Add `if (destroyed) return` after every `await`:

```js
const syncToViewportLine = async () => {
  if (destroyed) return;
  const lineNumber = getViewportLineNumber(lineAnchors);
  const cue = resolveCueForLine(cues, lineNumber);
  if (!cue) { ... return; }
  if (cue.id !== lastCueId) {
    await audioController.crossfadeTo(cue.mainTrack, cue.crossfadeSeconds);
    if (destroyed) return;   // <-- add
    await audioController.crossfadeAmbientTo(cue.ambientTrack, cue.ambientCrossfadeSeconds);
    if (destroyed) return;   // <-- add
    lastCueId = cue.id;
  }
  ...
};
```

---

## Hotspot 2 — Scroll save throttle (Performance)

**File:** `script.js` lines 1209–1212
**Severity:** Medium — synchronous `localStorage.setItem` fires on every scroll tick

```js
// Current
window.addEventListener("scroll", () => {
  updatePageNumber();
  saveScrollPosition();  // synchronous IO on every tick
}, { passive: true });
```

**Fix:** Throttle the save to at most once per 500ms. `updatePageNumber` is cheap and can stay unthrottled:

```js
let scrollSaveTimer = false;
window.addEventListener("scroll", () => {
  updatePageNumber();
  if (!scrollSaveTimer) {
    scrollSaveTimer = true;
    setTimeout(() => { saveScrollPosition(); scrollSaveTimer = false; }, 500);
  }
}, { passive: true });
```

---

## Hotspot 3 — Repeated GSAP/IntersectionObserver dual-path (DRY)

**File:** `script.js` — `initParallax` (line 506), `setupPoetryTypewriter` (line 664), `setupBoldGrowAnimation` (line 756)
**Severity:** Low-Medium — ~45 lines of duplication across 3 functions

The same pattern appears three times:

```js
if (window.ScrollTrigger && window.gsap) {
  window.ScrollTrigger.create({ trigger: el, start: "top 85%", once: true, onEnter: callback });
} else {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { callback(); obs.disconnect(); } });
  }, { threshold: 0.2 });
  obs.observe(el);
  registerCleanup(() => obs.disconnect());
}
```

**Fix:** Extract a single helper:

```js
function onEnterViewport(element, callback, { once = false, threshold = 0.2, start = "top 85%" } = {}) {
  if (window.ScrollTrigger && window.gsap) {
    const trigger = window.ScrollTrigger.create({ trigger: element, start, once, onEnter: callback });
    registerCleanup(() => trigger.kill());
    return;
  }
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { callback(); if (once) obs.disconnect(); } });
  }, { threshold });
  obs.observe(element);
  registerCleanup(() => obs.disconnect());
}
```

Each of the three call sites becomes a single `onEnterViewport(el, animate, { once: true })` line.

---

## Hotspot 4 — `crossfadeAmbientTo` fade-out duplication (Readability)

**File:** `script.js` lines 141–205
**Severity:** Low-Medium — 65 lines for a 3-step operation; fade-out logic duplicated

The null-track path (lines 143–163) and the replace-track path (lines 169–184) both fade out the existing ambient track but neither calls the other. The GSAP/no-GSAP branching for the fade-out appears twice.

**Fix:** Extract `_fadeOutAmbient(duration)`:

```js
async _fadeOutAmbient(durationSeconds) {
  if (this.ambient.paused) return;
  if (window.gsap) {
    window.gsap.killTweensOf(this.ambient);
    await new Promise(resolve => {
      window.gsap.to(this.ambient, { volume: 0, duration: durationSeconds, ease: "power1.out", onComplete: resolve });
    });
  } else {
    this.ambient.volume = 0;
  }
  this.ambient.pause();
}
```

`crossfadeAmbientTo` then calls `await this._fadeOutAmbient(...)` in both paths and the duplication disappears.

---

## Hotspot 5 — Dead CSS rules (Clean Removal)

**File:** `styles.css` lines 109–117

```css
.chapter-theme[data-chapter="chapter1"] {
  --chapter-accent-color: #8fa4b8;
  --chapter-background-tint: rgba(36, 48, 67, 0.6);
}
.chapter-theme[data-chapter="chapter2"] {
  --chapter-accent-color: #7ea0a3;
  --chapter-background-tint: rgba(31, 53, 57, 0.62);
}
```

`applyTheme()` in `script.js` sets CSS custom properties directly via `document.documentElement.style.setProperty(...)`. The `data-chapter` attribute is set on `.book-container`, not `.chapter-theme`. These selectors never match anything in the DOM.

**Fix:** Delete both rule blocks.

---

## Hotspot 6 — `normalizeCue` endLine expression (Readability)

**File:** `chapters/config.js` lines 774–776

```js
// Current — two Infinity branches are identical
const endLine = cue?.endLine === null || cue?.endLine === undefined
  ? Infinity
  : (Number.isFinite(cue.endLine) ? Math.max(startLine, Math.floor(cue.endLine)) : Infinity);
```

**Fix:** Use `== null` to cover both null and undefined in one check:

```js
const rawEnd = cue?.endLine;
const endLine = (rawEnd == null || !Number.isFinite(rawEnd))
  ? Infinity
  : Math.max(startLine, Math.floor(rawEnd));
```

---

## Hotspot 7 — `package.json` `"type": "commonjs"` (Trivial)

**File:** `package.json`
**Severity:** Low — misleading, no runtime impact

The deployed code uses ES modules (`import`/`export` in `script.js` and `chapters/config.js`). The tools are explicitly `.cjs` and opt out of the `type` field via their extension. The `"type": "commonjs"` declaration contradicts the module system actually in use and would cause `node script.js` to fail.

**Fix:** Remove the `"type"` field entirely, or set `"type": "module"` if Node tooling needs to run the source files directly.

---

*Audit performed: 2026-03-11*
*Addresses Phase 8 (QUAL-01 through QUAL-07)*
