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
npm run dev
```

Open http://localhost:3000.

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

More scripts (`lint`, `check:rtl`, `test`, `db:*`, `seed`, `worker`) are added as the corresponding tasks land — see `PROGRESS.md`.

## Environment variables

Copy `.env.example` to `.env.local` and fill in the values. Every variable is validated at boot by `src/lib/env.ts`; required ones missing → the app refuses to start with a clear message.

## License

MIT
