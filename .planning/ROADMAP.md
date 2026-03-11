# Roadmap: Immersive Book Site

## Overview

The project was executed in two acts. First, drafted chapters were migrated into standalone HTML fragments with manifest-driven loading. Second, cinematic atmosphere features were layered in phase order: foundation config and theming, audio and reading baseline, parallax/text effects, then particles and ambient depth.

## Phases

- [x] **Phase 1: Content Migration** - Chapters migrated to `chapters/`, manifest and shell refactor completed.
- [x] **Phase 2: Foundation** - Central `chapters/config.js`, CSS theme variables, transitions, production-safe logging.
- [x] **Phase 3: Audio and Reading Baseline** - Audio crossfade, paragraph reveal, title entrance, Giscus fallback/config loader.
- [x] **Phase 4: Parallax and Text Effects** - Parallax layers, poetry reveal with skip, bold escalation animation.
- [x] **Phase 5: Particles and Ambient Depth** - tsParticles per chapter, mobile particle caps, ambient audio layer.
- [ ] **Phase 6: Content Completion** - Fill Ch3–6 stubs from raw sources; author resolves Ch1/Ch2 canonical discrepancies; validate-chapters word-count guard.
- [ ] **Phase 7: Assets & External Configuration** - Source/create all ambient audio loops; create or document parallax images for Ch1–2; configure Giscus on GitHub repo.
- [ ] **Phase 8: Code Quality & Accessibility** - Scroll save throttle; combined Google Fonts import; mobile audio unlock prompt; effects/animation toggle; SRI integrity hashes on CDN scripts; replace Jekyll CI with plain static deploy; fix package.json module type.

## Plan Completion

### Phase 1: Content Migration
- [x] 01-01-PLAN.md
- [x] 01-02-PLAN.md
- [x] 01-03-PLAN.md
- [x] 01-04-PLAN.md
- [x] 01-05-PLAN.md

### Phase 2: Foundation
- [x] 02-01-PLAN.md
- [x] 02-02-PLAN.md
- [x] 02-03-PLAN.md

### Phase 3: Audio and Reading Baseline
- [x] 03-01-PLAN.md
- [x] 03-02-PLAN.md
- [x] 03-03-PLAN.md

### Phase 4: Parallax and Text Effects
- [x] 04-01-PLAN.md
- [x] 04-02-PLAN.md
- [x] 04-03-PLAN.md

### Phase 5: Particles and Ambient Depth
- [x] 05-01-PLAN.md
- [x] 05-02-PLAN.md

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Content Migration | 5/5 | Complete | 2026-03-10 |
| 2. Foundation | 3/3 | Complete | 2026-03-10 |
| 3. Audio and Reading Baseline | 3/3 | Complete | 2026-03-10 |
| 4. Parallax and Text Effects | 3/3 | Complete | 2026-03-10 |
| 5. Particles and Ambient Depth | 2/2 | Complete | 2026-03-10 |
| 6. Content Completion | 0/TBD | Planned | — |
| 7. Assets & External Configuration | 0/TBD | Planned | — |
| 8. Code Quality & Accessibility | 0/TBD | Planned | — |

## Notes

- Giscus is wired with a fallback placeholder when repo IDs are not configured in `chapters/config.js`.
- Config references placeholder parallax/ambient asset paths (`assets/...`) for later asset authoring.
