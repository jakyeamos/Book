# Phase 8: QR remediation: book - Context

**Gathered:** 2026-07-04
**Status:** Ready for planning
**Source:** PRD Express Path (/Users/jakyeamos/.local/state/quality-runner/fleet/per-repo-summaries-20260704/book.md)

<domain>
## Phase Boundary

Plan the remediation work for book from Quality Runner run qr-fleet-continue-20260704-book.
This phase is planning-only until execute-phase runs. Quality Runner remains advisory-only: it identifies findings, remediation clusters, and verification suggestions, but all source changes happen in /Users/jakyeamos/projects/Book.

Findings: 16
Severity: `observation` 9, `warning` 7
Categories: `structural:deduplicate` 1, `structural:harden` 2, `structural:ponytail` 4, `structural:simplify` 3, `structural:speed` 1, `structural:ui_structural` 5
Fleet phase candidate: Phase 3 - Mixed Medium Repos
Requirement: QR-BOOK

</domain>

<decisions>
## Implementation Decisions

### D-01 - QR summary is the planning source
- Use /Users/jakyeamos/.local/state/quality-runner/fleet/per-repo-summaries-20260704/book.md and the artifacts under /Users/jakyeamos/projects/Book/.quality-runner/runs/qr-fleet-continue-20260704-book as the source of truth for this remediation phase.

### D-02 - Cluster-oriented remediation
- Plan and execute coherent remediation batches by QR cluster, not one isolated edit per finding row.

### D-03 - Behavior preservation
- Prefer behavior-preserving refactors, hardening, and simplification. Do not change product behavior unless a QR hardening cluster explicitly requires safer behavior.

### D-04 - Existing project conventions first
- Read the target files and local manifests before editing. Follow existing package-manager, formatter, test, and architecture conventions. Use pnpm for JavaScript package scripts.

### D-05 - Evidence-backed closure
- A cluster is done only when focused repo verification passes and a post-remediation QR run shows the fingerprints cleared or are dispositioned with evidence.

### Claude's Discretion
- Choose exact helper extraction boundaries, naming, and task order when the QR document identifies the finding but not the implementation shape.
- If a cluster turns out to require product, API, or design decisions, stop that cluster and capture the question instead of guessing.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Quality Runner Inputs
- `/Users/jakyeamos/.local/state/quality-runner/fleet/per-repo-summaries-20260704/book.md` - Per-repo QR summary used as this phase PRD.
- `/Users/jakyeamos/projects/Book/.quality-runner/runs/qr-fleet-continue-20260704-book/quality-audit.json` - Quality audit report.
- `/Users/jakyeamos/projects/Book/.quality-runner/runs/qr-fleet-continue-20260704-book/remediation-plan.json` - QR remediation plan.
- `/Users/jakyeamos/projects/Book/.quality-runner/runs/qr-fleet-continue-20260704-book/code-quality-scan.json` - Code-quality scan fingerprints.
- `/Users/jakyeamos/projects/Book/.quality-runner/runs/qr-fleet-continue-20260704-book/resolution-ledger.md` - Resolution ledger for closure evidence.
- `/Users/jakyeamos/projects/Book/.quality-runner/runs/qr-fleet-continue-20260704-book/agent-handoff.md` - QR agent handoff.

</canonical_refs>

<specifics>
## Top Findings

- `structural-simplify-deep-nesting` warning structural:simplify: 157 deep-nesting structural findings in simplification and shrink pass. Fix: 157 findings, aggregate score 942: Flatten guard clauses, extract decision helpers, or split rendering branches. Evidence: admin/admin.js:346: deep-nesting; admin/studio-blocks.js:71: deep-nesting; admin/studio-blocks.js:138: deep-nesting
- `structural-ui_structural-off-scale-spacing` warning structural:ui_structural: 101 off-scale-spacing structural findings in UI accessibility and structural quality. Fix: 101 findings, aggregate score 606: Use the project's spacing scale instead of arbitrary raw values. Evidence: admin/admin.css:72: off-scale-spacing; admin/admin.css:91: off-scale-spacing; admin/admin.css:110: off-scale-spacing
- `structural-harden-unsafe-html-injection` warning structural:harden: 28 unsafe-html-injection structural findings in API hardening and type safety. Fix: 28 findings, aggregate score 252: Render escaped text or sanitize trusted HTML at the boundary. Evidence: admin/admin.js:137: unsafe-html-injection; admin/admin.js:144: unsafe-html-injection; admin/admin.js:158: unsafe-html-injection
- `structural-deduplicate-near-duplicate-function` warning structural:deduplicate: 9 near-duplicate-function structural findings in duplicate consolidation and helper extraction. Fix: 9 findings, aggregate score 54: Extract a shared helper only when the call sites share domain semantics. Evidence: chapters/config.js:15: near-duplicate-function; platform/api/src/content/backfill/from-fragments.ts:8: near-duplicate-function; platform/scripts/acceptance-artifact-smoke.ts:6: near-duplicate-function
- `structural-simplify-large-source-file` warning structural:simplify: 4 large-source-file structural findings in simplification and shrink pass. Fix: 4 findings, aggregate score 36: Split mixed responsibilities into focused modules. Evidence: chapters/config.js:1: large-source-file; platform/api/src/server.ts:1: large-source-file; platform/scripts/fullstack-admin-smoke.ts:1: large-source-file
- `structural-simplify-nested-ternary` warning structural:simplify: 4 nested-ternary structural findings in simplification and shrink pass. Fix: 4 findings, aggregate score 36: Replace nested ternaries with named branches or helpers. Evidence: platform/api/src/server.ts:265: nested-ternary; platform/api/src/server.ts:1957: nested-ternary; platform/api/src/server.ts:2366: nested-ternary
- `structural-speed-await-in-loop` warning structural:speed: 5 await-in-loop structural findings in performance and batching improvements. Fix: 5 findings, aggregate score 30: Batch independent work or document required sequencing. Evidence: platform/api/src/db/postgres.ts:29: await-in-loop; platform/api/src/server.ts:376: await-in-loop; platform/api/src/server.ts:687: await-in-loop
- `structural-harden-console-output` observation structural:harden: 46 console-output structural findings in API hardening and logging. Fix: 46 findings, aggregate score 92: Use structured logging or remove runtime console output. Evidence: platform/api/src/server.ts:2736: console-output; platform/api/src/server.ts:2740: console-output; platform/scripts/acceptance-artifact-smoke.ts:43: console-output

## Remediation Clusters

1. remediate-structural-script-js (medium, score 535) - Remediate structural cluster in script.js
2. remediate-structural-platform-api-src-server-ts (medium, score 357) - Remediate structural cluster in platform/api/src/server.ts
3. remediate-structural-admin-admin-css (medium, score 194) - Remediate structural cluster in admin/admin.css
4. remediate-structural-styles-css (medium, score 170) - Remediate structural cluster in styles.css
5. remediate-structural-admin-admin-js (medium, score 80) - Remediate structural cluster in admin/admin.js
6. remediate-structural-admin-studio-blocks-js (medium, score 48) - Remediate structural cluster in admin/studio-blocks.js

</specifics>

<deferred>
## Deferred Ideas

- Broad rewrites outside the QR clusters.
- Running Quality Runner as an executor or letting QR mutate source code.
- Remediating repos outside book; each repo gets its own GSD phase.

</deferred>

---

*Phase: 8*
*Context gathered: 2026-07-04 via QR per-repo PRD*
