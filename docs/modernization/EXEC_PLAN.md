# Book v2 execution plan

## Strategy

Use a clean rewrite with migration and reconciliation. The legacy application
remains available as a read-only rollback source until the v2 cutover is
verified.

## Milestones

1. Design contract, tokens, shared primitives, and representative Reader/Studio
   screens.
2. Next shell, domain contracts, Postgres schema/migrations, auth boundary,
   CI, R2/local storage adapters, and Render preview.
3. One migrated chapter with scenes, music, ambience, seeking, crossfades, and
   reduced-motion behavior.
4. Studio composition editing, waveform timeline, upload/finalize, autosave,
   and validation.
5. Immutable publishing, readiness, history, rollback, visibility, and audit.
6. Reader accounts, library/search/progress, highlights, notes, preferences,
   and conflict-aware sync.
7. Legacy export, checksum reconciliation, quarantine, and full migration.
8. Read-only cutover, rollback snapshot, and removal of the legacy runtime and
   asset path.

Every milestone ends with a runnable boundary, focused tests, full v2 checks,
an atomic feature commit, and a live update to `.tracker/PROJECT_TRUTH.md`.

## Stop conditions

Publishing stops on broken anchors, missing assets, impossible fades, or
conflicting music cues. Cutover stops on checksum mismatch, missing legacy
objects, failed backup/restore, visibility regression, or failed critical
browser journey.
