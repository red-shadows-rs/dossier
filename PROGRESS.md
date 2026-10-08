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

