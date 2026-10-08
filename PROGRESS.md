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

