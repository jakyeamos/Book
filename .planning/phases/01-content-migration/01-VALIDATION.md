---
phase: 1
slug: content-migration
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-10
---

# Phase 1 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None detected — custom Node.js validator (Wave 0 creates it) |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `node tools/validate-chapters.cjs --check [chNN]` |
| **Full suite command** | `node tools/validate-chapters.cjs --full` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `node tools/validate-chapters.cjs --check [chNN]` for the chapter just written
- **After every plan wave:** Run `node tools/validate-chapters.cjs --full`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** ~5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 1-01-01 | 01 | 0 | CONT-01–09 | infra | `node tools/validate-chapters.cjs --full` | ❌ W0 | ⬜ pending |
| 1-02-01 | 02 | 1 | CONT-01 | smoke | `test -s chapters/DISCREPANCY.md` | ❌ W0 | ⬜ pending |
| 1-02-02 | 02 | 1 | CONT-02 | structural | `node tools/validate-chapters.cjs --check ch01` | ❌ W0 | ⬜ pending |
| 1-02-03 | 02 | 1 | CONT-03 | structural | `node tools/validate-chapters.cjs --check ch02` | ❌ W0 | ⬜ pending |
| 1-03-01 | 03 | 2 | CONT-04 | structural | `node tools/validate-chapters.cjs --check ch03 ch04 ch05 ch06 ch07` | ❌ W0 | ⬜ pending |
| 1-03-02 | 03 | 2 | CONT-05 | structural | `node tools/validate-chapters.cjs --check ch08` | ❌ W0 | ⬜ pending |
| 1-03-03 | 03 | 2 | CONT-06 | structural | `node tools/validate-chapters.cjs --check ch09 ch10` | ❌ W0 | ⬜ pending |
| 1-03-04 | 03 | 2 | CONT-07 | structural | `node tools/validate-chapters.cjs --check ch15` | ❌ W0 | ⬜ pending |
| 1-04-01 | 04 | 3 | CONT-08 | lint | `node tools/validate-chapters.cjs --lint-formatting` | ❌ W0 | ⬜ pending |
| 1-04-02 | 04 | 3 | CONT-09 | structural | `node tools/validate-chapters.cjs --manifest` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tools/validate-chapters.cjs` — covers CONT-01 through CONT-09 structural, lint, and manifest checks
- [ ] `chapters/` directory — created as part of Wave 0 setup
- [ ] `npm init -y && npm install mammoth` — local install in project root

*All chapter file references are Wave 0 gaps — no test infrastructure exists yet.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Chapter text reads correctly in browser (formatting visually correct) | CONT-08 | Browser rendering required; structural checks only verify class presence | Open index.html, select each chapter, visually confirm `.poetic-text`, `.bold-grow-*`, and date/location headers render |
| Chapter 1 discrepancy review | CONT-01 | Human judgment required to decide which version is canonical | Read DISCREPANCY.md, compare HTML vs docx content, decide with author |
| Chapter 2 Harley character decision | CONT-03 | Requires author input on whether named character or anonymous italic is intended | Read DISCREPANCY.md Ch2 section, confirm intent with author |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 10s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
