# Roadmap: Immersive Book Site

## Overview

The project moves in two acts. First, every drafted chapter is migrated from source documents into HTML so the final content is settled before any visual treatment begins. Second, a cinematic atmosphere layer is built in four phases — config system first, then audio and reading baseline, then parallax and text effects, then particle systems — each phase independently verifiable and each one safely additive to what came before.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Content Migration** - All drafted chapters migrated from docx sources into HTML, navigation updated
- [ ] **Phase 2: Foundation** - Chapter theme config system, CSS custom property theming, smooth transitions, debug log removed
- [ ] **Phase 3: Audio and Reading Baseline** - Audio crossfade, paragraph fade-in, chapter title entrance, Giscus comments
- [ ] **Phase 4: Parallax and Text Effects** - Parallax backgrounds, poetry typewriter reveal, bold-escalation animation
- [ ] **Phase 5: Particles and Ambient Depth** - Per-chapter particle systems, ambient sound layer

## Phase Details

### Phase 1: Content Migration
**Goal**: Readers can access all drafted chapters (1–15, with gaps) with accurate content and correct formatting
**Depends on**: Nothing (first phase)
**Requirements**: CONT-01, CONT-02, CONT-03, CONT-04, CONT-05, CONT-06, CONT-07, CONT-08, CONT-09
**Success Criteria** (what must be TRUE):
  1. Reader can select any chapter from 1 through 15 (where drafted) in the navigation dropdown and read the full text
  2. Chapters 1 and 2 contain the expanded docx versions (not the old ~300 and ~200 word stubs)
  3. Chapter text preserves all formatting — `.poetic-text` blocks, `.bold-grow-*` sequences, centered/right-aligned text, date/location headers
  4. Chapter dropdown lists all added chapters with correct titles and no dead entries
**Plans**: TBD

### Phase 2: Foundation
**Goal**: The codebase has a single source of truth for per-chapter visual, audio, and effect settings; switching chapters applies a distinct CSS identity; transitions are smooth; the debug log is gone
**Depends on**: Phase 1
**Requirements**: FNDM-01, FNDM-02, FNDM-03, FNDM-04, AUDIO-02
**Success Criteria** (what must be TRUE):
  1. A `chapters/config.js` file exists and is the only place chapter-specific values (color, audio, particle type) are defined
  2. Switching to any chapter visibly changes the page accent color and background tint — each chapter feels distinct
  3. Navigating between chapters fades out the current chapter and fades in the next (no instant jump)
  4. The debug log overlay is absent from the page in production — no reader ever sees it
  5. Each chapter's audio track is defined in the config object, not in `script.js`
**Plans**: TBD

### Phase 3: Audio and Reading Baseline
**Goal**: Audio transitions smoothly between chapters, prose fades in as the reader scrolls, chapter titles perform a cinematic entrance, and comments are functional
**Depends on**: Phase 2
**Requirements**: AUDIO-01, TEXT-01, TEXT-04, CMTS-01
**Success Criteria** (what must be TRUE):
  1. Switching chapters while audio is playing produces a smooth crossfade — no hard cut or silence gap
  2. Prose paragraphs are invisible on load and fade in one by one as the reader scrolls down to them; they stay visible on scroll-back
  3. The chapter title performs a distinct entrance animation when a chapter loads (not a plain text snap)
  4. The Giscus comments block loads and is functional — readers can leave comments
**Plans**: TBD

### Phase 4: Parallax and Text Effects
**Goal**: Each chapter has layered parallax backgrounds that respond to scroll, poetry lines reveal via typewriter, and bold-escalation passages animate with building intensity
**Depends on**: Phase 3
**Requirements**: VFX-02, TEXT-02, TEXT-03
**Success Criteria** (what must be TRUE):
  1. Scrolling within a chapter moves background layers at different speeds, creating visible depth — no `background-attachment: fixed` used
  2. Poetry blocks (`.poetic-text`) reveal their lines one at a time as the reader reaches them; a tap/click skips the animation
  3. Bold-escalation sequences (`.bold-grow-*`) animate in with building intensity when scrolled into view
**Plans**: TBD

### Phase 5: Particles and Ambient Depth
**Goal**: Each chapter has a particle effect that matches its atmosphere, and a quiet ambient sound layer plays beneath the main track
**Depends on**: Phase 4
**Requirements**: VFX-01, AUDIO-03
**Success Criteria** (what must be TRUE):
  1. Each chapter displays a particle effect that matches its mood (snow, embers, dust, stars, or none) as defined in the chapter config
  2. Particle count is capped on mobile — the page remains scrollable and does not thermal-throttle on a mid-range phone
  3. A quiet ambient sound layer plays beneath the main track per chapter, with both track references sourced from the chapter config
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Content Migration | 0/TBD | Not started | - |
| 2. Foundation | 0/TBD | Not started | - |
| 3. Audio and Reading Baseline | 0/TBD | Not started | - |
| 4. Parallax and Text Effects | 0/TBD | Not started | - |
| 5. Particles and Ambient Depth | 0/TBD | Not started | - |
