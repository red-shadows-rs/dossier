# Progress

Implementation log of `DOSSIER_PLAN.md`. One entry per task (see 0.3). Deviations from the spec are always noted here.

## T-001 — Repository bootstrap — 2026-10-08
- Done: read task-board repo and mirrored toolchain versions (3.1); created repo layout per 4.1 (empty folders hold `.gitkeep`; `data/` and `tmp/` are gitignored runtime dirs); installed exactly the dependencies of 3.3; `next.config.ts` with `output: 'standalone'` + `serverExternalPackages: ['better-sqlite3','playwright','@node-rs/argon2']`; Tailwind 3 config + postcss mirroring task-board style with the 5.8 theme tokens (dark default, `.light` variant) in `globals.css`; `.gitignore`, `.dockerignore`, `.env.example` (all vars of 4.3), `README.md`, `PROGRESS.md`, `OPEN_QUESTIONS.md`; downloaded Cairo variable font (200–1000) as `assets/fonts/Cairo.ttf` + `assets/fonts/OFL.txt` from google/fonts.
- Files: package.json, package-lock.json, .npmrc, next.config.ts, tailwind.config.ts, postcss.config.mjs, tsconfig.json, src/app/{layout,page,globals.css}, .gitignore, .dockerignore, .env.example, README.md, PROGRESS.md, OPEN_QUESTIONS.md, assets/fonts/{Cairo.ttf,OFL.txt}, .gitkeep files.
- Tests: none (no logic yet). Verified: `npm run build` OK, `npm run dev` serves placeholder at `/` (HTTP 200), `npm run typecheck` OK.
- Deviations:
  - task-board pins React 18.3.1 with Next 16.3.3 (its peer range allows `^18.2.0`); mirrored exactly per 3.1 (task-board wins). Spec fallback mentioned React 19 — not used.
  - ESLint deps mirror task-board's flat-config setup (`@next/eslint-plugin-next`, `typescript-eslint`, `eslint-plugin-react`, `eslint-plugin-react-hooks`) instead of `eslint-config-next` listed in 3.3 (3.1: task-board wins for ESLint setup). The `eslint.config.mjs` itself is added in T-002.
  - `prettier-plugin-tailwindcss` not added (task-board does not use it — 3.3 allows it only then).
  - `@tailwindcss/typography` not added (used by task-board but not listed in 3.3 → R2).
  - tsconfig.json created in T-001 (strict + `@/*` paths, mirroring task-board) so the bootstrap build is already strict; T-002 only verifies/adjusts.
  - npm 12 blocked install scripts of native packages; approved them in `package.json` `allowScripts` (same mechanism task-board uses): better-sqlite3, esbuild, @parcel/watcher, @swc/core.
  - Placeholder page shows hardcoded AR/EN text; the real i18n system (R8) lands in T-007 and will replace it.
  - Playwright browsers for the pinned revision (chromium-1248) are not downloaded yet; needed by T-020 (PDF engine), not by T-001.

## T-002 — Tooling and CI — 2026-10-08
- Done: all npm scripts of 4.2 (`dev`, `build`, `start`, `typecheck`, `lint`, `check:rtl`, `test`, `test:e2e`, `check`, `db:generate`, `db:migrate`, `seed`, `user:create`, `worker`) + `format`/`format:check` helpers (mirror task-board); ESLint flat config mirroring task-board plus R4 rules as errors (`no-explicit-any`, `ban-ts-comment`, `no-non-null-assertion`); Prettier config (`.prettierrc`, `.prettierignore`) mirroring task-board; `vitest.config.ts` with `@` alias and e2e exclusion; `scripts/check-rtl.sh` (R7 patterns per 4.2, optional target-dir argument for testability) + `scripts/check-rtl.test.ts` (6 tests); `.github/workflows/ci.yml` (`npm ci` + `npm run check`, Node 22).
- Files: package.json, eslint.config.mjs, .prettierrc, .prettierignore, vitest.config.ts, scripts/check-rtl.sh, scripts/check-rtl.test.ts, .github/workflows/ci.yml (replaced .gitkeep).
- Tests: `scripts/check-rtl.test.ts` — clean tree → exit 0; `ml-2/mr-4/pl-1/pr-3`, `left-2/right-4/left-[5px]`, `text-left/text-right/border-l/border-r/rounded-l/rounded-r/space-x-4` → exit 1; only `*.tsx` scanned; missing target dir → exit 1.
- Deviations:
  - Added `format`/`format:check` scripts beyond the 4.2 list so the Prettier config (required by the card) is usable — same commands as task-board.
  - `check:rtl.sh` accepts an optional target directory (defaults to `src`) so the test can run it against fixtures; behavior on `src` is identical to the spec.
  - `vitest.config.ts` excludes `tests/e2e/**` (Playwright specs must not run under Vitest).
  - CI pins Node 22 (spec fallback; task-board only documents ">= 20").
- Manual verification: temporarily adding `className="... ml-2"` to `src/app/page.tsx` makes `npm run check:rtl` exit 1 with the file/line printed; reverting returns exit 0.

## T-003 — Environment and logger — 2026-10-08
- Done: `src/lib/env.ts` — Zod schema for every variable of 4.3, validated at module load, crashes at boot with a formatted, per-variable error message; exports typed `env` with resolved `DATABASE_PATH` (default `${DATA_DIR}/dossier.sqlite`). Enforced: `APP_URL` http(s), no trailing slash; `APP_SECRET` ≥ 64 hex chars (9.13); SMTP_HOST/PORT/SECURE/USER/PASS/FROM required when `NODE_ENV=production`; `BOOTSTRAP_OWNER_PASSWORD` ≥ 12 chars when set; empty strings treated as unset. `src/lib/logger.ts` — `logger.info|warn|error(event, fields?)` writes one JSON line to stdout `{ts, level, event, ...fields}`; recursive redactor drops keys matching `/token|secret|password|otp|signature|authorization|cookie/i` (15.5, R13).
- Files: src/lib/env.ts, src/lib/logger.ts, src/lib/env.test.ts, src/lib/logger.test.ts.
- Tests: `env.test.ts` (11) — missing APP_URL throws; APP_SECRET < 64 chars / non-hex throws; defaults; overrides; trailing-slash APP_URL rejected; empty string = unset; production SMTP required; production SMTP valid; BOOTSTRAP_OWNER_PASSWORD short/valid. `logger.test.ts` (6) — redactor drops `token`, `password`, `otp`, `signatureData`, `Authorization`, case-insensitive/substring matches, nested objects/arrays, scalars untouched; JSON-line shape and levels.
- Deviations:
  - Redaction is recursive (nested objects/arrays), not only top-level keys — hardening of R13, same regex.
  - Production requires SMTP_USER/SMTP_PASS as the 4.3 table states ("Required: prod"); this means a production boot without SMTP credentials fails fast.
- Manual verification: `npm run check` green (23 tests); `npm run build` green; `npm run format` clean.

## T-004 — Database layer — 2026-10-08
- Done: `src/db/index.ts` — creates `DATA_DIR` with mode 0700, opens better-sqlite3 with pragmas `journal_mode=WAL`, `foreign_keys=ON`, `busy_timeout=5000`, `synchronous=NORMAL`, exports the singleton `sqlite`, `db` (drizzle), `withTx` (bound to the singleton per 5.5), types `DbTx`/`DbInstance`, plus `openDb(path)` factory and `runMigrations(db, folder)` (no-op while `drizzle/meta/_journal.json` is absent). `src/db/migrate.ts` (script entry), `drizzle.config.ts` (sqlite dialect, schema `./src/db/schema.ts`, out `./drizzle`), `src/lib/constants.ts` (6.1 + `CURRENCIES` + `MAX_MINOR`), `src/db/test-db.ts` (`createTestDb()` → `:memory:` + migrations per 16.0), `tests/setup-env.ts` wired in `vitest.config.ts` (valid test env, `DATA_DIR` in tmp so tests never touch repo `data/`).
- Files: src/db/index.ts, src/db/migrate.ts, src/db/test-db.ts, src/db/index.test.ts, src/lib/constants.ts, drizzle.config.ts, tests/setup-env.ts, vitest.config.ts.
- Tests: `src/db/index.test.ts` (9) — file DB pragmas (`wal`, `foreign_keys=1`, `busy_timeout=5000`, `synchronous=1`); in-memory open; parent dir auto-created; `withTx` commit + rollback-on-throw; `createTestDb` usable + migrations no-op; `runMigrations` no-op without journal; singleton exposed.
- Deviations:
  - The app singleton `db` is opened at module import (per R28); test isolation comes from `tests/setup-env.ts` pointing `DATA_DIR` at a per-run tmp dir — tests never touch repo `data/`.
  - `drizzle.config.ts` reads `DATA_DIR`/`DATABASE_PATH` directly (drizzle-kit is a CLI and does not load `.env` files; the 4.3 rule concerns app code) — mirrors `env.ts` defaults.
  - DB file mode is not chmod'd to 0600: the 0700 `DATA_DIR` already restricts access and chmod would break containers with mounted volumes (EPERM). Covered by 9.9's directory rule.
- Manual verification: `npm run check` green (32 tests); `npm run db:migrate` succeeds via tsx on a tmp DATA_DIR (also proves fail-fast env validation and tsx `@` alias resolution); repo has no `data/` after tests.

## T-005 — Schema: identity and infrastructure — 2026-10-08
- Done: added `users`, `sessions`, `settings`, `files`, `auditLog`, `numberSequences` to `src/db/schema.ts` per 6.2 (array form of `sqliteTable` third argument for drizzle-orm 0.44.7, verified); generated `drizzle/0000_colossal_justice.sql` (+ `meta/0000_snapshot.json`, `_journal.json`); created custom migration `drizzle/0001_integrity_audit.sql` with the two `audit_log_*` triggers of 6.3 (`--> statement-breakpoint` marker verified in the generated file). Wired the aggregate schema into the drizzle instance (`drizzle(sqlite, { schema })`, `BetterSQLite3Database<typeof schema>`) and made `runMigrations` generic over the schema. `npm run db:generate` now reports "No schema changes" (snapshot in sync).
- Files: src/db/schema.ts, src/db/index.ts, src/db/schema.test.ts, drizzle/0000_colossal_justice.sql, drizzle/0001_integrity_audit.sql, drizzle/meta/{_journal.json,0000_snapshot.json,0001_snapshot.json}; removed drizzle/.gitkeep.
- Tests: `src/db/schema.test.ts` (6) — unique email index rejects duplicates (and keeps 1 row); audit insert allowed; audit UPDATE and DELETE abort with "append-only"; `number_sequences` unique `(seqKey, year)`; same key in a different year and different keys allowed. All run through `createTestDb()`, i.e. the real generated migrations + triggers.
- Deviations:
  - A partial version of this task was found uncommitted in the working tree (schema.ts, the generated `0000` migration, and the schema wiring in `index.ts`). It was reviewed against 6.2, kept, and completed with the custom trigger migration and tests.
  - `schema.ts` exports an aggregate `schema` object (not in the 6.2 snippet) and `index.ts` now passes it to `drizzle()` so the instance is schema-aware; `runMigrations` became generic accordingly. No behavior change for T-004 callers.
- Manual verification: `npm run check` green (38 tests); `npm run db:generate` reports no pending changes.

