# Book v2 progress

## Milestone 1 — design and foundation

Status: complete for the foundation slice; the migrated-data and full Studio
workflow milestones remain.

Completed:

- Product and design contracts in `PRODUCT.md` and `DESIGN.md`.
- Next App Router shell and route groups.
- Strict composition contracts, fixtures, playback resolver, and validation.
- Reader chapter preview and Studio composition prototype.
- Postgres pool/migration foundation.
- R2 and local asset-store interfaces.
- R2 upload intent/finalize/read APIs with strict MIME, size, checksum, origin,
  and signed-URL validation.
- Studio draft autosave, atomic publish/readiness routes, revision history
  surface, and server-owned reader progress/annotation mutation contracts.
- Deterministic legacy HTML/audio reconciliation with quarantine reports.
- Numbered Postgres migration discovery, audit/reader tables, asset metadata,
  and hashed-session tables.
- Vitest and Next build/type/lint scripts.

Next:

- Wire the Studio controls to draft persistence, cue editing, and immutable
  history data loaded from Postgres.
- Add account-backed annotation/progress synchronization.
- Migrate all legacy chapters and cues into v2 with reconciliation reports.
- Exercise R2 staging-bucket and Postgres backup/restore cutover checks.
