---
schemaVersion: 1
projectName: Book
summary: Book has a full-stack reading platform path plus current pre-cr quality gate configuration for coverage, security, and checklist checks.
healthScore: 88
statusLabel: on_track
nextStep: Deploy the Render blueprint with production `ADMIN_EMAIL` and `ADMIN_PASSWORD`, point the live domain at the Node service, and run `BOOK_SMOKE_BASE_URL=... pnpm run platform:deployed-acceptance` against the deployed service.
blockers: []
lastUpdated: 2026-07-03
tags: [interactive-book, admin-cms, audio, typescript, publishing]
areas: [reader, admin, content-pipeline, audio-studio, publish-workflow]
goals:
  - Let nontechnical editors manage chapters without repo edits
  - Let admins upload MP3s and assign soundtrack cues through the UI
  - Preserve publish safety when chapter edits break cue anchors
repoType: app
sourceOfTruth: mixed
primaryLanguage: TypeScript
activeBranch: qr/triage-parallel-20260702T200935Z
lastCommitDate: "2026-07-03"
quality:
  lint: pass
  types: pass
  tests: pass
  deadCode: pass
  structure: pass
  dependencies: pnpm
canonicalCommands:
  install: pnpm install
  dev: pnpm run build && pnpm start
  lint: pnpm run lint:chapters
  typecheck: pnpm run platform:typecheck
  test: pnpm test
  deadcode: pnpm run audit:dead-code
agentExpectationsVersion: 1
---

## Current State

Book is a full-stack-capable interactive reading experience with chapter-specific visual themes, motion effects, particles, background music, ambient layers, optional Giscus discussion embeds, and a Node server that serves the reader, shared login route, and authenticated admin editor.

The platform layer now includes a full-stack HTTP server, Postgres migrations, database-backed content/auth/audio/reader-state persistence, static-content seeding, protected admin chapter create/edit/publish/rollback/delete APIs, audio asset/cue APIs, reader account/state/search APIs, analytics/audit events, and reader APIs that serve published DB content with static fallback for local development.

## Why This Matters / Intended Outcome

The project should become editable by nontechnical users. Chapter text, ordering, publishing, soundtrack uploads, and cue placement should happen through an admin UI rather than requiring direct repo edits to chapter files or `chapters/config.js`.

## Recent Progress

- Jun 12: Added a shared `/login` route and server redirects so anonymous `/admin`, `/me/highlights`, and `/me/notes` requests no longer fall through to 404; authenticated reader-only routes serve the reader shell.
- Jun 13: Closed remaining deployed auth gaps: extensionless `/admin/*` routes now require admin access and serve the admin shell, shared route guards read the runtime `auth_token` cookie, and production startup requires explicit admin bootstrap credentials instead of default accounts.
- Jun 13: Added disposable staging-chapter coverage to `platform:fullstack-smoke` so publish, broken-cue publish blocking, publish recovery, rollback, cleanup, and publish-related audit events are exercised through the deployed HTTP API.
- Jun 13: Normalized runtime, deployment, and operations dependency commands to pnpm and replaced the npm lockfile with `pnpm-lock.yaml`.
- Jun 24: Updated `.pre-cr.json` to use an 80% threshold with coverage, security, checklist checks, and auto coverage-path detection.
- Jun 25: Extended deployed acceptance evidence and full-stack smoke assertions so DOCX import staging, draft metadata persistence, and chapter order/type/visibility reloads are covered through live HTTP APIs.
- Jul 3: Added top-level QR-discoverable `format`, `lint`, `typecheck`, `audit:dead-code`, and `smoke` script aliases that route to existing chapter/platform validation gates.
- May 1: Added `ChapterStudioController` for admin chapter creation, editing, reordering, preview, publish, and rollback flows.
- May 1: Added `AudioStudioController` for MP3 upload, asset listing, visual block-based cue CRUD, cue repair, and publish readiness.
- May 1: Extended audio cue services/repositories with update/delete operations and MP3 upload validation.
- May 1: Added publish workflow cue validation support so broken cues can block publishing.
- May 1: Expanded editorial and audio smoke tests for chapter CMS behavior, MP3 upload, cue lifecycle, repair, and publish unblocking.
- May 1: Added an `Admin Editors` button to reader controls that navigates to `/admin`, and narrowed audio unlock warnings to true autoplay-block cases with prompt re-show cooldown.
- May 1: Fixed reader text highlighting to toggle off existing highlights instead of nesting `<mark>` elements when highlighting already-highlighted text.
- May 1: Added a static `admin/index.html` entry page so `/admin` no longer resolves to 404 in the deployed/static site.
- May 1: Replaced the placeholder admin path with an authenticated API-backed admin editor and added a Node server that serves `/admin`, reader APIs, auth APIs, and admin editing APIs.
- May 1: Added Postgres migrations, runtime migration application, content seeding, DB-backed content/auth/audio stores, Render deployment config, and full-stack smoke coverage.
- May 1: Added reader registration, DB-backed progress/highlights/notes/preferences sync, library/search/preferences UI, block-assisted admin editing, audio upload/cue UI, analytics events, login rate limiting, production cookie hardening, and operations documentation.

## Open Problems

- The full-stack admin, login, admin subroute, and reader-only paths are verified locally but not yet verified on the live domain.
- Audio asset storage is configured for a persistent managed disk by default; switching to S3/R2-style object storage would require adding that provider adapter.
- Admin block editing is functional but intentionally lightweight; a richer drag/drop editor would be a future UX pass.
- Broad QR structural findings remain outside this triage change set and need a dedicated cleanup pass.

## Next Concrete Steps

1. Create the Render service/database from `render.yaml` and set `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
2. Point the live domain at the Node service after smoke-checking `/api/health`, `/`, `/login`, and `/admin`.
3. Verify deployed UI behavior after `BOOK_SMOKE_BASE_URL=... pnpm run platform:deployed-acceptance` passes against the Node service.
4. Plan a dedicated structural cleanup pass for nested ternaries, deep nesting, unsafe HTML injection, and UI spacing findings.

## Risks / Blockers

- No code blockers remain for local full-stack verification of `/login`, `/admin`, `/admin/*`, or reader-only account routes.
- Live functionality depends on deploying the managed Node/Postgres service and moving the domain away from static-only hosting.
- Persistent audio uploads depend on the managed disk configured in `render.yaml`; object-storage provider support is still future work.

## Quality Ladder Notes

- **AIOS gate audit metadata:** recorded 2026-06-25 warning-only gate events for changed-line coverage, secret-literal reminders, and oversized-source reminders. No product files changed in that cleanup commit.
- **Lint/format baseline:** `pnpm run lint:chapters` passed on 2026-06-24.
- **Types:** `pnpm run platform:typecheck` passed on 2026-06-25.
- **Tests:** `pnpm test` passed on 2026-06-24.
- **Build:** `pnpm run build` passed on 2026-06-25 through `pnpm run platform:fullstack-smoke`.
- **Full-stack smoke:** `pnpm run platform:fullstack-smoke` passed on 2026-06-25 and now covers DOCX import staging, metadata persistence, approved chapter order/type/visibility reloads, disposable staging chapter publish, broken-cue blocking, publish recovery, rollback, cleanup, and publish audit events.
- **Platform smokes:** `pnpm run platform:import-smoke` passed on 2026-06-25; `pnpm run platform:auth-smoke` passed on 2026-06-13; editorial, audio, reader sync, and phase06 smoke scripts previously passed on 2026-05-01.
- **Dead code:** `pnpm run audit:dead-code` passes through TypeScript `--noUnusedLocals` / `--noUnusedParameters` checks as of 2026-07-03.
- **Security:** package management now uses pnpm; production admin bootstrap rejects missing credentials and the removed `change-me-admin` default.

## Agent Notes

- Static reader edits still live in `chapters/` and `chapters/config.js`, but the intended direction is admin-managed content and cues.
- The portfolio tracker should map the `book` project slug to this file.
- Keep future state updates focused on the live project snapshot, not a changelog dump.
