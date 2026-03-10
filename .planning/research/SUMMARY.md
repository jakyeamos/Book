# Project Research Summary

**Project:** Immersive Book Site — Cinematic Effects Layer
**Domain:** Vanilla static web book with per-chapter visual/audio theming
**Researched:** 2026-03-10
**Confidence:** HIGH

## Executive Summary

This is a cinematic layer built on top of a working vanilla HTML/CSS/JS book site hosted on GitHub Pages. The existing codebase is mature and functional — it has chapter navigation, per-section audio, dark mode, text highlighting, scroll position memory, and character-specific fonts that do real narrative work. The task is not to rebuild the site but to add a layer of immersive atmosphere (parallax backgrounds, particle systems, audio crossfade, scroll-triggered text reveals) without disturbing what already works. The correct approach is additive: a single-line event dispatch in the existing `showChapter()` function unlocks a custom event bus that new, isolated modules listen to independently. The existing `script.js` is otherwise untouched.

The recommended stack is deliberately minimal given the no-build-step constraint. GSAP (core + ScrollTrigger + SplitText) handles all animation needs and is now fully free following Webflow's acquisition. tsParticles slim bundle provides canvas-based particle systems. Web Audio API (native, no CDN) enables proper crossfading via GainNode scheduling. CSS Custom Properties on a `data-chapter` attribute handle per-chapter visual identity with zero runtime cost. The entire stack loads via CDN script tags — no npm, no bundler, no compilation.

The central organizing principle across all research is the Chapter Theme Config object: a single JavaScript object per chapter that contains every per-chapter value (palette, audio file, particle preset, parallax layers). Every other system reads from it. This is simultaneously the architecture recommendation, the primary pitfall prevention strategy, and the scalability guarantee. Build this first. Everything else is downstream of it.

---

## Key Findings

### Recommended Stack

The stack fits entirely within a no-build-step environment. GSAP 3.13+ (cdnjs) covers scroll animation, parallax, and per-character text effects — its ScrollTrigger plugin replaces any need for a separate scroll library, and SplitText (now free) handles the typewriter and stagger reveals the existing bold-grow typography already gestures toward. tsParticles slim bundle (cdnjs) is the actively maintained successor to the abandoned particles.js and supports multiple simultaneous instances with different configs per chapter. Web Audio API is native to all modern browsers and the only correct tool for crossfading — the ~30 lines of vanilla JS needed cost nothing to download and enable `linearRampToValueAtTime` scheduling that the current hard-src-swap pattern cannot match.

Critically, `background-attachment: fixed` must not be used for parallax — it is broken on iOS Safari and causes scroll jank on Android Chrome. All parallax must use `transform: translateY()` on positioned `<div>` elements. GSAP ScrollSmoother must be avoided as it hijacks native scroll and breaks the existing `window.scrollY`-based page tracking. ScrollMagic is deprecated. jQuery adds cost with no benefit given the existing zero-dependency baseline.

**Core technologies:**
- **GSAP 3.13+ (core + ScrollTrigger + SplitText):** Master animation engine — scroll triggers, parallax, character-level text reveals. Fully free, CDN-ready, zero dependencies.
- **tsParticles slim bundle 2.x:** Per-chapter canvas particle systems (snow, embers, stars, dust). Active maintenance, drop-in particles.js replacement, slim bundle avoids the 300KB full bundle.
- **Web Audio API (native):** Audio crossfade via two GainNodes on a single AudioContext. No download cost. Requires a user gesture to initialize — plan around this from the start.
- **CSS Custom Properties on `data-chapter` attribute:** Per-chapter palette, accent, overlay — applied instantly by CSS cascade with zero JS repaint cost.
- **Rellax.js (optional fallback):** ~1KB if GSAP is not yet loaded for a specific phase; otherwise unnecessary.

### Expected Features

The site already has all core reading features (navigation, audio triggering, dark mode, highlighting, scroll memory). The cinematic milestone adds atmosphere and polish. Every visual differentiator depends on the Chapter Theme Config system being built first — it is the prerequisite, not a feature itself.

**Must have (table stakes for cinematic milestone):**
- Chapter Theme Config object — all per-chapter values in one place; prerequisite for everything else
- Per-chapter background atmosphere via CSS custom properties — fastest signal of entering a new world
- Scroll-triggered paragraph fade-in — static text reads as broken on any literary web experience since 2020
- Audio crossfade replacing hard src swap — audible cuts break immersion immediately
- Smooth chapter transition (250ms opacity fade) — the current display snap is jarring
- Chapter accent color applied to UI chrome (nav, progress bar, highlights)
- Reading progress bar — readers need spatial awareness in long text
- Mobile particle/parallax reduction via `matchMedia` — 60%+ of readers are on phones

**Should have (competitive differentiators for v1.x):**
- Per-chapter particle systems (snow, embers, dust, stars) — gives each chapter a physical world
- Parallax multi-layer backgrounds — depth separates this from a styled blog
- Typewriter reveal for poetry and interior monologue — forces readers to slow down at key passages
- Ambient sound layer (second audio channel) — spatial depth without replacing the score
- Estimated reading time per chapter — low effort, meaningful for reader expectation-setting

**Defer (v2+):**
- Giscus comment integration — currently placeholder with unconfigured values; shipping broken is worse than not shipping
- Chapter-specific loading screen / title card — high reward but high effort; not needed for early readers
- Full reduced-motion audit — systematic pass once all animations exist

**Anti-features to avoid:**
- Scrolljacking — NN/G research confirms users lose control, comprehension drops, mobile is unusable
- Full-screen video backgrounds — GitHub Pages has no CDN/streaming; file size is prohibitive
- Autoplay audio without user gesture — always blocked on mobile; broken experience before reading starts
- Infinite scroll / all-chapters-on-page — would require full architecture rewrite

### Architecture Approach

The architecture is event-driven and additive. A single `CustomEvent('chapterchange')` dispatched from the existing `showChapter()` function is the only modification to `script.js`. Every new module (audio.js, particles.js, parallax.js, scroll-animate.js) is self-contained, listens for this event, and reads its slice of the chapter config. The CSS cascade handles visual theming through `[data-chapter="chapterN"]` selectors. No module knows about any other module. Failures are isolated and subsystems can be disabled independently. This architecture supports 2–20+ chapters with no structural changes — adding a chapter means adding one config object.

**Major components:**
1. `chapters/config.js` — single source of truth for all per-chapter data; the only file an author touches per new chapter
2. `theme.js` — reads config, applies CSS custom properties to `<body>`, dispatches `chapterchange` event to all subsystems
3. `audio.js` — Web Audio API crossfade engine; single AudioContext for page lifetime; caches decoded buffers
4. `particles.js` — canvas-based particle loop with full lifecycle management (teardown on chapter change, mobile count cap)
5. `parallax.js` — `transform: translateY()` on positioned background layers, passive scroll listener, `requestAnimationFrame`-batched updates
6. `scroll-animate.js` — extends the existing IntersectionObserver pattern; `data-reveal` attributes on elements; "reveal once, stay visible" rule

**Build order from architecture research:**
`config.js` → `theme.js` + CSS vars → `script.js` event dispatch → `audio.js` → `scroll-animate.js` → `parallax.js` → `particles.js`

Each step is independently testable. Particles are last because they are the most complex and the most risky on mobile.

### Critical Pitfalls

1. **Audio autoplay blocked on mobile (especially iOS Safari)** — The existing IntersectionObserver-triggered `audio.play()` will silently fail on first load for most mobile users. Prevention: initialize `AudioContext` only inside a user gesture handler (the existing mute-toggle click is sufficient); show a "tap to enable audio" prompt on mobile; always `.catch()` the `audio.play()` promise. This must be addressed in the audio phase, not retrofitted later.

2. **Particle canvas destroying mobile performance** — 100+ particles at 60fps causes thermal throttling, battery drain, and 20–30fps scrolling on budget Android and older iPhones. Prevention: cap at 30 particles on mobile (detect via `matchMedia` or `navigator.hardwareConcurrency`); implement adaptive frame-time check to halve count if frame gap exceeds 32ms; always cancel the RAF loop before starting a new one; never create particle objects inside the animation loop (pool them). Must be tested on a real mid-range Android device — DevTools mobile emulation hides this problem.

3. **Parallax scroll jank via `background-position` or non-passive scroll listeners** — Any update to `background-position` or `top`/`margin` in a scroll handler triggers layout recalculation at 60fps. On iOS, non-passive scroll listeners break momentum scrolling entirely. Prevention: `transform: translateY()` only; `{ passive: true }` on all scroll listeners; use `requestAnimationFrame` to batch transform updates. Establish this pattern before building the full theme system.

4. **Text animations that prevent reading** — Scroll-triggered reveals that replay on scroll-back, typewriter effects on body text, or animations faster than 150ms delay feel broken on re-reads of a long novel. Prevention: "reveal once, stay visible" rule (use a `Set` to track revealed elements); typewriter for poetry-only, never body text; click/tap to skip typewriter; maximum 150ms delay, 600ms duration; never animate elements already in the viewport on load.

5. **Theme configuration scattered across multiple files** — Without a forcing constraint, per-chapter values accumulate in `styles.css`, `script.js`, and other locations. After five chapters, adding a sixth requires hunting through four files. Prevention: build `chapters/config.js` first and establish the rule that no chapter-specific literal appears in any other file. This is cheaper to enforce from the start than to retrofit.

6. **CSS layer explosion crashing mobile browsers** — Applying `will-change: transform` to many elements simultaneously creates GPU compositor layers that consume ~50MB each. On 1–2GB mobile devices, this causes tab crashes with no visible error. Prevention: max two promoted layers per view (parallax background + particle canvas); use DevTools Layers panel to audit; remove `will-change` after animation completes.

7. **`prefers-reduced-motion` ignored** — Parallax and particles cause vestibular discomfort for users with motion sensitivity. This is both a WCAG concern and a complaint that will appear in reader feedback. Prevention: add the CSS blanket rule before writing any animation; check `matchMedia('(prefers-reduced-motion: reduce)')` before starting any JS animation loop. Must be established in the first animation phase — it is not retrofittable without touching every animation rule.

---

## Implications for Roadmap

The architecture research provides an explicit build order. The features and pitfalls research validates it and adds mobile-first constraints at each step. The recommended phase structure follows the dependency chain from config → theming → audio → text animation → visual effects.

### Phase 1: Foundation — Chapter Theme Config and CSS Theming

**Rationale:** The Chapter Theme Config is the prerequisite for every subsequent phase. Building it first costs nothing architecturally and prevents the scattered-config pitfall (Pitfall 8) from taking hold. The CSS custom property theming is low-risk, immediately visible, and proves the `data-chapter` mechanism before any complex JS is added.

**Delivers:** `chapters/config.js` schema; `theme.js`; CSS `[data-chapter]` blocks for existing chapters; the one-line `CustomEvent` dispatch in `script.js`; per-chapter background atmosphere; chapter accent color on UI chrome.

**Addresses:** Chapter Theme Config (P1), per-chapter background atmosphere (P1), chapter accent color (P1).

**Avoids:** Pitfall 8 (scattered config); establishes the constraint that no chapter-specific literal appears outside `config.js`.

**Research flag:** Standard patterns — no additional research needed. CSS custom properties and CustomEvent are MDN-documented baseline APIs.

### Phase 2: Reading Experience Baseline

**Rationale:** These features are table stakes that improve the experience for every reader on every device with minimal risk. Scroll-triggered fade-in extends the existing IntersectionObserver — no new infrastructure. The reading progress bar is pure scroll math. The smooth chapter transition is a CSS opacity change. Audio crossfade replaces the one behavior that currently breaks immersion most noticeably. All of these must work correctly before visual effects are added on top.

**Delivers:** Scroll-triggered paragraph fade-in (extend existing IntersectionObserver with "reveal once" rule); reading progress bar (accent-colored, scroll-driven); smooth chapter transition (250ms opacity fade); audio crossfade replacing hard src swap (dual GainNode or dual `<audio>` fade); mobile `matchMedia` reduction scaffolding; "tap to enable audio" prompt on mobile.

**Addresses:** Scroll-triggered fade-in (P1), audio crossfade (P1), smooth chapter transition (P1), reading progress bar (P1), mobile responsiveness (P1).

**Avoids:** Pitfall 1 (audio autoplay on mobile); Pitfall 4 (text animations blocking reading — "reveal once" rule established here); Pitfall 7 (`prefers-reduced-motion` CSS block added before any animation rule is written).

**Research flag:** Audio crossfade warrants care — the Web Audio API single-context pattern (Pitfall 6) and equal-power gain curve vs. linear fade are both documented. No additional research needed but implementation should be verified against the checklist in PITFALLS.md.

### Phase 3: Parallax Backgrounds

**Rationale:** Parallax is the second-biggest mobile performance risk after particles, and it must use the correct technique (`transform: translateY()`, passive listeners, RAF batching) from the start. Building it before particles means establishing the GPU compositing budget and validating mobile performance before the more complex particle system is added. One layer per chapter is sufficient for atmosphere; two layers add depth without meaningfully increasing risk.

**Delivers:** `parallax.js`; positioned background layer `<div>` elements per chapter; passive scroll listener with RAF-batched transforms; mobile detection to skip parallax on narrow viewports; layer swap on chapter transition with CSS opacity fade.

**Addresses:** Parallax multi-layer backgrounds (P2).

**Avoids:** Pitfall 3 (parallax jank via `background-position`); Pitfall 5 (CSS layer explosion — `will-change` on one element only, removed after transition completes).

**Research flag:** Standard pattern — GPU compositing via `transform` is well-established (Chrome DevRel documentation confirms). Test on real iOS Safari before considering complete.

### Phase 4: Per-Chapter Particle Systems

**Rationale:** Particles are the most visually striking differentiator and the highest-risk system for mobile performance. They must be built last among the visual effects so that the parallax GPU budget is already known and the mobile performance constraints are already encoded in the codebase culture. The tsParticles slim bundle provides the particle engine; the `particles.js` module manages the full lifecycle (init, teardown, mobile cap, RAF ID tracking).

**Delivers:** `particles.js`; canvas element positioned between background and text; per-chapter particle presets (snow, embers, dust, stars) read from config; mobile count cap at 30; adaptive frame-time degradation; particle pool (no `new Particle()` inside RAF loop); RAF ID tracking to prevent double loops.

**Addresses:** Per-chapter particle systems (P2).

**Avoids:** Pitfall 2 (particle canvas destroying mobile performance); Pitfall 5 (CSS layer explosion — canvas is one of the two promoted layers).

**Research flag:** Needs real-device testing on mid-range Android before shipping. DevTools emulation is not sufficient validation for this phase.

### Phase 5: Advanced Text Effects and Depth Polish

**Rationale:** Typewriter reveals and deeper scroll-triggered effects are built on the `scroll-animate.js` infrastructure already in place from Phase 2. This phase extends it for poetry passages and adds the ambient sound layer (second audio channel). Estimated reading time is a trivial addition to the chapter dropdown. These are all enhancements that assume stable underpinnings.

**Delivers:** Typewriter reveal for `.poetic-text` and blockquote elements via GSAP SplitText; `data-reveal="typewriter"` attribute support in `scroll-animate.js`; click/tap-to-skip typewriter; ambient sound layer (second `<audio>` element per chapter in config); estimated reading time in chapter dropdown or header; "quiet mode" toggle (stops particles + audio, persists via `localStorage`).

**Addresses:** Typewriter reveal for poetry (P2), ambient sound layer (P2), estimated reading time (P2).

**Avoids:** Pitfall 4 (typewriter on body text forbidden; skip mechanism required; animation does not restart on return visit).

**Research flag:** SplitText versioning warrants a check — SplitText lags on cdnjs (3.13.0) and requires jsDelivr for 3.14.x. Confirm CDN availability and SRI hash before implementation. Otherwise standard patterns apply.

### Phase 6: Pre-Release Polish and Accessibility Audit

**Rationale:** Several items cannot be validated until all animation systems exist. This phase is a dedicated pass rather than an afterthought — it addresses the debug log (currently visible to all users in production), systematic `prefers-reduced-motion` verification, dark mode + chapter color compatibility, and the full "Looks Done But Isn't" checklist from PITFALLS.md.

**Delivers:** `#debug-log` element removed or gated behind URL parameter; full `prefers-reduced-motion` audit across all modules; dark mode + chapter accent color compatibility check for all chapters; DevTools Layers panel audit (max 10 layers); iOS Safari audio autoplay flow verified on fresh session; five-chapter-navigation memory check for AudioContext growth; Giscus configuration (if ready for public launch).

**Addresses:** Reduced-motion fallback (P1, but systematic audit deferred here); Giscus (P3 — only if publishing publicly).

**Avoids:** Shipping the debug log overlay to readers (currently visible in production for all users).

**Research flag:** No additional research needed — this phase executes the verification checklists from PITFALLS.md.

### Phase Ordering Rationale

- Config before everything: every visual system reads from it; building it first prevents scattered config debt from day one.
- Audio before visual effects: audio crossfade is directly perceptible and fixes an existing regression (hard cuts); it has no dependency on the visual systems.
- `prefers-reduced-motion` CSS block before any animation: it cannot be retrofitted; the cost of adding it first is one CSS block; the cost of missing it is touching every animation rule later.
- Parallax before particles: establishes the GPU compositor budget and mobile performance baseline with a lower-risk system first.
- Particles last among visual effects: highest mobile performance risk; needs the parallax layer budget already known and mobile reduction infrastructure already proven.
- Text effects after scroll-animate infrastructure: Phase 2 builds the observer; Phase 5 extends it for typewriter without architectural change.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations verified against official docs, CDN registries, and MDN. Version numbers confirmed. GSAP free license confirmed via official announcement. tsParticles maintenance status confirmed via GitHub. |
| Features | HIGH | Visual/audio feature set is well-documented in the scrollytelling literature. MEDIUM for accessibility feature depth — `prefers-reduced-motion` is clearly required but complete WCAG audit scope is not defined. |
| Architecture | HIGH | Event bus, CSS custom properties, canvas particle lifecycle, and IntersectionObserver patterns are all MDN-baseline and verified against the existing codebase structure. |
| Pitfalls | HIGH | Audio autoplay, parallax technique, and GPU compositor layer limits verified against Chrome DevRel, MDN, and WebKit documentation. Particle performance on mobile confirmed via MDN canvas optimization guide. |

**Overall confidence:** HIGH

### Gaps to Address

- **SplitText CDN availability:** SplitText is not on cdnjs at 3.13.0 and must load from jsDelivr. Confirm SRI hash and version availability before Phase 5 implementation. The version mismatch (cdnjs vs. jsDelivr) is a potential integration friction point.

- **Parallax asset pipeline:** The architecture calls for per-chapter parallax layer images (`assets/ch1/fog.png`, etc.) but these assets do not yet exist. Phase 3 will need image assets before it can be fully tested. The roadmap should flag this as a content dependency.

- **AudioContext unlock on iOS — exact UX flow:** The research confirms that a user gesture is required and the mute-toggle button is the correct unlock gate, but the exact UI behavior (what the reader sees before tapping, what feedback confirms audio is active) needs a design decision. Low implementation complexity, but needs to be specified before the audio phase ships.

- **Particle presets for all chapters:** The config schema defines `type: 'dust' | 'snow' | 'embers' | 'stars' | 'none'` but only chapters 1 and 2 have confirmed particle assignments. Remaining chapter particle types are unspecified. This is a content authoring decision, not a technical gap.

- **Dark mode palette for each chapter theme:** The architecture confirms that dark mode composes cleanly with `data-chapter` selectors, but each chapter must define both a light-mode and dark-mode variant of its palette. The existing chapters have not been audited for dark mode compatibility with the new accent color system.

---

## Sources

### Primary (HIGH confidence)
- https://gsap.com/docs/v3/Installation — GSAP 3.14.1 current version, all plugins free
- https://gsap.com/blog/3-13/ — SplitText rewrite, all plugins free confirmed (April 2025)
- https://cdnjs.com/libraries/gsap — GSAP 3.13.0 on cdnjs confirmed
- https://webflow.com/blog/gsap-becomes-free — GSAP free license confirmed
- https://github.com/tsparticles/tsparticles — tsParticles active maintenance, particles.js abandoned
- https://cdnjs.com/libraries/tsparticles-slim — tsParticles slim CDN confirmed
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices — crossfade patterns, AudioParam scheduling
- https://developer.chrome.com/blog/performant-parallaxing — `background-attachment: fixed` mobile incompatibility
- https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Autoplay — audio autoplay policy
- https://developer.chrome.com/blog/autoplay — Chrome autoplay policy (MEI model)
- https://webkit.org/blog/6784/new-video-policies-for-ios/ — iOS WebKit unconditional autoplay block
- https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas — canvas particle performance
- https://www.w3.org/WAI/WCAG21/Techniques/css/C39 — `prefers-reduced-motion` WCAG technique
- https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties — CSS variable scoping
- https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/CustomEvent — event bus pattern

### Secondary (MEDIUM confidence)
- https://tympanus.net/codrops/2026/01/09/the-spark-engineering-an-immersive-story-first-web-experience/ — scrollytelling architecture reference
- https://www.nngroup.com/articles/scrolljacking-101/ — scrolljacking user research
- https://css-tricks.com/a-complete-guide-to-custom-properties/ — cascade and specificity rules
- https://www.smashingmagazine.com/2016/12/gpu-animation-doing-it-right/ — GPU compositor layer memory costs
- https://gsap.com/community/forums/topic/45363-gsap-scrolltrigger-vs-css-scroll-timelines — CSS scroll-driven animation browser gaps

### Tertiary (MEDIUM-LOW confidence)
- https://www.producthunt.com/products/immerziva — competitive reference (audio sync to reading)
- https://davidwalsh.name/reducing-memory-leaks-working-animations — animation memory leak patterns

---

*Research completed: 2026-03-10*
*Ready for roadmap: yes*
