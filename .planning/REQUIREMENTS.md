# Requirements: Immersive Book Site

**Defined:** 2026-03-10
**Core Value:** Every chapter feels like its own cinematic world — visuals, audio, and text effects serve the story.

## v1 Requirements

### Content Migration

- [ ] **CONT-01**: All HTML chapter content compared against docx source files; discrepancies documented
- [ ] **CONT-02**: Chapter 1 (The Ritual — Xander) replaced in HTML with updated docx version (~1,800 words vs current ~300 words)
- [ ] **CONT-03**: Chapter 2 (The Routine — Nico) replaced in HTML with updated docx version (~2,700 words vs current version)
- [ ] **CONT-04**: Chapters 3–7 (Nico's backstory flashbacks: Left Alone, Breaking Through, Grad, All Good Things) added to HTML from `nico backstory(3-7D).docx`
- [ ] **CONT-05**: Chapter 7 (Static Between Stations) and Chapter 8 (Golden) added to HTML from `static between stations (8D).docx`
- [ ] **CONT-06**: Chapters 9–10 (Gianna's Week / Gianna's POV) added to HTML from `Gianna_s POV(9-10W).docx`
- [ ] **CONT-07**: Chapter 15 (Blackberries — Xander) added to HTML from `Blackberries (15D).docx`
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

## v2 Requirements

### Performance & Accessibility

- **PERF-01**: Reading progress bar shows position within current chapter
- **PERF-02**: Particle effects and parallax automatically reduce/disable on mobile for performance
- **ACCS-01**: All animations respect `prefers-reduced-motion` media query
- **ACCS-02**: iOS audio unlock prompt ("tap to enable audio") for mobile readers
- **ACCS-03**: Remaining drafted chapters (11–14) added to HTML when available

## Out of Scope

| Feature | Reason |
|---------|--------|
| Scrolljacking | Documented UX harm — breaks comprehension and mobile usability |
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

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0

---
*Requirements defined: 2026-03-10*
*Last updated: 2026-03-10 — traceability updated with final phase assignments from ROADMAP.md*
