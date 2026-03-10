# Stack Research

**Domain:** Cinematic effects layer for vanilla static book site (parallax, particles, scroll animations, audio crossfade)
**Researched:** 2026-03-10
**Confidence:** HIGH (core stack verified against official docs and cdnjs; version numbers confirmed)

---

## Context: What Already Exists

The existing codebase is vanilla HTML/CSS/JS with no build step and no dependencies beyond a Giscus comment embed. Key existing patterns that constrain and inform library choices:

- Audio is driven by a single `<audio>` element with `src` swaps — needs upgrading to Web Audio API for crossfading
- Section visibility is detected via `IntersectionObserver` — this can co-exist with or be replaced by GSAP ScrollTrigger
- Chapter switching uses `display: none/block` — particle canvases and GSAP contexts must be destroyed/recreated on chapter switch
- All JS is in a single `DOMContentLoaded` block in `script.js` — new effect code can follow the same module-free pattern

**Hard constraints:** No build step, no bundler, no npm install. Everything must load via `<script src="...">` tags pointing at a CDN.

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| GSAP (core) | 3.13.0 (cdnjs) / 3.14.1 (npm/jsDelivr) | Master animation engine: scroll-triggered text reveals, parallax layer movement, chapter transition tweens | Industry standard for timeline-based JS animation. Free for all uses as of 2024 Webflow acquisition. Zero dependencies. CDN-ready. Browser support back to IE9. Eliminates need for separate parallax and animation libraries. |
| GSAP ScrollTrigger | same as core | Scroll-driven animation triggers (fade-ins, parallax on scroll, section entry/exit hooks) | Built into GSAP, registers as a plugin. Handles the scroll-to-animation binding that currently has no clean solution in the codebase. Superior cross-browser support vs native CSS scroll-driven animations (Chrome-only as of 2026). |
| GSAP SplitText | same as core | Per-character and per-word text animations (typewriter, stagger reveal for poetry sections) | Completely rewritten in 3.13 — 50% smaller, accessible (auto aria labels), responsive re-splitting. Now free. The only robust solution for character-level animation without writing a custom text-node splitter. |
| Web Audio API | Native (no CDN) | Audio crossfading between chapter tracks | Built into all modern browsers, zero download cost. Enables precise gain scheduling (`linearRampToValueAtTime`) for smooth crossfades that are impossible with a single `<audio>` element. No external library needed — the crossfade pattern is ~30 lines of vanilla JS. |
| tsParticles (slim bundle) | 2.x (latest via cdnjs) | Per-chapter particle systems (snow, embers, dust, stars, fireflies) | Actively maintained successor to abandoned particles.js. Slim bundle includes only what's needed for basic particle configs. Supports multiple simultaneous instances with different configs (critical for per-chapter themes). CDN-available, no build step. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Rellax.js | 1.12.1 (cdnjs) | Lightweight CSS-transform parallax for background image layers | Use as a fallback or for simple image-based parallax if GSAP ScrollTrigger's parallax feels over-engineered for purely decorative background layers. At ~1KB gzipped, it's near-zero cost. Only needed if GSAP is not already loaded. |
| CSS Custom Properties (native) | N/A | Per-chapter color palettes, atmosphere variables | Define chapter theme as a `data-theme="chapter1"` attribute on the chapter div; cascade `--accent-color`, `--bg-color`, `--particle-color` etc. Zero runtime cost, instant theme switching. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| cdnjs.cloudflare.com | Serve GSAP and tsParticles | Preferred CDN: SRI hashes available for all files, fast global edge, no rate limits for static sites |
| jsDelivr | Fallback CDN for newer versions not yet on cdnjs | Use for GSAP 3.14.x if 3.13.0 on cdnjs is insufficient; `https://cdn.jsdelivr.net/npm/gsap@3.14.1/dist/gsap.min.js` |
| Browser DevTools Performance tab | Verify 60fps scrolling and particle render loop | Particles must be tested on mid-range mobile — canvas-based particles are the #1 performance risk on this project |

---

## CDN Script Tags (Copy-Ready)

These replace npm install for a no-build-step project. Load order matters: GSAP core must precede plugins.

```html
<!-- GSAP Core -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/gsap.min.js"
  integrity="sha512-..." crossorigin="anonymous" referrerpolicy="no-referrer"></script>

<!-- ScrollTrigger Plugin -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.13.0/ScrollTrigger.min.js"
  integrity="sha512-..." crossorigin="anonymous" referrerpolicy="no-referrer"></script>

<!-- SplitText Plugin (free as of GSAP 3.13) -->
<!-- Note: SplitText is NOT yet on cdnjs 3.13.0 — load from jsDelivr instead -->
<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.1/dist/SplitText.min.js"></script>

<!-- tsParticles Slim Bundle -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/tsparticles-slim/2.12.0/tsparticles.slim.bundle.min.js"></script>
```

**Then in your JS (before any animations):**
```javascript
gsap.registerPlugin(ScrollTrigger, SplitText);
```

> Fetch SRI hashes from https://cdnjs.com/libraries/gsap before deploying — always pin to exact version + integrity hash for production.

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| GSAP ScrollTrigger | Native CSS scroll-driven animations (`animation-timeline: scroll()`) | Only if targeting Chrome/Edge exclusively and wanting zero JS for simple fade-ins. As of 2026, Firefox and Safari support is incomplete — unusable for a general readership book site. |
| GSAP ScrollTrigger | ScrollReveal.js (3.x) | If GSAP feels heavyweight and you only need simple once-on-enter class toggles. ScrollReveal is ~6KB gzipped and CDN-available, but it cannot do parallax, timeline sequencing, or character-level text animation — you'd still need GSAP for those. Not worth managing two scroll libraries. |
| GSAP ScrollTrigger | ScrollMagic | ScrollMagic is unmaintained and depends on TweenMax (legacy GSAP v1 API). Do not use. |
| tsParticles slim | particles.js | particles.js has been abandoned for ~5 years. No bug fixes, no mobile optimizations, no active maintenance. tsParticles is a drop-in replacement with a compatibility shim. |
| tsParticles slim | Full tsParticles bundle | Full bundle includes every plugin (confetti, fireworks, etc.) — ~300KB. Slim bundle is sufficient for snow, embers, stars, dust. |
| Web Audio API (native) | Tone.js | Tone.js is a full audio synthesis framework — appropriate for music apps, not chapter background audio. ~300KB CDN load for a crossfade use case that needs ~30 lines of vanilla code. |
| Web Audio API (native) | Howler.js | Howler.js (~7KB gzipped) adds useful abstractions (Web Audio fallback to HTML5 Audio, global mute state, sprite support). Worth considering if the audio system grows complex (per-section audio sprites, loop points). Not needed for the current two-track crossfade requirement. |
| CSS Custom Properties | Separate CSS files per chapter | Per-chapter CSS files require a `<link>` swap on chapter change, which causes FOUC and requires DOM manipulation. CSS variables on a `data-theme` attribute cascade instantly and are animated with `@property` if needed. |
| Rellax.js | Simple `window.scrollY` calculation in `scroll` event | `scroll` events are not guaranteed to fire every frame in all browsers. Use `requestAnimationFrame` if rolling a custom parallax, or use Rellax/GSAP which handle this correctly. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `background-attachment: fixed` for parallax | Does not work on iOS Safari and most mobile browsers. Causes scroll jank on Android Chrome. The project requires mobile compatibility. | CSS `transform: translateY()` driven by GSAP ScrollTrigger or Rellax.js |
| particles.js | Abandoned ~2020. No maintenance, known performance issues on mobile, no active bug fixes. Still appears in many tutorials because of historical popularity. | tsParticles (slim bundle) — drop-in compatible, actively maintained |
| ScrollMagic | Depends on TweenMax (GSAP v1, EOL). API is incompatible with modern GSAP. Last meaningful release was 2019. | GSAP ScrollTrigger |
| jQuery for animation | Adds ~87KB for `.animate()` which is inferior to CSS transitions and GSAP tweens in every dimension (performance, easing, sequencing). The existing codebase has zero jQuery dependency — keep it that way. | GSAP or CSS transitions |
| Three.js / WebGL backgrounds | Justified for 3D scenes; not justified for 2D atmospheric effects (snow, embers, parallax layers). Adds ~600KB+ and a steep implementation complexity for effects that canvas 2D handles well. | tsParticles (canvas 2D), CSS transforms |
| GSAP ScrollSmoother | Requires a Club GSAP account or specific configuration. More importantly, it hijacks native scroll behavior, which breaks the existing `window.scrollY`-based page number tracking and scroll position persistence. | Native scroll + GSAP ScrollTrigger (trigger-only, not scroll-hijacking) |
| `setInterval` or `setTimeout` for audio transitions | Imprecise scheduling — audio drift is audible on longer crossfades. | Web Audio API `AudioParam.linearRampToValueAtTime()` which uses the audio clock, not the JS event loop |

---

## Stack Patterns by Scenario

**If a chapter needs snow particles:**
- tsParticles slim with a snow preset JSON config object stored in the chapter theme definition
- Destroy the previous chapter's particle instance with `tsParticles.domItem(0)?.destroy()` before creating the new one

**If a chapter needs a dramatic text reveal (poetry stanzas):**
- GSAP SplitText to split into chars or words, then `gsap.from(chars, { opacity: 0, y: 20, stagger: 0.05 })` inside a ScrollTrigger `onEnter` callback
- Typewriter effect: stagger + `autoAlpha: 0` with a near-zero duration per char

**If a chapter needs parallax background layers:**
- CSS: background image on a pseudo-element with `transform: translateY()` controlled by GSAP ScrollTrigger `scrub: true`
- The layer should be a separate `<div>` behind the text, not `background-attachment: fixed`

**If audio must crossfade on chapter change:**
- Web Audio API: two `AudioBufferSourceNode` instances each connected through a `GainNode` to `AudioContext.destination`
- Outgoing track: `gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 2)`
- Incoming track: `gainNode.gain.linearRampToValueAtTime(1, ctx.currentTime + 2)`
- The existing `<audio>` element and `currentSong` pattern must be replaced — it cannot crossfade

**If adding a new chapter theme (the scalable pattern):**
```javascript
const chapterThemes = {
  chapter1: {
    accentColor: '#2a4a6b',
    particleConfig: { preset: 'snow', count: 80 },
    audioSrc: 'Eva_Angelina.mp3',
    bgImage: 'chapters/ch1-bg.jpg'
  },
  chapter2: {
    accentColor: '#3d1f0a',
    particleConfig: { preset: 'embers', count: 40 },
    audioSrc: 'Mojo_Pin.mp3',
    bgImage: 'chapters/ch2-bg.jpg'
  }
  // Adding chapter N = adding one object here
};
```

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| GSAP 3.13.0 (cdnjs) | ScrollTrigger 3.13.0 (cdnjs) | Core and plugin versions must match exactly. Mixing versions causes plugin registration failures. |
| GSAP 3.14.1 (jsDelivr) | SplitText 3.14.1 (jsDelivr) | SplitText lags behind on cdnjs — use jsDelivr for the latest if SplitText is needed. Do not mix cdnjs for core and jsDelivr for plugins on mismatched version numbers. |
| tsParticles slim 2.x | Vanilla JS | No peer dependencies. Works alongside GSAP without conflict. Both use `requestAnimationFrame` internally; they share the frame budget, so reduce particle counts if parallax + particles run simultaneously. |
| Web Audio API | All modern browsers | `AudioContext` requires a user gesture to start (browser autoplay policy). The existing mute toggle button is an appropriate trigger — initialize `AudioContext` inside its click handler or inside the chapter navigation click handler. |
| IntersectionObserver (existing) | GSAP ScrollTrigger (new) | Both can coexist. The existing `IntersectionObserver` handles audio section triggers (50% threshold). ScrollTrigger handles animation triggers. They observe different things and do not conflict — but test carefully if both are watching the same elements. |

---

## Sources

- https://gsap.com/blog/3-13/ — GSAP 3.13 release notes; SplitText rewrite, all plugins free confirmed (MEDIUM: official source, April 2025)
- https://gsap.com/docs/v3/Installation — Version 3.14.1 confirmed current, all plugins freely available on npm (HIGH: official docs)
- https://cdnjs.com/libraries/gsap — Version 3.13.0 confirmed on cdnjs (HIGH: CDN registry)
- https://webflow.com/blog/gsap-becomes-free — Webflow acquisition, 100% free license confirmed (HIGH: official announcement)
- https://gsap.com/community/forums/topic/45363-gsap-scrolltrigger-vs-css-scroll-timelines — CSS scroll-driven animations browser support gaps (MEDIUM: official GSAP forum)
- https://github.com/tsparticles/tsparticles — tsParticles active maintenance confirmed, particles.js abandoned (HIGH: GitHub source)
- https://cdnjs.com/libraries/tsparticles-slim — tsParticles slim CDN availability confirmed (HIGH: CDN registry)
- https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API/Best_practices — Web Audio API crossfade patterns, AudioParam scheduling (HIGH: MDN)
- https://developer.chrome.com/blog/performant-parallaxing — `background-attachment: fixed` mobile incompatibility, transform-based approach recommended (HIGH: Chrome DevRel)
- https://css-tricks.com/gsap-is-now-completely-free-even-for-commercial-use/ — Commercial use licensing confirmed free (MEDIUM: CSS-Tricks, corroborated by official source)

---

*Stack research for: Immersive Book Site — cinematic effects layer*
*Researched: 2026-03-10*
