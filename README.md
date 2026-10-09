# Dossier

Contracts & invoices platform by [RED SHADOWS | RS](https://github.com/red-shadows-rs). One **dossier** per project gathering: client, contract(s), payment schedule, invoices, payments, attachments and activity. Contracts and invoices are exported as PDFs in Arabic, English, or both side by side.

Built with Next.js + TypeScript + SQLite, fully self-hosted, no external services. Sibling project: [task-board](https://github.com/red-shadows-rs/taskboard) (same stack, same conventions).

## Status

Implementation in progress. See `DOSSIER_PLAN.md` (the implementation specification) and `PROGRESS.md`.

## Tech stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16 (App Router), TypeScript strict |
| UI | React + Tailwind CSS, small hand-written component set |
| i18n | next-intl (cookie-based locale, no URL prefixes), Arabic default with full RTL |
| DB | SQLite via better-sqlite3 + Drizzle ORM |
| PDF | Playwright (Chromium `page.pdf()`), self-hosted Cairo font |
| Email | nodemailer (SMTP) |
| Tests | Vitest (unit/integration) + Playwright (e2e) |

## Requirements

- Node.js >= 20.9
- npm >= 10

## Quick start

```bash
npm install
cp .env.example .env.local
# set APP_URL and APP_SECRET (openssl rand -hex 32)
npm run db:migrate     # create/upgrade the SQLite schema
npm run seed           # optional: create the bootstrap owner from BOOTSTRAP_OWNER_*
npm run dev
```

Open http://localhost:3000. To add a user later:
`npm run user:create -- <email> <name> <password> [owner|member|viewer]`.

> Note: the app validates its environment at boot (and while building), so
> `npm run dev` / `npm run build` require a complete `.env.local`. In
> `NODE_ENV=production` the SMTP variables are required too.

> Note: npm 12 blocks install scripts of native packages by default. The needed
> scripts are approved in `package.json` under `allowScripts`. If `npm install`
> reports blocked scripts after adding a dependency, review and approve them
> explicitly (`npm install-scripts ls` / `npm install-scripts approve <pkg>`).

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Start dev server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Start the production server (standalone output) |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm run check:rtl` | Reject physical-direction Tailwind utilities |
| `npm run test` | Vitest unit/integration tests |
| `npm run check` | typecheck + lint + check:rtl + tests (run before every commit) |
| `npm run db:generate` | Generate a Drizzle migration from the schema |
| `npm run db:migrate` | Apply migrations to the database |
| `npm run seed` | Create the bootstrap owner if there are no users |
| `npm run user:create -- <email> <name> <password> [role]` | Create a user |
| `npm run worker` | Run the background worker (outbox, scheduler, backups) |
| `npm run test:e2e` | Playwright end-to-end tests |

## Deployment (Docker)

The image is built from `Dockerfile` (multi-stage, based on the Playwright
image so Chromium is available for PDFs). `docker-compose.yml` runs two
services from the same image: **app** (Next.js standalone server) and
**worker** (outbox + scheduler + backups). They share the `./data` volume.

> Run **exactly one** worker replica. The worker owns the email outbox, the
> daily scheduler and backups; scaling it would duplicate jobs.

### First deployment checklist (section 17.4)

1. `cp .env.example .env` and fill it in:
   - `APP_SECRET`: at least 64 hex chars — `openssl rand -hex 32`.
   - `APP_URL`: the public HTTPS URL, no trailing slash.
   - `SMTP_*` (required in production) and `DEFAULT_LOCALE`.
   - `BOOTSTRAP_OWNER_*` for the first owner.
2. Make `./data` writable by the container user (`pwuser`, UID/GID **1001** in
   the Playwright image): `mkdir -p data && sudo chown -R 1001:1001 data`.
3. `docker compose build && docker compose up -d`.
4. Seed the first owner, templates and default settings:
   `docker compose exec app npm run seed`.
5. Log in, change the password, and fill **Settings → Company / Defaults /
   Signing / Email**; send the test email.
6. Create a test client → project → contract and complete the whole flow
   (sign, finalize, invoice, payment) with a test email address.
7. Remove `BOOTSTRAP_OWNER_PASSWORD` from `.env`.
8. Confirm backups appear under `data/backups` after the first 03:00 business
   time run (or trigger `runBackup` manually).

`nginx/dossier.conf` is a starting point for TLS termination and rate limiting;
put the real certificates where it points and include it inside the `http {}`
block.

## Backups and restore

The worker takes an online SQLite snapshot every day at 03:00 business time to
`${DATA_DIR}/backups/dossier-YYYYMMDD-HHmm.sqlite` (better-sqlite3 backup API),
and additionally archives `files/` to `files-YYYYMMDD.tar.gz` every Sunday.
Backups older than `BACKUP_RETENTION_DAYS` (default 30) are deleted, always
keeping the 3 newest. Each run is recorded in the audit log
(`backup.completed` / `backup.failed`).

To restore:

1. Stop the app and the worker.
2. Copy the chosen snapshot to `${DATA_DIR}/dossier.sqlite` and delete any stale
   `dossier.sqlite-wal` / `dossier.sqlite-shm` files.
3. Restore `files/` from the matching `files-YYYYMMDD.tar.gz`
   (`tar -xzf files-YYYYMMDD.tar.gz -C ${DATA_DIR}`).
4. Start the app, run `npm run db:migrate` (a no-op if already current), and
   verify a sample contract/PDF.

Off-site copies and encryption are the host's responsibility (e.g. `rsync` /
`rclone` to an encrypted volume, or `age`). They are intentionally not part of
the app.

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values. Every variable is validated at boot by `src/lib/env.ts`; required ones missing → the app refuses to start with a clear message.

## License

MIT
