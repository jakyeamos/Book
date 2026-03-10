# Architecture Research

**Domain:** Immersive single-page web book — per-chapter visual/audio theming
**Researched:** 2026-03-10
**Confidence:** HIGH (pattern well-established; verified against MDN, web.dev, CSS-Tricks)

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    CHAPTER CONFIG LAYER                          │
│  chapters/config.js — one object per chapter, no logic          │
│  { id, audio, palette, particles, parallax, animations }        │
└──────────────────────────┬──────────────────────────────────────┘
                           │ imported by
┌──────────────────────────▼──────────────────────────────────────┐
│                   THEME ENGINE (theme.js)                        │
│  Receives chapter ID → reads config → applies CSS vars          │
│  Sets data-chapter attr on <body>                               │
│  Notifies subsystems via custom events                          │
└────┬───────────────┬──────────────┬──────────────┬──────────────┘
     │               │              │              │
     ▼               ▼              ▼              ▼
┌─────────┐  ┌────────────┐  ┌──────────┐  ┌────────────────┐
│ audio   │  │ particles  │  │parallax  │  │scroll-animate  │
│ .js     │  │ .js        │  │ .js      │  │ .js            │
│         │  │            │  │          │  │                │
│ Listens │  │ Listens    │  │Listens   │  │Listens         │
│ for     │  │ for        │  │for       │  │for             │
│ chapter │  │ chapter    │  │chapter   │  │chapter         │
│ change  │  │ change     │  │change    │  │change          │
│ event   │  │ event      │  │event     │  │event           │
└────┬────┘  └─────┬──────┘  └────┬─────┘  └──────┬─────────┘
     │              │             │               │
     └──────────────┴─────────────┴───────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────────┐
│                   EXISTING script.js                             │
│  Navigation, highlighting, scroll memory, page numbers          │
│  Dispatches chapterchange event — no other modification needed  │
└─────────────────────────────────────────────────────────────────┘
```

The critical design constraint: **existing script.js must not be rewritten**. New systems attach via a custom event that script.js dispatches at chapter switch time. Each subsystem is a self-contained module that listens for that event, reads its slice of the config, and manages its own DOM/canvas.

### Component Responsibilities

| Component | Responsibility | Communicates With |
|-----------|----------------|-------------------|
| `chapters/config.js` | Single source of truth for per-chapter theme data | Imported by theme.js only |
| `theme.js` | Applies CSS custom props, sets `data-chapter`, dispatches `chapterchange` | Owned by — drives all subsystems |
| `audio.js` | Web Audio API crossfade; replaces `<audio>` direct-play | Listens to `chapterchange` |
| `particles.js` | Canvas overlay, requestAnimationFrame loop, particle type dispatch | Listens to `chapterchange` |
| `parallax.js` | Fixed background layers; translates on scroll | Listens to `chapterchange`, window scroll |
| `scroll-animate.js` | IntersectionObserver for text reveal/typewriter on `.animate` elements | Self-initializing, refreshes on `chapterchange` |
| `script.js` (existing) | Navigation, highlights, page numbers, scroll memory | Dispatches `chapterchange` |

---

## Recommended Project Structure

```
Book/
├── index.html            # Unchanged structure; gains data-chapter="" on <body>
├── styles.css            # Gains CSS custom property declarations per [data-chapter]
├── script.js             # Minimal surgery: add dispatchEvent call at showChapter()
│
├── chapters/
│   └── config.js         # Chapter theme config objects — the only file touched per new chapter
│
└── modules/
    ├── theme.js           # Applies config to DOM; central dispatcher
    ├── audio.js           # Crossfade engine replacing direct audio.src swap
    ├── particles.js       # Canvas particle system with per-chapter presets
    ├── parallax.js        # Background layer parallax
    └── scroll-animate.js  # IntersectionObserver text animations
```

### Structure Rationale

- **`chapters/config.js`:** Isolates all per-chapter authoring decisions. Adding chapter 10 means adding one object here and nowhere else.
- **`modules/`:** Each file owns exactly one visual concern. Failures are isolated; subsystems can be disabled independently.
- **No build step required:** All files loaded as `<script type="module">` or plain `<script>` tags in index.html. GitHub Pages serves them without compilation.

---

## Architectural Patterns

### Pattern 1: CSS Custom Properties Driven by `data-chapter`

**What:** A `data-chapter="chapter1"` attribute on `<body>` acts as a selector hook. CSS rules scoped to `[data-chapter="chapter1"]` define CSS custom property values for that chapter. Components use `var(--chapter-bg)`, `var(--chapter-accent)`, etc. — never hardcoded values.

**When to use:** Anything visual that can be expressed as a CSS variable (colors, gradients, font choices, overlay opacity). This covers 80% of the per-chapter visual identity.

**Trade-offs:** Pure CSS cascade, zero JS repaint cost. Dark mode composes cleanly: `[data-chapter="chapter1"].dark-mode { --chapter-bg: #0a0a12; }`. The one limitation is that values that require JS logic (particle counts, audio files) cannot live here.

**Example:**
```css
/* styles.css — extend with chapter blocks */
[data-chapter="chapter1"] {
  --chapter-bg:        #f0ece4;
  --chapter-accent:    #8b6d4a;
  --chapter-text:      #1a1a1a;
  --chapter-overlay:   rgba(139, 109, 74, 0.04);
}

[data-chapter="chapter2"] {
  --chapter-bg:        #0d0d14;
  --chapter-accent:    #4a6b8b;
  --chapter-text:      #e8e8f0;
  --chapter-overlay:   rgba(74, 107, 139, 0.08);
}

/* Dark mode composes: chapter accent holds, bg deepens */
[data-chapter="chapter1"].dark-mode {
  --chapter-bg:        #1a1510;
}
```

**Confidence:** HIGH — MDN-documented, baseline browser support since 2016.

---

### Pattern 2: Chapter Config Object as the Single Source of Truth

**What:** Every chapter's non-CSS data (audio file, particle preset, parallax image URL, animation class list) lives in one exported object in `chapters/config.js`. No other file contains chapter-specific literals.

**When to use:** Always. This is the extensibility guarantee: adding a chapter requires touching exactly one file.

**Trade-offs:** Slightly more upfront design work to define the schema. Worth it unconditionally given the stated goal of "adding a new chapter = one config object."

**Example:**
```js
// chapters/config.js
export const CHAPTERS = {
  chapter1: {
    audio:      'Eva_Angelina.mp3',
    dataChapter: 'chapter1',
    particles: {
      type:    'dust',       // 'dust' | 'snow' | 'embers' | 'stars' | 'none'
      count:   60,
      color:   '#8b6d4a',
    },
    parallax: {
      layers: [
        { src: 'assets/ch1/fog.png', speed: 0.15 },
        { src: 'assets/ch1/city.png', speed: 0.4 },
      ]
    },
    animations: ['fade-up', 'reveal'],  // classes to activate IntersectionObserver for
  },
  chapter2: {
    audio:      'Mojo_Pin.mp3',
    dataChapter: 'chapter2',
    particles: {
      type:    'stars',
      count:   120,
      color:   '#4a6b8b',
    },
    parallax: {
      layers: [
        { src: 'assets/ch2/night.png', speed: 0.2 },
      ]
    },
    animations: ['fade-up', 'typewriter'],
  },
};
```

**Confidence:** HIGH — established data-driven config pattern, no external dependencies.

---

### Pattern 3: Custom Event Bus for Subsystem Coordination

**What:** `script.js`'s `showChapter()` function gets a single addition: it dispatches a `chapterchange` CustomEvent on `document` with the chapter ID as detail. Every new module listens for this event independently. The existing file's logic is otherwise untouched.

**When to use:** Any time new functionality needs to react to chapter navigation without coupling to script.js internals.

**Trade-offs:** Loose coupling means modules cannot accidentally break each other or script.js. The downside is that the event fires asynchronously — if a subsystem needs to complete before the chapter appears, use `display:none` CSS transitions rather than event timing.

**Minimal surgery on script.js:**
```js
// Inside the existing showChapter() function, add ONE line after chapter display logic:
document.dispatchEvent(new CustomEvent('chapterchange', { detail: { chapterId } }));
```

Each module then:
```js
// modules/audio.js (example listener)
import { CHAPTERS } from '../chapters/config.js';
document.addEventListener('chapterchange', (e) => {
  const config = CHAPTERS[e.detail.chapterId];
  if (config) crossfadeTo(config.audio);
});
```

**Confidence:** HIGH — CustomEvent is baseline, MDN-documented.

---

### Pattern 4: Canvas Particle System with Lifecycle Management

**What:** A single `<canvas id="particle-canvas">` element lives behind the book container (z-index lower than content). The particle module manages its own requestAnimationFrame loop. On `chapterchange`, it tears down current particles, reads the new config, and starts a new loop for the new particle type.

**When to use:** Any per-chapter ambient effect (snow, embers, dust motes, stars).

**Trade-offs:** Canvas is GPU-composited and does not trigger layout reflow. The risk is on low-end mobile: cap particle count at 30 for the `particles.count` value on mobile (use `window.matchMedia('(max-width: 768px)')` check at init time). Do not use DOM nodes for particles — canvas-only.

**Lifecycle pattern:**
```js
// modules/particles.js
let animationId = null;

function teardown() {
  if (animationId) cancelAnimationFrame(animationId);
  // clear canvas
}

function setup(config) {
  teardown();
  if (config.particles.type === 'none') return;
  const count = window.matchMedia('(max-width: 768px)').matches
    ? Math.min(config.particles.count, 30)
    : config.particles.count;
  // initialize particle array, start loop
}

document.addEventListener('chapterchange', (e) => {
  setup(CHAPTERS[e.detail.chapterId]);
});
```

**Confidence:** HIGH — requestAnimationFrame + canvas pattern is universally supported.

---

### Pattern 5: IntersectionObserver for Scroll-Triggered Text Animations

**What:** Elements in HTML that should animate on scroll carry a class like `animate fade-up` or `animate typewriter`. `scroll-animate.js` creates one IntersectionObserver on init. When an element crosses 15% visibility, it adds an `is-visible` class. CSS handles the actual transition. On `chapterchange`, the observer is disconnected and re-established for the newly visible chapter's content.

**When to use:** All text reveal effects (fade-in, slide-up, typewriter for poetry blocks). Do not trigger on scroll event directly — IntersectionObserver is async and does not block the main thread.

**Note on CSS scroll-driven animations (`animation-timeline`):** As of early 2026, `animation-timeline: view()` is supported in Chrome/Chromium and Safari 26, but not Firefox. For this project, IntersectionObserver is the correct choice — it works everywhere and is already proven in the existing codebase (the existing audio section observer uses the same API).

**Confidence:** HIGH — existing codebase already uses IntersectionObserver for audio. This extends the same pattern.

---

### Pattern 6: Parallax via CSS Transform on Scroll (Not background-position)

**What:** Parallax layers are `<div>` elements with `position: fixed` (or `position: absolute` within a positioned container), placed behind the book text. On `window.scroll`, `requestAnimationFrame` is used to batch transform updates: `layer.style.transform = translateY(scrollY * speed)`. Use `will-change: transform` on layers.

**When to use:** Per-chapter atmospheric background layers.

**Trade-offs:** `transform: translateY()` is composited by the GPU and does not trigger layout or paint. Never use `background-position` or `top`/`margin` for parallax — these cause layout reflow on every scroll frame.

**On chapter switch:** Fade out current layers, swap `src` attributes, fade in. This is a CSS `opacity` transition on the layer container.

**Confidence:** HIGH — GPU compositing of transform is well-established.

---

## Data Flow

### Chapter Transition Flow

```
User clicks Next / selects dropdown
        ↓
script.js: navigateChapter() → showChapter(id)
        ↓
[existing] hides/shows .chapter divs, updates footer, saves localStorage
        ↓
[new: one line added] dispatchEvent(new CustomEvent('chapterchange', { detail: { chapterId: id } }))
        ↓
         ├──→ theme.js
         │      reads CHAPTERS[id]
         │      sets document.body.dataset.chapter = id
         │      CSS cascade picks up [data-chapter="id"] vars immediately
         │
         ├──→ audio.js
         │      crossfadeTo(CHAPTERS[id].audio) over 1.5s via Web Audio GainNode
         │
         ├──→ particles.js
         │      teardown() current loop
         │      setup(CHAPTERS[id].particles)
         │
         ├──→ parallax.js
         │      swap background layers, fade transition
         │
         └──→ scroll-animate.js
                re-observe elements in newly visible chapter
```

### Config to Visual System Flow

```
chapters/config.js  (authored data)
        ↓ import
theme.js            (reads full config, applies CSS vars + dispatches event)
        ↓ event detail carries chapterId
        ↓ each subsystem re-imports CHAPTERS[id] for its own slice
CSS vars             → body background, text color, accent colors
canvas               → particle type, count, color
DOM layers           → parallax image src, speed multipliers
IntersectionObserver → which animation classes to activate
Web Audio            → which audio file, crossfade timing
```

### State Storage

All persistent state stays in `localStorage` exactly as the existing code does it. No new state storage mechanisms are needed. The new systems are entirely driven by the chapter ID; they do not need to save their own state.

---

## Suggested Build Order

Build in this order. Each step is independently testable before the next.

| Order | System | Why This Position |
|-------|--------|-------------------|
| 1 | `chapters/config.js` schema | Everything depends on this; zero risk to existing code |
| 2 | `theme.js` + CSS custom properties | Visible immediately; proves the data-chapter mechanism works; no moving parts |
| 3 | `script.js` event dispatch (one line) | Gates all subsystems; proves the event bus works |
| 4 | `audio.js` crossfade | Replaces existing hard-swap; directly perceptible; no visual interference |
| 5 | `scroll-animate.js` | Uses same IntersectionObserver pattern already in codebase; low risk |
| 6 | `parallax.js` | Requires assets; visual; test in isolation against a single chapter first |
| 7 | `particles.js` | Most complex runtime system; build last after all simpler systems are stable |

---

## Anti-Patterns

### Anti-Pattern 1: Chapter Logic Scattered Across Multiple Files

**What people do:** Add `if (chapterId === 'chapter3') { ... }` blocks inside audio.js, inside particles.js, and inside styles.css directly.

**Why it's wrong:** Adding chapter 10 requires searching and modifying 5 files. One missed location causes a silent bug. The stated project requirement — "adding a chapter = one config object" — becomes impossible.

**Do this instead:** All chapter-specific values live in `chapters/config.js` exclusively. Subsystems read from it. They contain zero chapter ID literals.

---

### Anti-Pattern 2: Modifying script.js Extensively

**What people do:** Refactor the existing script.js to add theme switching, particle management, and audio crossfade inline.

**Why it's wrong:** The existing file works and is the load-bearing foundation. A large refactor risks breaking navigation, highlight persistence, scroll memory, and the debug log — all validated, working features. The existing code also has non-trivial edge cases (highlight re-application, page offset computation) that are easy to accidentally break.

**Do this instead:** Add exactly one line to `showChapter()` (the CustomEvent dispatch). Everything else is additive in new files.

---

### Anti-Pattern 3: DOM Nodes for Particles

**What people do:** Create 100 `<div>` elements with CSS animation for particle effects.

**Why it's wrong:** Each DOM node participates in layout. 100 animated DOM nodes cause continuous reflow and are unusable on mid-range mobile. The GPU cannot composite them independently.

**Do this instead:** One `<canvas>` element, requestAnimationFrame loop, all particles as plain JS objects — never in the DOM.

---

### Anti-Pattern 4: `background-position` or `top` for Parallax

**What people do:** Update `element.style.backgroundPosition` or `element.style.top` in a scroll listener.

**Why it's wrong:** These properties trigger layout recalculation on every scroll event, causing jank. On 60fps scroll, this is 60 layout recalculations per second.

**Do this instead:** `element.style.transform = 'translateY(Xpx)'`. The browser composites transforms on the GPU without layout recalculation.

---

### Anti-Pattern 5: Replacing `<audio>` Element Immediately

**What people do:** On chapter switch, immediately set `audio.src = newFile` and call `audio.play()`. This is what the current code does and it causes an audible cut.

**Why it's wrong:** The hard cut is jarring in a cinematic reading experience, especially mid-sentence.

**Do this instead:** Web Audio API with two `AudioBufferSourceNode`s and two `GainNode`s. Fade out the current gain to 0 over 1.5 seconds while simultaneously fading in the new track from 0 to 1. The `<audio>` element can remain in the HTML for fallback but audio.js bypasses it with `AudioContext.createBufferSource()`.

---

## Integration Points

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `script.js` → subsystems | `CustomEvent('chapterchange')` on `document` | One-way; script.js does not import any new module |
| `chapters/config.js` → subsystems | ES module import | Config is read-only data; subsystems do not mutate it |
| `theme.js` → CSS | `document.body.dataset.chapter = id` | CSS does the rest via `[data-chapter]` selectors |
| `parallax.js` ↔ scroll | `window.addEventListener('scroll', handler)` | Throttled via `requestAnimationFrame` flag |
| `particles.js` → canvas | Direct canvas 2D context calls | No DOM interaction beyond the single canvas element |
| `scroll-animate.js` → content | `IntersectionObserver` on `.animate` elements | Adds `is-visible` class; CSS drives the transition |

### Composability with Dark Mode

Dark mode already applies a class on `<body>`. With the `data-chapter` attribute also on `<body>`, the selectors compose cleanly:

```css
/* Light, chapter 1 */
[data-chapter="chapter1"] { --chapter-bg: #f0ece4; }

/* Dark, chapter 1 — override only the properties that need to change */
[data-chapter="chapter1"].dark-mode { --chapter-bg: #1a1510; }
```

No JavaScript coordination needed between dark mode and chapter theming.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 2-5 chapters | Current architecture handles this with zero changes |
| 6-20 chapters | Split `config.js` into `chapters/chapter1.js`, etc., and re-export from an index — no subsystem changes |
| 20+ chapters | Consider lazy-loading audio and parallax assets per chapter using `import()` or `IntersectionObserver` on the chapter container; still no framework required |

### Mobile Performance Priority

The first bottleneck on mobile is the particle system. Cap `particles.count` at 30 on `max-width: 768px`. The second bottleneck is parallax with multiple large images — use single low-resolution layers on mobile by reading `window.matchMedia` in `parallax.js` config selection.

---

## Sources

- MDN: [Using CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties) — CSS variable scoping, `data-attribute` selector pattern
- MDN: [CustomEvent API](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent) — event bus pattern
- MDN: [GainNode / Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/GainNode) — crossfade architecture
- MDN: [LinearRampToValueAtTime](https://developer.mozilla.org/en-US/docs/Web/API/AudioParam/linearRampToValueAtTime) — crossfade timing
- web.dev: [Getting started with Web Audio API](https://web.dev/articles/webaudio-intro) — AudioContext setup
- webaudioapi.com: [Crossfading Playlist sample](https://webaudioapi.com/samples/crossfade-playlist/) — crossfade playlist pattern
- CSS-Tricks: [A Complete Guide to Custom Properties](https://css-tricks.com/a-complete-guide-to-custom-properties/) — cascade and specificity rules
- MDN: [CSS scroll-driven animations](https://developer.mozilla.org/en-US/docs/Web/CSS/Guides/Scroll-driven_animations) — browser support status
- caniuse.com: [animation-timeline: scroll()](https://caniuse.com/mdn-css_properties_animation-timeline_scroll) — Firefox gap confirmed
- freecodecamp.org: [Scroll animations with Intersection Observer](https://www.freecodecamp.org/news/scroll-animations-with-javascript-intersection-observer-api/) — observer pattern
- sparticles (GitHub): [simeydotme/sparticles](https://github.com/simeydotme/sparticles) — reference for canvas particle performance patterns
- ab-particles (GitHub): [asifbacchus/ab-particles](https://github.com/asifbacchus/ab-particles) — vanilla JS particle + CSS theming integration example

---

*Architecture research for: Immersive Book Site — per-chapter visual theming on vanilla HTML/CSS/JS*
*Researched: 2026-03-10*
