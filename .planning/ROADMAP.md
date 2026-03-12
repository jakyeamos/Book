# Roadmap: Immersive Book Site (Reconciled)

## Overview

The roadmap now reflects three realities in the correct order:

1. Legacy immersive-reader buildout (Phases 1-5), completed on 2026-03-10.
2. PRD pivot execution (Phase 06: Author Studio + Reader Upgrade), completed on 2026-03-11.
3. Legacy backlog closure pass (Phase 07), manually executed on 2026-03-11.

## Executed Phases

- [x] **Phase 1: Content Migration** - Chapters migrated to `chapters/`, manifest and shell refactor completed.
- [x] **Phase 2: Foundation** - Central `chapters/config.js`, CSS theme variables, transitions, production-safe logging.
- [x] **Phase 3: Audio and Reading Baseline** - Audio crossfade, paragraph reveal, title entrance, Giscus fallback/config loader.
- [x] **Phase 4: Parallax and Text Effects** - Parallax layers, poetry reveal with skip, bold escalation animation.
- [x] **Phase 5: Particles and Ambient Depth** - tsParticles per chapter, mobile particle caps, ambient audio layer.
- [x] **Phase 06: PRD Author Studio + Reader Upgrade** - Hybrid platform foundation (normalized content model, admin/auth, DOCX staging, editorial workflow, audio studio, reader sync, runtime reliability).
- [x] **Phase 07: Legacy Backlog Closure** - Completed deferred quality/content/asset/accessibility backlog items and reconciled repo status.

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

### Phase 06: PRD Author Studio + Reader Upgrade
- [x] 06-01-PLAN.md
- [x] 06-02-PLAN.md
- [x] 06-03-PLAN.md
- [x] 06-04-PLAN.md
- [x] 06-05-PLAN.md
- [x] 06-06-PLAN.md
- [x] 06-07-PLAN.md

### Phase 07: Legacy Backlog Closure
- [x] Manually executed checklist: `docs/legacy-backlog-checklist.md`

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Content Migration | 5/5 | Complete | 2026-03-10 |
| 2. Foundation | 3/3 | Complete | 2026-03-10 |
| 3. Audio and Reading Baseline | 3/3 | Complete | 2026-03-10 |
| 4. Parallax and Text Effects | 3/3 | Complete | 2026-03-10 |
| 5. Particles and Ambient Depth | 2/2 | Complete | 2026-03-10 |
| 06. PRD Author Studio + Reader Upgrade | 7/7 | Complete | 2026-03-11 |
| 07. Legacy Backlog Closure | Manual | Complete | 2026-03-11 |

## Notes

- Phase 06 artifacts live at: `.planning/phases/to-do/backlog/06-prd-author-studio-reader-upgrade-for-interactive-digital-book/`.
- Legacy closure evidence lives at: `docs/legacy-backlog-checklist.md`.
- `gsd execute-phase` auto-runner still cannot run in this repo because `scripts/execute-plan-integrated.ts` is missing; manual execution was used for Phases 06-07.
