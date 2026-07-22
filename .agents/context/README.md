---
id: book.repo-context
title: Book Repo Context
tier: project
status: active
last_reviewed: 2026-07-22
applies_when:
  - repo_context
tags:
  - book
  - context
---

# Book Repo Context

Read this index before non-trivial work in this repo. Load only the packet needed for the current task; do not dump the repository or all context packets into one prompt.

## Read When

| Task evidence | Read |
| --- | --- |
| External-facing strategy, launch, market, or audience research | [`market.md`](market.md) |
| CLI/API/tool publishing or command-surface work | [`README.md`](../../README.md) and [`package.json`](../../package.json) |
| Running checks or builds | [`README.md`](../../README.md) and [`package.json`](../../package.json) |

This repository has no local `commands.md` or `printing-press.md`; do not infer either file. Keep the reader/editor v2 boundaries in the canonical root docs and load those only when the task touches them.
