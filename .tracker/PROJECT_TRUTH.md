---
schemaVersion: 1
projectName: Book
summary: Book v2 foundation, draft publishing/reader-sync boundaries, deterministic all-chapter legacy export, rollback safety, and editable Studio cue controls are implemented on codex/book-v2-rewrite.
healthScore: 76
statusLabel: modernization_in_progress
nextStep: Wire the Studio controls to Postgres-loaded drafts/history, then import the exported chapters and reconciled audio into a staging database.
blockers: []
lastUpdated: 2026-07-14
tags: [interactive-book, admin-cms, audio, typescript, publishing]
areas: [reader, admin, content-pipeline, audio-studio, publish-workflow]
goals:
  - Let nontechnical editors manage chapters without repo edits
  - Let admins upload MP3s and assign soundtrack cues through the UI
  - Preserve publish safety when chapter edits break cue anchors
repoType: app
sourceOfTruth: mixed
primaryLanguage: TypeScript
activeBranch: codex/book-v2-rewrite
lastCommitDate: "2026-07-14"
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

The v2 foundation now includes a Next.js App Router shell, strict composition and
publish-readiness contracts, Postgres migration discovery and transaction
boundaries, published-revision reader hydration with visibility enforcement,
R2/local asset adapters with checksum finalization, a synchronized Reader/Studio
prototype, migration reconciliation tooling, and browser/unit verification.

## Why This Matters / Intended Outcome

The project should become editable by nontechnical users. Chapter text, ordering, publishing, soundtrack uploads, and cue placement should happen through an admin UI rather than requiring direct repo edits to chapter files or `chapters/config.js`.

## Recent Progress
- Jul 10: Added a TypeScript 7 upgrade audit documenting the shared platform config's TypeScript 5.9 baseline, `moduleResolution: "node"` blocker, and deferred-upgrade recommendation.
- Jun 12: Added a shared `/login` route and server redirects so anonymous `/admin`, `/me/highlights`, and `/me/notes` requests no longer fall through to 404; authenticated reader-only routes serve the reader shell.
- Jun 13: Closed remaining deployed auth gaps: extensionless `/admin/*` routes now require admin access and serve the admin shell, shared route guards read the runtime `auth_token` cookie, and production startup requires explicit admin bootstrap credentials instead of default accounts.
- Jun 13: Added disposable staging-chapter coverage to `platform:fullstack-smoke` so publish, broken-cue publish blocking, publish recovery, rollback, cleanup, and publish-related audit events are exercised through the deployed HTTP API.
- Jun 13: Normalized runtime, deployment, and operations dependency commands to pnpm and replaced the npm lockfile with `pnpm-lock.yaml`.
- Jun 24: Updated `.pre-cr.json` to use an 80% threshold with coverage, security, checklist checks, and auto coverage-path detection.
- Jun 25: Extended deployed acceptance evidence and full-stack smoke assertions so DOCX import staging, draft metadata persistence, and chapter order/type/visibility reloads are covered through live HTTP APIs.
- Jul 3: Added top-level QR-discoverable `format`, `lint`, `typecheck`, `audit:dead-code`, and `smoke` script aliases that route to existing chapter/platform validation gates.
- Jul 14: Started the clean v2 rewrite on `codex/book-v2-rewrite`; added `PRODUCT.md`, `DESIGN.md`, Next shell, typed scene/cue model, published reader repository, Studio composition prototype, R2 upload/finalize/read APIs, deterministic legacy reconciliation, hashed-session foundation, and Playwright coverage. Commit `e1cda27`.
- Jul 14: Added draft autosave, atomic publish/readiness routes, revision history surface, server-owned progress/annotation mutation contracts, and session-gated reader APIs. Commit `39befaa`.
- Jul 14: Added deterministic all-chapter HTML-to-block/cue export (`pnpm v2:export-content`) for the 11 legacy chapters; output remains a migration artifact until checksum reconciliation and staging import pass. Commit `68467da`.
- Jul 14: Added rollback-as-new-draft safety, editable cue fields/waveform peaks, and the Studio rollback API. Commit `d52255d`.
- May 1: Added `ChapterStudioController` for admin chapter creation, editing, reordering, preview, publish, and rollback flows.
- May 1: Added `AudioStudioController` for MP3 upload, asset listing, visual block-based cue CRUD, cue repair, and publish readiness.
- May 1: Extended audio cue services/repositories with update/delete operations and MP3 upload validation.
- May 1: Added publish workflow cue validation support so broken cues can block publishing.
- May 1: Expanded editorial and audio smoke tests for chapter CMS behavior, MP3 upload, cue lifecycle, repair, and publish unblocking.
- May 1: Added an `Admin Editors` button to reader controls that navigates to `/admin`, and narrowed audio unlock warnings to true autoplay-block cases with prompt re-show cooldown.
- May 1: Fixed reader text highlighting to toggle off existing highlights instead of nesting `<mark>` elements when highlighting already-highlighted text.
- May 1: Added a static `admin/index.html` entry page so `/admin` no longer resolves to 404 in the deployed/static site.

## Open Problems

- The full-stack admin, login, admin subroute, and reader-only paths are verified locally but not yet verified on the live domain.
- V2 Studio controls now edit local draft state and can autosave through the API; Postgres-loaded drafts/history and account login UI are not yet wired through.
- R2 production requires bucket credentials, staging smoke tests, and the legacy audio migration before cutover.
- The legacy runtime remains in the repository for rollback and must not be removed until v2 migration reconciliation passes.
- Broad QR structural findings remain outside this triage change set and need a dedicated cleanup pass.

## Next Concrete Steps

1. Provision Postgres and private R2 credentials for a v2 preview, then run `pnpm v2:migrate`.
2. Implement Studio draft autosave, scene/cue editing, publish blocking, history, and rollback.
3. Run the legacy manifest/checksum reconciliation against all chapter audio and import valid chapter revisions.
4. Complete account-backed progress/annotations and execute the read-only cutover with rollback snapshots.

## Risks / Blockers

- No code blockers remain for local full-stack verification of `/login`, `/admin`, `/admin/*`, or reader-only account routes.
- Live functionality depends on deploying the managed Node/Postgres service and moving the domain away from static-only hosting.
- R2 credentials and a staging bucket are external prerequisites for production asset verification.
- The legacy export maps line cues to stable block anchors, but asset duration/checksum metadata still must be reconciled before any cue is marked ready.
- The live domain still points at the legacy deployment path until v2 cutover is explicitly approved.

## Quality Ladder Notes

- **TypeScript 7 audit doc:** `git diff --check -- TYPESCRIPT_7_UPGRADE_AUDIT.md .tracker/PROJECT_TRUTH.md` — PASS on 2026-07-10; local commit quality gate passed. No package/config changes were made.
- **AIOS gate audit metadata:** recorded 2026-06-25 warning-only gate events for changed-line coverage, secret-literal reminders, and oversized-source reminders. No product files changed in that cleanup commit.
- **Lint/format baseline:** `pnpm run lint:chapters` passed on 2026-06-24.
- **Types:** `pnpm run platform:typecheck` passed on 2026-06-25.
- **Tests:** `pnpm test` passed on 2026-06-24.
- **Build:** `pnpm run build` passed on 2026-06-25 through `pnpm run platform:fullstack-smoke`.
- **Full-stack smoke:** `pnpm run platform:fullstack-smoke` passed on 2026-06-25 and now covers DOCX import staging, metadata persistence, approved chapter order/type/visibility reloads, disposable staging chapter publish, broken-cue blocking, publish recovery, rollback, cleanup, and publish audit events.
- **Platform smokes:** `pnpm run platform:import-smoke` passed on 2026-06-25; `pnpm run platform:auth-smoke` passed on 2026-06-13; editorial, audio, reader sync, and phase06 smoke scripts previously passed on 2026-05-01.
- **Dead code:** `pnpm run audit:dead-code` passes through TypeScript `--noUnusedLocals` / `--noUnusedParameters` checks as of 2026-07-03.
- **Book v2 verification:** `pnpm v2:typecheck`, `pnpm v2:lint`, `pnpm v2:test` (19 tests), `pnpm v2:build`, `pnpm build`, `pnpm typecheck`, `pnpm test`, and `pnpm v2:test:e2e` (3 flows) passed on 2026-07-14.
- **Book v2 migration/storage:** numbered migrations through `0004_v2_identity`, checksum-addressed R2/local adapters, upload/finalize/read authorization, and legacy asset/document reconciliation are committed in `e1cda27`.
- **Security:** package management now uses pnpm; production admin bootstrap rejects missing credentials and the removed `change-me-admin` default.

## Agent Notes

- Static reader edits still live in `chapters/` and `chapters/config.js`, but the intended direction is admin-managed content and cues.
- The portfolio tracker should map the `book` project slug to this file.
- Keep future state updates focused on the live project snapshot, not a changelog dump.

## QR Remediation Planning

- 2026-07-04: Added GSD Phase 8 for QR remediation from qr-fleet-continue-20260704-book; 2 plan(s) created from book.md. Execution has not started.
