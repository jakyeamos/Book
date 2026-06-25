# Gate Learning Lessons

## Active repeated failure patterns

### Pattern: possible secret literal staged for commit
- Seen: 5 times
- Gates: AIOS
- Category: security
- Common cause: A staged change violated a deterministic commit quality rule.
- Avoid by: Never stage secret-looking literals; move values to environment configuration.
- Example fix: possible secret literal; move to env or add `quality-gate: allow secret: <reason>`

## Current repo-specific rules learned from gate history

- Run focused tests with coverage before Pre-CR; changed lines must be covered or intentionally classified.
- Never stage secret-looking literals; move values to environment configuration.
- Split oversized files by responsibility before committing.

## High-priority agent reminders

