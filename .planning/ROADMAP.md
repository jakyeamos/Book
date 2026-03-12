# Roadmap: Immersive Book Site (Status Reconciled)

## Overview

This roadmap reflects repo and deployment reality as of 2026-03-12:

1. Legacy immersive-reader buildout (Phases 1-5) is complete.
2. Phase 06 implementation artifacts exist and local smoke checks pass, but acceptance is not signed off.
3. Phase 07 closure was previously marked complete, but is provisional until Phase 06 acceptance and deployment gaps are resolved.

## Phase Status

- [x] **Phase 1: Content Migration** - Complete.
- [x] **Phase 2: Foundation** - Complete.
- [x] **Phase 3: Audio and Reading Baseline** - Complete.
- [x] **Phase 4: Parallax and Text Effects** - Complete.
- [x] **Phase 5: Particles and Ambient Depth** - Complete.
- [ ] **Phase 06: PRD Author Studio + Reader Upgrade** - Implementation complete locally; production acceptance, security, and persistence hardening pending.
- [ ] **Phase 07: Legacy Backlog Closure** - Provisional; requires re-validation after Phase 06 signoff.

## Plan Artifact Completion

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
- [ ] 06-08-PLAN.md
- [ ] 06-09-PLAN.md
- [ ] 06-10-PLAN.md
- [ ] 06-11-PLAN.md

### Phase 07: Legacy Backlog Closure
- [x] Manually executed checklist: `docs/legacy-backlog-checklist.md`

## Progress

| Phase | Plans Complete | Status | Signed Off |
|-------|----------------|--------|------------|
| 1. Content Migration | 5/5 | Complete | 2026-03-10 |
| 2. Foundation | 3/3 | Complete | 2026-03-10 |
| 3. Audio and Reading Baseline | 3/3 | Complete | 2026-03-10 |
| 4. Parallax and Text Effects | 3/3 | Complete | 2026-03-10 |
| 5. Particles and Ambient Depth | 2/2 | Complete | 2026-03-10 |
| 06. PRD Author Studio + Reader Upgrade | 7/11 | In progress (deployment + acceptance + hardening queued) | Not yet |
| 07. Legacy Backlog Closure | Manual | Provisional, re-validation pending | Not yet |

## Evidence and Gaps

- `docs/phase06-acceptance-checklist.md` remains unchecked.
- Blocking human verification gate remains open in `06-07-PLAN.md` and continues in `06-09-PLAN.md`.
- Live Netlify verification on 2026-03-12 found `https://chsbook.netlify.app/admin` and `https://chsbook.netlify.app/login` returning HTTP 404.
- Auth currently includes default credential bootstrap and non-production-grade password hashing/storage assumptions.

## Notes

- Phase 06 artifacts live at: `.planning/phases/to-do/backlog/06-prd-author-studio-reader-upgrade-for-interactive-digital-book/`.
- Legacy closure evidence lives at: `docs/legacy-backlog-checklist.md`.
- `gsd execute-phase` auto-runner still cannot run in this repo because `scripts/execute-plan-integrated.ts` is missing; manual execution is still required.
- Next action order: `06-08` -> `06-09` -> `06-10` -> `06-11`, then re-baseline Phase 07.
