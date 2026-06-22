# Book Operations

## Release Gate

Run these checks before deploying:

```bash
pnpm run build
pnpm run platform:fullstack-smoke
pnpm run platform:typecheck
pnpm test
```

Runtime and release commands use pnpm exclusively. Render installs from `pnpm-lock.yaml` with `pnpm install --frozen-lockfile` before running `pnpm run build`.

After Render deploys, run the same full-stack smoke against the deployed service:

```bash
BOOK_SMOKE_BASE_URL="https://book.onrender.com" \
BOOK_SMOKE_ADMIN_EMAIL="$ADMIN_EMAIL" \
BOOK_SMOKE_ADMIN_PASSWORD="$ADMIN_PASSWORD" \
pnpm run platform:fullstack-smoke
```

`BOOK_SMOKE_BASE_URL` may be omitted when the script runs inside Render with `RENDER_EXTERNAL_URL` available. The smoke validates health/readiness, anonymous route protection, admin login, reader chapter APIs, reader registration and state sync, search, audio asset/cue APIs, audit events, and a disposable staging-chapter publish workflow. The staging workflow creates a timestamped chapter, previews and publishes it, creates a cue, verifies broken-cue publish blocking after an anchor-removing edit, repairs the block by deleting the smoke cue, republishes, rolls back to the first published snapshot, asserts publish/blocked/rollback events, and deletes the disposable chapter during cleanup. DOCX import and chapter reordering/visibility changes remain covered by local platform smokes or manual production review.

## Required Production Environment

- `DATABASE_URL`: Postgres connection string.
- `ADMIN_EMAIL`: first admin account email.
- `ADMIN_PASSWORD`: first admin account password. Production startup fails if this is missing or still set to the removed `change-me-admin` default.
- `NODE_ENV=production`: enables secure auth cookies.
- `AUDIO_ASSET_DIR`: persistent disk path for uploaded audio assets.

The platform no longer creates default admin or reader accounts. Production admin setup must be explicit through `ADMIN_EMAIL` and `ADMIN_PASSWORD`; reader accounts are created through registration. For local admin development, export `ADMIN_EMAIL` and `ADMIN_PASSWORD` before `pnpm start`.

## Database Migration And Seed

```bash
pnpm run platform:migrate
pnpm run platform:seed-content
```

The server also applies migrations on boot and seeds static chapters when the `chapters` table is empty.

## Backups

Back up Postgres with the provider snapshot feature before releases. For a manual export:

```bash
pg_dump "$DATABASE_URL" > book-$(date +%Y-%m-%d).sql
```

Back up uploaded audio by snapshotting or copying the mounted directory configured by `AUDIO_ASSET_DIR`.

## Restore

Restore the database into a fresh Postgres instance:

```bash
psql "$DATABASE_URL" < book-YYYY-MM-DD.sql
```

Then restore the audio asset directory before restarting the app.

## Security Notes

- Login and registration are rate-limited per client address in the Node server.
- Auth cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` when `NODE_ENV=production`.
- Publish, chapter edit, audio upload, cue creation, reader registration, and reader state saves are recorded in `app_events`.
