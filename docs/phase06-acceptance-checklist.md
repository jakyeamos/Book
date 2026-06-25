# Phase 06 Author Studio v1 Acceptance Checklist

Status snapshot (2026-06-25):
- Local smoke scripts exist and passed before Author Studio v1 implementation began.
- Production acceptance is not signed off.
- Render + Node + Postgres is the canonical production target.
- Keep checklist items unchecked until the deployed Render service is verified with `BOOK_SMOKE_BASE_URL`, `BOOK_SMOKE_ADMIN_EMAIL`, and `BOOK_SMOKE_ADMIN_PASSWORD`, or with an explicit manual browser check noted beside the item.

## Admin + Editorial
- [ ] Admin login protects `/admin` route on deployed Render. Evidence: `BOOK_SMOKE_BASE_URL=... pnpm run platform:fullstack-smoke`.
- [ ] Author Studio loads a block-first editor for an existing chapter without requiring raw HTML edits.
- [ ] DOCX import creates a staged draft from `/admin`.
- [ ] Staging metadata edits persist and approved drafts create chapters.
- [ ] Chapter order, type, and visibility update from admin tools.
- [ ] Version history is visible in `/admin`.
- [ ] Publish and rollback both succeed on deployed Render. Evidence: disposable staging chapter in `platform:fullstack-smoke`.

## Audio Studio
- [ ] Music and ambient assets can be uploaded and listed from `/admin`.
- [ ] Multiple cues can be assigned to the same chapter without typing block IDs.
- [ ] Cue update works without delete/recreate.
- [ ] Broken cues are detected after anchor changes. Evidence: deployed full-stack smoke.
- [ ] Publish is blocked until broken cues are repaired or deleted. Evidence: deployed full-stack smoke plus manual UI check.

## Reader Sync
- [ ] Logged-in reader highlights sync across sessions. Reader state persistence is covered by `BOOK_SMOKE_BASE_URL=... pnpm run platform:fullstack-smoke`; cross-device UI verification remains manual.
- [ ] Notes are linked to highlights and restored on load. API persistence is covered by `BOOK_SMOKE_BASE_URL=... pnpm run platform:fullstack-smoke`; UI linking remains manual.
- [ ] Progress sync restores resume state. API persistence is covered by `BOOK_SMOKE_BASE_URL=... pnpm run platform:fullstack-smoke`; UI resume behavior remains manual.
- [ ] Anonymous reading remains functional. Reader manifest and chapter APIs are covered by `BOOK_SMOKE_BASE_URL=... pnpm run platform:fullstack-smoke`.

## Runtime Reliability
- [ ] Chapter transitions avoid stale/racing state application.
- [ ] Cue scheduling handles chapter changes and pause/resume.
- [ ] Metrics are emitted for author, audio, publish, and reader outcomes. Reader, audio/admin, publish success, publish-blocked, and rollback audit events are covered by `BOOK_SMOKE_BASE_URL=... pnpm run platform:fullstack-smoke`.

## Security + Durability
- [ ] Production rejects missing or removed default admin credentials.
- [ ] Password login works for scrypt hashes and legacy hashes are upgraded on successful login.
- [ ] `/api/deploy/readiness` reports evidence-backed database and audio storage checks.
- [ ] Postgres backup/restore and uploaded-audio backup/restore steps are documented in `docs/operations.md`.
