# Feature Research

**Domain:** Immersive web book / cinematic digital storytelling
**Researched:** 2026-03-10
**Confidence:** HIGH (visual/audio/architecture), MEDIUM (typography controls, accessibility)

---

## Existing Features (Already Built — Do Not Rebuild)

These are already present in the codebase and must be preserved:

| Feature | Status | Notes |
|---------|--------|-------|
| Chapter navigation (prev/next/dropdown) | Done | script.js lines 120-135 |
| Per-section audio trigger via IntersectionObserver | Done | section→song map, 0.5 threshold |
| Dark mode toggle with localStorage | Done | CSS transition 0.3s |
| Text highlighting with localStorage persistence | Done | Uses `<mark>` + TreeWalker |
| Scroll position memory | Done | localStorage, restored on load |
| Page number + chapter footer display | Done | Scroll-driven, cumulative pages |
| Multiple character fonts (Cinzel Decorative for Harley, Annie for margin notes, BioRhyme for quotes) | Done | Already serves the story well |

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features readers expect from a cinematic web book. Missing any of these and the experience feels unfinished or amateurish.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Per-chapter background color / atmosphere shift | Readers of immersive fiction expect entering a new chapter to feel physically different — color is the fastest signal | LOW | CSS custom properties per chapter `data-theme` attribute; one object per chapter |
| Scroll-triggered fade-in for paragraphs | Standard in any literary web experience since 2020; static text that just sits there feels dead | LOW | IntersectionObserver already in codebase — add `opacity: 0 → 1` CSS class toggle |
| Audio crossfade between sections/chapters | Hard audio cuts when scrolling between sections break immersion immediately; current code does a hard src swap | MEDIUM | Web Audio API GainNode fade-out/fade-in over ~1.5s; or two `<audio>` elements alternating |
| Smooth chapter transition animation | Clicking next chapter and having content snap is jarring; a fade or dissolve is expected | LOW | CSS `opacity` transition on `.chapter` show/hide, ~400ms |
| Reading progress indicator within chapter | Readers want to know where they are; no progress = anxiety about length | LOW | Fixed thin progress bar at top or bottom, driven by `scrollY / scrollHeight` |
| Mobile-responsive layout with effects preserved | 60%+ of readers will be on phones; losing all visual atmosphere on mobile is a failure | MEDIUM | Reduce particle count on mobile via `matchMedia`, avoid `background-attachment: fixed` (breaks iOS entirely) |
| Mute/unmute that actually works on mobile | Mobile browsers block autoplay; current code handles this but needs graceful fallback messaging | LOW | Already partially handled; add a visible "Tap to enable audio" prompt on first load |

### Differentiators (Competitive Advantage)

Features that make this book site genuinely memorable — the things that get shared, that stick in a reader's memory, and that no generic WordPress book site has.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Per-chapter particle systems (snow, embers, dust, stars) | Gives each chapter a physical world — Chapter 1's grey Olympia morning can have slow ash-fall; Chapter 2's Nico chapter could have clinical sterile nothing, or precise geometric particles that mirror his OCD | MEDIUM | Canvas element with `requestAnimationFrame`; particle type/density/speed defined in chapter theme config object |
| Parallax multi-layer backgrounds per chapter | Depth separates this from a styled blog; layers moving at different speeds make the text feel embedded in a world | MEDIUM | CSS `transform: translateY()` driven by `scrollY`; 2-3 layers max; avoid `background-attachment: fixed` |
| Scroll-triggered text effects for poetic/key passages | The existing bold-grow classes and staggered-indent already show the author understands typography as narrative — systematize this as scroll-reveal | LOW-MEDIUM | Add `data-reveal="fade-up"` or `data-reveal="typewriter"` attributes; IntersectionObserver triggers class; typewriter is JS character-by-character |
| Typewriter reveal for poetry and interior monologue | The "Hold, Shiver, Release" poetic block and margin-note dialogue deserve to appear letter-by-letter as the reader reaches them — it forces them to slow down | MEDIUM | Vanilla JS character timer on `.poetic-text` and `.book-section blockquote`; speed configurable per block |
| Chapter theme config system (one object per chapter) | Extensibility is a core constraint — the author will add many chapters; hard-coding CSS per chapter is a maintenance trap | MEDIUM | `const CHAPTER_THEMES = { chapter1: { bg, particleType, particleColor, accent, audioFade }, ... }` — apply via JS on chapter load |
| Ambient sound layer separate from score | The current system plays one music file per section; adding a second quiet ambient layer (rain, room hum, library white noise) creates spatial depth without replacing the music | MEDIUM | Second `<audio>` element with independent volume; ambient defined per chapter in theme config |
| Chapter-specific accent color for UI chrome | Nav bar, progress bar, and highlights should shift to match the chapter's palette — makes the UI feel like it belongs to the story, not like a generic reader bolted onto it | LOW | CSS custom property `--accent` set on `body` or `[data-chapter]` when chapter loads |
| Reduced-motion fallback | `prefers-reduced-motion` support is expected by accessibility-aware readers; it also avoids nausea complaints | LOW | `@media (prefers-reduced-motion: reduce)` disables parallax and particle animation; content remains readable |
| Estimated reading time per chapter | Sets expectations; readers with limited time decide whether to start; adds a subtle sense of the chapter's weight | LOW | Word count divided by 200 WPM; display in chapter header or nav dropdown |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem compelling for an immersive experience but consistently hurt it.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| Scrolljacking (taking over scroll velocity/direction) | "It feels cinematic in demos" | NN/G research: users lose control, text comprehension drops, mobile is unusable, skip-back is impossible | Use scroll-linked animations that respond to scroll without blocking it — reader controls pace |
| Full-screen video chapter backgrounds | Dramatic visual impact | GitHub Pages has no CDN or streaming; video files are large; mobile bandwidth kills it; battery drain; the constraint is explicitly Out of Scope in PROJECT.md | High-quality CSS gradients + particles + parallax achieve similar atmosphere at 1% of the file size |
| Autoplay audio with no user interaction | Immediate immersion | Modern browsers block it on page load without user gesture; on mobile it is always blocked; forces a broken experience before the reader even starts | Use the first chapter navigation click or first scroll past a threshold as the audio unlock gesture — already partially done |
| Infinite scroll / all-chapters-on-one-page | "Seamless reading experience" | Performance degrades as DOM grows; current multi-chapter architecture would need a rewrite; highlights/audio/position memory all break | Keep chapter-per-view; focus on smooth chapter transitions |
| Comments / Giscus integration | Reader discussion | The current `index.html` has a Giscus placeholder with unconfigured `[REPLACE_WITH...]` values — shipping it is worse than not having it; it adds external script weight | Configure Giscus properly when ready for public launch, not before |
| Font size / typography user controls panel | Accessibility compliance | The existing font system is tightly woven into the narrative (different characters have different fonts); a generic "increase font size" slider conflicts with the author's intentional typographic choices | Respect system font-size preferences via `rem` units; test at 200% zoom |
| Chapter-to-chapter crossfade of backgrounds | "Seamless world transition" | When done as a slow full-page crossfade, it delays navigation and feels like loading; readers want to be in the next chapter, not in a limbo state | Instant chapter switch + fast fade-in of new chapter's atmosphere (200ms) is more satisfying than a 1-2s crossfade |

---

## Feature Dependencies

```
[Chapter Theme Config Object]
    └──required by──> [Per-chapter particle systems]
    └──required by──> [Per-chapter parallax backgrounds]
    └──required by──> [Per-chapter accent color (UI chrome)]
    └──required by──> [Ambient sound layer]

[Audio Crossfade]
    └──requires──> [Web Audio API or dual <audio> elements]
    └──enhances──> [Chapter theme config] (fade duration defined per theme)

[IntersectionObserver (existing)]
    └──already enables──> [Scroll-triggered fade-in for paragraphs]
    └──already enables──> [Typewriter reveal for poetry]
    └──already enables──> [Audio trigger per section]

[Mobile responsiveness]
    └──constrains──> [Particle density] (reduce on mobile)
    └──constrains──> [Parallax technique] (no background-attachment: fixed)

[Reduced-motion media query]
    └──disables──> [Particles]
    └──disables──> [Parallax]
    └──disables──> [Typewriter effect] (show text immediately instead)

[Reading progress indicator]
    └──independent of other features] (pure scroll math)

[Chapter accent color]
    └──enhances──> [Reading progress indicator] (bar uses accent color)
    └──enhances──> [Text highlighting] (highlight color matches chapter palette)
```

### Dependency Notes

- **Chapter Theme Config is the foundational piece:** Every visual differentiator (particles, parallax, accent colors, ambient audio) must read from the same config object. Build the config system before building any individual effect, or you will hard-code chapter-specific values and create a maintenance trap the author cannot extend.
- **IntersectionObserver is already the right pattern:** The existing codebase uses it for audio triggers. Extend it (do not replace it) for text fade-in and typewriter effects — the observer can dispatch multiple behaviors per element via `data-` attributes.
- **Audio crossfade does not require the Web Audio API:** Two `<audio>` elements with JS-driven `volume` property fade (via `setInterval` or `requestAnimationFrame`) is simpler, requires no API unlock, and works across all browsers. Web Audio API adds complexity for marginal gain here.
- **Parallax and background-attachment: fixed are incompatible with iOS Safari:** This is a hard browser bug, not a preference. Use `transform: translateY()` driven by a scroll listener instead.

---

## MVP Definition

The site already has table stakes reading features. The MVP for the cinematic milestone is the minimum set that transforms it from "styled blog" to "world you step into."

### Launch With (v1 — Cinematic Milestone)

- [ ] **Chapter Theme Config object** — defines palette, particle type, accent color, audio crossfade duration per chapter; all other features read from it
- [ ] **Per-chapter background atmosphere** — CSS custom properties applied from theme config on chapter load; color, gradient, or subtle texture
- [ ] **Scroll-triggered paragraph fade-in** — extend existing IntersectionObserver; paragraphs start `opacity: 0` and fade up on enter
- [ ] **Audio crossfade** — replace hard src swap with 1.5s fade-out/fade-in using dual `<audio>` or volume ramp
- [ ] **Smooth chapter transition** — 250ms opacity fade on chapter show/hide; prevents the snap
- [ ] **Chapter accent color applied to UI chrome** — nav bar, progress bar, highlight color all shift with chapter
- [ ] **Reading progress bar** — thin fixed bar, accent-colored, scroll-driven
- [ ] **Mobile particle/parallax reduction** — `matchMedia` check; cut particle count to 20% on mobile, skip parallax

### Add After Validation (v1.x)

- [ ] **Particle systems per chapter** — add after atmosphere colors are confirmed working; particles are the polish, not the foundation
- [ ] **Parallax multi-layer backgrounds** — add once chapter theme config is locked; needs careful mobile testing
- [ ] **Typewriter reveal for poetic passages** — add to `.poetic-text` blocks after scroll-fade is working; same observer infrastructure
- [ ] **Estimated reading time per chapter** — low effort, add when chapter dropdown is styled
- [ ] **Ambient sound layer (second audio)** — add after crossfade is solid; adds depth without replacing music

### Future Consideration (v2+)

- [ ] **Giscus discussion integration** — only when publishing publicly and repo is configured
- [ ] **Reduced-motion full audit** — systematic pass once all animations exist
- [ ] **Chapter-specific loading screen / title card** — cinematic chapter entry; high effort, high reward, not needed for early readers

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Chapter Theme Config system | HIGH | MEDIUM | P1 |
| Per-chapter background atmosphere | HIGH | LOW | P1 |
| Scroll-triggered paragraph fade-in | HIGH | LOW | P1 |
| Audio crossfade | HIGH | MEDIUM | P1 |
| Smooth chapter transition | HIGH | LOW | P1 |
| Chapter accent color on UI chrome | MEDIUM | LOW | P1 |
| Reading progress bar | MEDIUM | LOW | P1 |
| Mobile reduction (particles/parallax) | HIGH | LOW | P1 |
| Particle systems per chapter | HIGH | MEDIUM | P2 |
| Parallax backgrounds | HIGH | MEDIUM | P2 |
| Typewriter reveal for poetry | MEDIUM | MEDIUM | P2 |
| Estimated reading time | LOW | LOW | P2 |
| Ambient sound layer | MEDIUM | MEDIUM | P2 |
| Giscus configuration | LOW | LOW | P3 |
| Chapter title card / loading screen | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Required for the cinematic milestone to feel complete
- P2: Meaningful enhancement; add in the milestone after core is working
- P3: Worthwhile but not part of this milestone

---

## Competitor / Reference Feature Analysis

| Feature | Immerziva | The Spark (Codrops 2026) | This Project |
|---------|-----------|--------------------------|--------------|
| Audio sync to reading | Ambient audio synced to pace | Sound reacts to scroll speed | Per-section audio via IntersectionObserver (done) — crossfade needed |
| Visual atmosphere per chapter | Not applicable (audio focus) | Architecture-driven color shifts (warm lower / cold upper) | Per-chapter CSS theme config |
| Particle / environmental effects | None noted | Not applicable (3D scene) | Canvas particle system per chapter |
| Parallax | Not applicable | Full 3D scroll-driven camera | CSS `transform: translateY()` multi-layer |
| Typography as narrative | Not applicable | Two-state type system (machine → human) | Already strong (Cinzel for Harley, Annie for margin notes) — formalize as scroll-triggered reveals |
| Mobile | Not evaluated | Performance-first design (one scene loaded at a time) | `matchMedia` reductions needed |

---

## Critical Implementation Notes

**What the existing code does well that must be preserved:**
1. The IntersectionObserver at 0.5 threshold is well-tuned — do not change it when extending
2. The character-specific fonts (Cinzel Decorative for Harley's dialogue, Annie Use Your Telescope for margin notes) are doing real narrative work — any text animation system must skip these or handle them as special cases
3. The `bold-grow-1` through `bold-grow-4` pattern in Chapter 1 and the font-weight escalation in Chapter 2's light switch scene are already scroll-naive (they're always present) — consider whether these specific passages benefit from scroll-reveal or whether they should always be visible as the author intended

**What the debug log system means:**
The `#debug-log` div renders in the bottom-right in production. This must be removed or hidden before any public-facing release. It is not a feature — it is scaffolding.

---

## Sources

- [The Spark: Engineering an Immersive Story-First Web Experience — Codrops, Jan 2026](https://tympanus.net/codrops/2026/01/09/the-spark-engineering-an-immersive-story-first-web-experience/)
- [Scrolljacking 101 — Nielsen Norman Group](https://www.nngroup.com/articles/scrolljacking-101/)
- [Complete Scrollytelling Guide 2025 — UI Deploy](https://ui-deploy.com/blog/complete-scrollytelling-guide-how-to-create-interactive-web-narratives-2025)
- [Responsive Scrollytelling Best Practices — The Pudding](https://pudding.cool/process/responsive-scrollytelling/)
- [Scrollytelling on Steroids with Scroll-State Queries — CSS-Tricks](https://css-tricks.com/scrollytelling-on-steroids-with-scroll-state-queries/)
- [Immerziva: Transform Reading into a Cinematic Experience — Product Hunt](https://www.producthunt.com/products/immerziva)
- [10 Best Reading Progress Indicators — jQuery Script](https://www.jqueryscript.net/blog/best-reading-progress-indicator.html)

---

*Feature research for: Immersive Web Book — Cinematic Milestone*
*Researched: 2026-03-10*
