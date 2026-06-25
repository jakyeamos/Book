# Roadmap: Immersive Book Site (Status Reconciled)

## Overview

This roadmap reflects repo and deployment reality as of 2026-06-25:

1. Legacy immersive-reader buildout (Phases 1-5) is complete.
2. Phase 06 Author Studio artifacts exist and local smoke checks pass, but the visible authoring product still exposes too much implementation machinery.
3. Render + Node + Postgres is the canonical production architecture; static hosting is no longer the product target.
4. Phase 07 closure remains provisional until Author Studio v1 acceptance is signed off.

## Phase Status

- [x] **Phase 1: Content Migration** - Complete.
- [x] **Phase 2: Foundation** - Complete.
- [x] **Phase 3: Audio and Reading Baseline** - Complete.
- [x] **Phase 4: Parallax and Text Effects** - Complete.
- [x] **Phase 5: Particles and Ambient Depth** - Complete.
- [ ] **Phase 06: Author Studio v1 + Reader Upgrade** - Active. Product-truth reconciliation, authoring UX, public admin API, security, readiness, and deployed acceptance are being completed.
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
| 06. Author Studio v1 + Reader Upgrade | 7/11 | In progress (Author Studio v1 implementation active) | Not yet |
| 07. Legacy Backlog Closure | Manual | Provisional, re-validation pending | Not yet |

## Evidence and Gaps

- `docs/phase06-acceptance-checklist.md` remains the evidence-backed production signoff artifact.
- Render-targeted smoke coverage exists through `pnpm run platform:fullstack-smoke` with `BOOK_SMOKE_BASE_URL`, `BOOK_SMOKE_ADMIN_EMAIL`, and `BOOK_SMOKE_ADMIN_PASSWORD`.
- The remaining product gap is the Author Studio experience: block-first editing, import queue, visible version history, publish readiness, and visual audio cueing.
- Security hardening now specifically means scrypt password hashes, legacy hash upgrade, and evidence-backed readiness checks.

## Notes

- Phase 06 legacy plan artifacts live at: `.planning/phases/to-do/backlog/06-prd-author-studio-reader-upgrade-for-interactive-digital-book/` when present.
- Legacy closure evidence lives at: `docs/legacy-backlog-checklist.md`.
- `gsd execute-phase` auto-runner still cannot run in this repo because `scripts/execute-plan-integrated.ts` is missing; manual execution is still required.
- Next action order: Author Studio v1 docs -> server/API/security -> admin UX -> smoke coverage -> deployed acceptance -> re-baseline Phase 07.
