# Requirements: Immersive Book Site

**Defined:** 2026-03-10
**Core Value:** Every chapter feels like its own cinematic world - visuals, audio, and text effects serve the story.

> Reconciliation note (2026-03-12): This file still primarily reflects the legacy static-reader roadmap. Phase 06 PRD artifacts are present in `.planning/phases/to-do/backlog/06-prd-author-studio-reader-upgrade-for-interactive-digital-book/` and pass local smoke checks, but production acceptance is not yet signed off (`docs/phase06-acceptance-checklist.md`; live `/admin` and `/login` are currently 404 on Netlify). Merge this file into a refreshed requirements map only after acceptance evidence is completed.

## v1 Requirements

### Content Migration

- [ ] **CONT-01**: All HTML chapter content compared against docx source files; discrepancies documented
- [ ] **CONT-02**: Chapter 1 (The Ritual - Xander) replaced in HTML with updated docx version (~1,800 words vs current ~300 words)
- [ ] **CONT-03**: Chapter 2 (The Routine - Nico) replaced in HTML with updated docx version (~2,700 words vs current version)
- [ ] **CONT-04**: Chapters 3-7 (Nico's backstory flashbacks: Left Alone, Breaking Through, Grad, All Good Things) added to HTML from `nico backstory(3-7D).docx`
- [ ] **CONT-05**: Chapter 7 (Static Between Stations) and Chapter 8 (Golden) added to HTML from `static between stations (8D).docx`
- [ ] **CONT-06**: Chapters 9-10 (Gianna's Week / Gianna's POV) added to HTML from `Gianna_s POV(9-10W).docx`
- [ ] **CONT-07**: Chapter 15 (Blackberries - Xander) added to HTML from `Blackberries (15D).docx`
- [ ] **CONT-08**: All chapter formatting conventions preserved (`.poetic-text`, `.bold-grow-*`, `.centered-text`, `.right-aligned`, date/location headers, chapter titles)
- [ ] **CONT-09**: Chapter navigation dropdown updated to include all added chapters with correct titles

### Foundation

- [ ] **FNDM-01**: Reader experiences a single `chapters/config.js` file as source of truth for all per-chapter visual, audio, and effect settings
- [ ] **FNDM-02**: Switching to a chapter applies a `data-chapter` attribute on `<body>`, triggering CSS custom properties (accent color, background tint) unique to that chapter
- [ ] **FNDM-03**: Switching chapters fades the current chapter out and the next one in, instead of an instant jump
- [ ] **FNDM-04**: Debug log overlay (`#debug-log`) is hidden/removed and never visible to readers

### Audio

- [ ] **AUDIO-01**: Audio crossfades smoothly between tracks when section/chapter changes (no hard cut)
- [ ] **AUDIO-02**: Each chapter's audio track(s) defined in the chapter theme config, not hard-coded in script.js
- [ ] **AUDIO-03**: A quiet ambient sound layer plays beneath the main track per chapter, set in config

### Text Effects

- [ ] **TEXT-01**: Prose paragraphs fade in as the reader scrolls down to them
- [ ] **TEXT-02**: Poetry blocks (`.poetic-text`) reveal lines one by one via typewriter effect as the reader reaches them
- [ ] **TEXT-03**: Bold-escalation passages (`.bold-grow-*` sequences) animate in with building intensity on scroll
- [ ] **TEXT-04**: Chapter title performs a cinematic entrance animation when the chapter loads

### Visual Atmosphere

- [ ] **VFX-01**: Each chapter displays a particle effect defined in the chapter theme config, with count capped for mobile devices
- [ ] **VFX-02**: Parallax background layers per chapter move at different scroll speeds using `transform: translateY()` (not `background-attachment: fixed`)

### Reader Experience

- [ ] **CMTS-01**: Giscus comments block properly configured and functional for readers

## Phase 6-8 Requirements

### Content Completion (Phase 6)

- [ ] **CONT-10**: Chapters 3-6 (`ch03.html`-`ch06.html`) filled with authored content from `chapters/raw/` sources; no stub files remain
- [ ] **CONT-11**: Ch1 and Ch2 canonical versions decided - author reviews `chapters/DISCREPANCY.md` and signs off on which version is final
- [ ] **CONT-12**: `tools/validate-chapters.cjs` extended with minimum word-count check so stub chapters fail validation with a clear warning

### Assets & External Configuration (Phase 7)

- [ ] **ASSET-01**: All ambient audio files referenced in `chapters/config.js` exist at their configured paths under `assets/ambient/` (or config updated to `null` for chapters with no asset)
- [ ] **ASSET-02**: Parallax image assets for Ch1 and Ch2 exist at their configured paths under `assets/ch1/` and `assets/ch2/`, or `image` entries removed from `LAYER_LIBRARY` and gradient-only mode documented as intentional
- [ ] **CMTS-02**: Giscus configured - GitHub Discussions category created on repo; `repo`, `repoId`, and `categoryId` populated in `SITE_CONFIG.giscus` in `chapters/config.js`

### Code Quality & Accessibility (Phase 8)

- [ ] **QUAL-01**: `saveScrollPosition()` in `script.js` throttled to at most once per 500ms; no synchronous `localStorage.setItem` on every scroll event
- [ ] **QUAL-02**: Google Fonts `@import` calls in `styles.css` consolidated into a single URL request
- [ ] **QUAL-03**: CDN `<script>` tags for GSAP and tsParticles in `index.html` include `integrity` (SRI hash) attributes
- [ ] **QUAL-04**: `.github/workflows/jekyll-gh-pages.yml` replaced with a plain static pages deploy workflow (no Jekyll build step)
- [ ] **QUAL-05**: `package.json` `"type"` field corrected; `mammoth` moved to `devDependencies`
- [ ] **QUAL-06**: `syncToViewportLine` in `script.js` checks `destroyed` after each `await` to prevent post-teardown audio crossfade continuation
- [ ] **QUAL-07**: Dead CSS rules `.chapter-theme[data-chapter="chapter1/2"]` removed from `styles.css`
- [ ] **ACCS-02**: Mobile readers see a "tap to enable audio" UI prompt on first visit when `audio.play()` is blocked by browser autoplay policy
- [ ] **ACCS-03**: An effects toggle button allows readers to disable particles and scroll animations (for motion sensitivity, low-powered devices, or preference)

## v2 Requirements

### Performance & Accessibility

- **PERF-01**: Reading progress bar shows position within current chapter
- **PERF-02**: Particle effects and parallax automatically reduce/disable on mobile for performance
- **ACCS-01**: All animations respect `prefers-reduced-motion` media query (CSS media query in place; ParticleController honors it)
- **ACCS-04**: Remaining drafted chapters (11-14) added to HTML when available

## Out of Scope

| Feature | Reason |
|---------|--------|
| Scrolljacking | Documented UX harm - breaks comprehension and mobile usability |
| Video backgrounds | Storage/bandwidth cost; GitHub Pages constraint |
| Server-side features | Static hosting constraint; localStorage sufficient |
| Build tooling / bundlers | Author must extend without a build step |
| `background-attachment: fixed` | Hard broken on iOS Safari |
| Chapters not yet drafted (11-14) | Content doesn't exist yet |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CONT-01 | Phase 1 | Pending |
| CONT-02 | Phase 1 | Pending |
| CONT-03 | Phase 1 | Pending |
| CONT-04 | Phase 1 | Pending |
| CONT-05 | Phase 1 | Pending |
| CONT-06 | Phase 1 | Pending |
| CONT-07 | Phase 1 | Pending |
| CONT-08 | Phase 1 | Pending |
| CONT-09 | Phase 1 | Pending |
| FNDM-01 | Phase 2 | Pending |
| FNDM-02 | Phase 2 | Pending |
| FNDM-03 | Phase 2 | Pending |
| FNDM-04 | Phase 2 | Pending |
| AUDIO-02 | Phase 2 | Pending |
| AUDIO-01 | Phase 3 | Pending |
| TEXT-01 | Phase 3 | Pending |
| TEXT-04 | Phase 3 | Pending |
| CMTS-01 | Phase 3 | Pending |
| VFX-02 | Phase 4 | Pending |
| TEXT-02 | Phase 4 | Pending |
| TEXT-03 | Phase 4 | Pending |
| VFX-01 | Phase 5 | Pending |
| AUDIO-03 | Phase 5 | Pending |

| CONT-10 | Phase 6 | Pending |
| CONT-11 | Phase 6 | Pending |
| CONT-12 | Phase 6 | Pending |
| ASSET-01 | Phase 7 | Pending |
| ASSET-02 | Phase 7 | Pending |
| CMTS-02 | Phase 7 | Pending |
| QUAL-01 | Phase 8 | Pending |
| QUAL-02 | Phase 8 | Pending |
| QUAL-03 | Phase 8 | Pending |
| QUAL-04 | Phase 8 | Pending |
| QUAL-05 | Phase 8 | Pending |
| QUAL-06 | Phase 8 | Pending |
| QUAL-07 | Phase 8 | Pending |
| ACCS-02 | Phase 8 | Pending |
| ACCS-03 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 22 total (Phases 1-5)
- Phase 6-8 requirements: 15 total
- Unmapped: 0

---
*Requirements defined: 2026-03-10*
*Last updated: 2026-03-12 - Reconciled with pending Phase 06 production acceptance*




