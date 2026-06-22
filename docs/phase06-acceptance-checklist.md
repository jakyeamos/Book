# Phase 06 Acceptance Checklist

Status snapshot (2026-03-12):
- Local smoke scripts exist and pass.
- Production acceptance is not signed off.
- Live verification at `https://chsbook.netlify.app` showed `/admin` and `/login` returning HTTP 404.
- Keep checklist items unchecked until human end-to-end verification is completed.

## Admin + Editorial
- [ ] Admin login protects `/admin` route. Covered by `BOOK_SMOKE_BASE_URL=... pnpm run platform:fullstack-smoke`.
- [ ] DOCX import creates staged draft.
- [ ] Staging metadata edits persist.
- [ ] Chapter order, type, and visibility update from admin tools.
- [ ] Publish and rollback both succeed. Covered on a disposable staging chapter by `BOOK_SMOKE_BASE_URL=... pnpm run platform:fullstack-smoke`.

## Audio Studio
- [ ] Music and ambient assets can be uploaded and listed. Music asset upload is covered by `BOOK_SMOKE_BASE_URL=... pnpm run platform:fullstack-smoke`; ambient remains manual.
- [ ] Multiple cues can be assigned to the same chapter. Single cue creation/deletion is covered by `BOOK_SMOKE_BASE_URL=... pnpm run platform:fullstack-smoke`; multiple-cue authoring remains manual.
- [ ] Broken cues are detected after anchor changes. Covered on a disposable staging chapter by `BOOK_SMOKE_BASE_URL=... pnpm run platform:fullstack-smoke`.
- [ ] Publish is blocked until broken cues are repaired. Covered on a disposable staging chapter by `BOOK_SMOKE_BASE_URL=... pnpm run platform:fullstack-smoke`.

## Reader Sync
- [ ] Logged-in reader highlights sync across sessions. Reader state persistence is covered by `BOOK_SMOKE_BASE_URL=... pnpm run platform:fullstack-smoke`; cross-device UI verification remains manual.
- [ ] Notes are linked to highlights and restored on load. API persistence is covered by `BOOK_SMOKE_BASE_URL=... pnpm run platform:fullstack-smoke`; UI linking remains manual.
- [ ] Progress sync restores resume state. API persistence is covered by `BOOK_SMOKE_BASE_URL=... pnpm run platform:fullstack-smoke`; UI resume behavior remains manual.
- [ ] Anonymous reading remains functional. Reader manifest and chapter APIs are covered by `BOOK_SMOKE_BASE_URL=... pnpm run platform:fullstack-smoke`.

## Runtime Reliability
- [ ] Chapter transitions avoid stale/racing state application.
- [ ] Cue scheduling handles chapter changes and pause/resume.
- [ ] Metrics are emitted for author, audio, publish, and reader outcomes. Reader, audio/admin, publish success, publish-blocked, and rollback audit events are covered by `BOOK_SMOKE_BASE_URL=... pnpm run platform:fullstack-smoke`.
