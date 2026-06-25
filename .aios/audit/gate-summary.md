# Gate Audit Summary

## Current run outcome

- Outcome: warnings only

## Gate decisions

- AIOS warn [warning]: AIOS warning only: possible secret literal; move to env or add `quality-gate: allow secret: <reason>`
- AIOS warn [warning]: AIOS warning only: possible secret literal; move to env or add `quality-gate: allow secret: <reason>`
- AIOS warn [warning]: AIOS warning only: possible secret literal; move to env or add `quality-gate: allow secret: <reason>`
- AIOS warn [warning]: AIOS warning only: 701 nonblank lines exceeds production source size limit 500; split by responsibility or document an exception
- Pre-CR warn [warning]: Pre-CR warning only: 0% changed-line coverage below 80% or unsupported surfaces were present.
- Pre-CR warn [warning]: Pre-CR warning only: 0% changed-line coverage below 80% or unsupported surfaces were present.
- Pre-CR warn [warning]: Pre-CR warning only: 0% changed-line coverage below 80% or unsupported surfaces were present.
- Pre-CR warn [warning]: Pre-CR warning only: 0% changed-line coverage below 80% or unsupported surfaces were present.
- AIOS warn [warning]: AIOS warning only: possible secret literal; move to env or add `quality-gate: allow secret: <reason>`
- Pre-CR warn [warning]: Pre-CR warning only: 0% changed-line coverage below 80% or unsupported surfaces were present.

## Repeated failure patterns

### Pattern: possible secret literal staged for commit
- Seen: 5 times
- Gates: AIOS
- Category: security
- Common cause: A staged change violated a deterministic commit quality rule.
- Avoid by: Never stage secret-looking literals; move values to environment configuration.
- Example fix: possible secret literal; move to env or add `quality-gate: allow secret: <reason>`

## Agent learning lessons

- Run focused tests with coverage before Pre-CR; changed lines must be covered or intentionally classified.
- Never stage secret-looking literals; move values to environment configuration.
- Split oversized files by responsibility before committing.

## Commit-readiness status

- ready with warnings
