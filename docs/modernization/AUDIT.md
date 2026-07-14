# Book v2 audit

## Baseline

The repository contains a working reader and a TypeScript/Postgres platform
layer, but they are separate runtime authorities. The legacy Node server is a
large request router and the browser reader still owns chapter rendering,
audio state, and static chapter files. The current admin/audio services prove
that the domain is valuable, but their contracts are not the same contracts
used by the reader.

The baseline checks on the v2 branch are green:

- `pnpm test`
- `pnpm typecheck`
- `pnpm build`
- `pnpm v2:lint`
- `pnpm v2:typecheck`
- `pnpm v2:test`
- `pnpm v2:build`

## What is worth preserving

- Authored chapter prose and stable chapter identity.
- Reader highlights, notes, progress, and account ownership rules.
- Audio assets, cue ranges, publish readiness, and audit events.
- The existing Postgres schema as migration source material.
- Render/Postgres deployment while R2 becomes the production asset store.

## Risks found

- Legacy static serving can expose repository files.
- Published content and draft editing are not isolated by immutable revision.
- Legacy visibility modes are not consistently enforced at every read path.
- Raw HTML is a runtime authority and creates an injection surface.
- Pool-level queries make multi-step mutations harder to make atomic.
- Audio files depend on a persistent application disk.
- Reader and Studio have no shared typed composition contract.
- Browser acceptance coverage is incomplete for keyboard, responsive, and
  synchronized playback behavior.

## v2 constraint

The rewrite must have one typed composition model. Text blocks, scenes, cues,
assets, and publication state move together through a revision. Legacy HTML and
asset paths are import inputs only; they are never used as v2 runtime authority.
