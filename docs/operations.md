# Book Operations

## Release Gate

Run these checks before deploying:

```bash
npm run build
npm run platform:fullstack-smoke
npm run platform:typecheck
npm test
```

## Required Production Environment

- `DATABASE_URL`: Postgres connection string.
- `ADMIN_EMAIL`: first admin account email.
- `ADMIN_PASSWORD`: first admin account password.
- `NODE_ENV=production`: enables secure auth cookies.
- `AUDIO_ASSET_DIR`: persistent disk path for uploaded audio assets.

## Database Migration And Seed

```bash
npm run platform:migrate
npm run platform:seed-content
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
