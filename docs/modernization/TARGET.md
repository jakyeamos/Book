# Book v2 target

Book v2 is a narrative soundtrack platform: reading, atmosphere, composition,
and publishing are one versioned product.

## Product direction

The reader is immersive, animated, and classy. It uses a near-black canvas,
restrained literary typography, chapter-specific accents, and motion that makes
the text feel situated without competing with it. Studio is neutral and task
first: a clear scene rail, synchronized preview, timeline lanes, waveform
peaks, cue inspector, and readiness errors with direct navigation.

The product explicitly avoids generic SaaS card grids, neon/cyberpunk styling,
gradient text, decorative glass surfaces, and audio-dependent text rendering.

## Architecture

- Next.js App Router and React Server Components by default.
- Strict TypeScript with `@/*` imports and Zod contracts.
- Direct `pg` repositories using one checked-out client per transaction.
- `src/domain` for composition and publication rules.
- `src/server` for authorization, actions, uploads, and observability.
- `src/db` for the singleton pool, migrations, repositories, and transactions.
- `src/audio` for Web Audio transport, cue resolution, and waveform handling.
- `src/storage` for the private R2 adapter and local development adapter.
- `src/components` for shared accessible primitives and Reader/Studio surfaces.

## Invariants

Stable chapter identity points to immutable revisions. Draft changes never
remove the live publication. Document, experience, assets, and publication
pointer change atomically. Visibility is server enforced. Anchors are stable
block IDs. R2 credentials remain server-only and published audio is exposed
only through short-lived signed URLs.

## Explicit non-goals

Native apps, billing, multi-tenant collaboration, real-time co-editing,
one-shot effects, and advanced automation are deferred.
