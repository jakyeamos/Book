# Legacy Backlog Execution Checklist

Updated: 2026-03-11
Scope: Legacy backlog items deferred after PRD pivot (from old Phase 6-8 track).

## Content Completion

- [x] CONT-10: Chapters 3-6 have non-stub authored content.
  - Verified: validator now enforces prose thresholds and passes ch03-ch06.
- [x] CONT-11: Ch1/Ch2 canonical discrepancy resolved.
  - Verified: `chapters/DISCREPANCY.md` updated to resolved working canon decisions.
- [x] CONT-12: `tools/validate-chapters.cjs` enforces minimum word-count guard.
  - Verified: `MIN_WORD_COUNT_BY_SLUG` + placeholder guard implemented.

## Assets & External Configuration

- [x] ASSET-01: Ambient references are valid.
  - Verified: chapter `ambientTrack` values are explicitly `null` (no broken paths).
- [x] ASSET-02: Parallax image references are valid or intentionally removed.
  - Verified: gradient-only parallax mode is the intentional baseline in `chapters/config.js` (fallback layers, no missing image references).
- [x] CMTS-02: Giscus production config is populated.
  - Verified: `repo`, `repoId`, and `categoryId` are present with non-placeholder values.

## Code Quality & Accessibility

- [x] QUAL-01: Scroll save throttled to >=500ms.
- [x] QUAL-02: Google Fonts imports consolidated to one request.
- [x] QUAL-03: CDN scripts include SRI integrity hashes.
- [x] QUAL-04: Jekyll GH Pages workflow replaced with plain static deploy.
- [x] QUAL-05: Package metadata cleaned (`mammoth` moved to `devDependencies`, `type` retained intentionally as `commonjs`).
- [x] QUAL-06: `syncToViewportLine` checks `destroyed` after each await.
- [x] QUAL-07: Dead `.chapter-theme[data-chapter="chapter1/2"]` CSS rules removed.
- [x] ACCS-02: Mobile audio unlock prompt shown when autoplay is blocked.
- [x] ACCS-03: Effects toggle allows disabling particles/scroll animations.

## Verification

- `npm run validate:chapters` passes with updated guardrails.
- Workflow now deploys as static Pages artifact and writes `.nojekyll`.
