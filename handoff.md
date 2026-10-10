# Dossier — Handoff Document

> **Generated:** 2026-10-09, on branch `t-029-send-flow` (working tree clean, HEAD `7233eef`).
> **Updated:** 2026-10-09 for T-030 on branch `t-030-email-worker` (HEAD `b6c3292`).
> **Updated:** 2026-10-09 for T-031 on branch `t-031-signing-page` (HEAD `4728cdc`).
> **Updated:** 2026-10-09 for T-032 on branch `t-032-finalization` (HEAD `56a5f43`).
> **Updated:** 2026-10-09 for T-033 on branch `t-033-verification` (HEAD `0d3e6af`).
> **Updated:** 2026-10-09 for T-034 on branch `t-034-lifecycle` (HEAD `0fb141f`).
> **Updated:** 2026-10-09 for T-035 on branch `t-035-template-editor` (HEAD `7c9b394`).
> **Updated:** 2026-10-09 for T-036 on branch `t-036-dashboard` (HEAD `de12b66`).
> **Updated:** 2026-10-09 for T-037 on branch `t-037-invoice-emails` (HEAD `505e017`).
> **Updated:** 2026-10-09 for T-038 on branch `t-038-backups-health` (HEAD `a265f3b`).
> **Updated:** 2026-10-09 for T-039 on branch `t-039-users-management` (HEAD `213d8cb`).
> **Updated:** 2026-10-09 for T-040 on branch `t-040-taskboard-link` (HEAD `4fd3587`).
> **Updated:** 2026-10-09 for T-041 on branch `t-041-docker` (HEAD `377fa3d`).
> **Updated:** 2026-10-09 for T-042 on branch `t-042-e2e` (HEAD `9c44181`).
> **Updated:** 2026-10-09 for T-043 on branch `t-043-security-qa` (HEAD `e5d2791`). **All 43 tasks are now complete.**
> **Verified against the real repo** with `ls`, `git log`, `git status`, `npm run check`, `npm run build`.
> Anything I could not verify is prefixed with `UNVERIFIED:`.

---

## Operating Rules (read this first, before doing anything)

1. **Read this entire file before touching anything.** Then read `DOSSIER_PLAN.md` sections named in the task you are doing.
2. **Make one small change at a time.** After each change, run the verification command for that step (usually `npm run check`). Never batch many changes and hope.
3. **Never refactor, rename, reformat, or delete anything** that the current step does not require. The spec (DOSSIER_PLAN.md R15) forbids touching files outside the current task.
4. **Never overwrite a file wholesale.** Use targeted edits. Before a risky change, commit or copy a backup (`git stash` or `cp file file.bak`).
5. **Never invent file paths, APIs, or package names.** Check they exist first (`ls`, `grep`, read the file). The spec marks uncertain APIs with **VERIFY** — actually check the installed package's types before coding.
6. **If a step fails twice, STOP.** Record it under "Failed Attempts" in this file, and report to the user. Do not improvise a different architecture.
7. **Never print, commit, or hard-code secrets.** `.env.local` is gitignored; never copy its values into code, logs, or commits.
8. **Reply to the user in English.** (The user writes in English; the product UI is Arabic/English.)
9. **Do one task per branch, then commit.** The project convention is: branch `t-0NN-slug`, one task per branch, commit message `T-0NN: short summary`, and append an entry to `PROGRESS.md`.

---

# 1) Goal

## Final objective (plain language)
Build **Dossier**: a self-hosted web platform for the RS team to create **contracts** and **invoices** for **projects**, and export them as **PDF in Arabic, English, or both side by side**. Every project has one "dossier" (the project page) gathering client, contracts, payment schedule, invoices, payments, attachments, and activity.

Core chain: **Client → Project → Contract → Payment milestones → Invoices → Payments.**

## The user's original request (their own words)
> "You are implementing "Dossier", a contracts & invoices platform, strictly following DOSSIER_PLAN.md. Read section 0 completely, then sections 1-5. Do ONLY the task I name (e.g. "Do T-001"). Obey the golden rules R1-R28. Never add dependencies outside section 3.3. Never refactor code outside the task. Write tests first for pure logic. Run `npm run check` before committing. If anything is ambiguous, write it to OPEN_QUESTIONS.md and stop. After finishing, append to PROGRESS.md, commit, and report briefly what you did and any deviations."

The user then repeatedly said **"DO Next Step"**, meaning: do the next task in the ordered task list (section 18 of `DOSSIER_PLAN.md`), starting after the last completed task.

## Why it matters / who it is for
- It is for **RED SHADOWS | RS** (GitHub org `red-shadows-rs`), an internal team. Team members log in; clients do **not** have accounts and receive private signing links.
- It is the sibling of the `task-board` project (same stack/conventions).

## Definition of "done" (checklist of testable conditions)
- [x] All task cards **T-001 … T-043** in `DOSSIER_PLAN.md` section 18 are implemented in order. **ALL 43 COMPLETE.**
- [x] `npm run check` passes (typecheck + lint + check:rtl + unit/integration tests). Currently: **494 tests across 59 files, all green.**
- [x] `npm run build` succeeds. **green.**
- [x] `npm run test:e2e` passes (T-042). **VERIFIED** — 3 specs green locally (CI job added).
- [x] `docker compose build` succeeds and app + worker start; `/api/health` healthy; an Arabic PDF renders inside the container (T-041). **VERIFIED.**
- [x] `PROGRESS.md` has one entry per completed task; every deviation is recorded there.
- [x] No secrets committed; no dependency outside section 3.3 added.

## Constraints (hard requirements — violating these is a defect)
- **Stack:** Next.js App Router (16.3.3), TypeScript **strict**, React 18.3.1, Tailwind CSS **3.4.19**, SQLite via `better-sqlite3` + Drizzle ORM, `next-intl`, `playwright` (Chromium `page.pdf()`), `nodemailer`, `zod`, `@node-rs/argon2`, `signature_pad`, `lucide-react`, `clsx` + `tailwind-merge`, `qrcode`.
- **OS / runtime:** Linux; Node **v24.18.0** locally, npm **12.0.2**. README states Node >= 20.9, npm >= 10. CI uses Node 22.
- **Dependencies:** only those listed in `DOSSIER_PLAN.md` section 3.3. Adding anything else → STOP (rule R2). Never `npm update`, `npm audit fix --force`, or `npx npm-check-updates` (R3).
- **Golden rules R1–R28** in `DOSSIER_PLAN.md` section 0.2 are mandatory. The most commonly violated ones:
  - **R4** No `any`, no `@ts-ignore`/`@ts-expect-error` (except tests with a comment), no non-null `!` (except tests). Use `unknown` + Zod.
  - **R6** Money is **integer minor units** (halalas/cents/fils). Never floats. Use only `src/lib/money.ts`.
  - **R7** **RTL safety:** never use physical Tailwind utilities `ml-* mr-* pl-* pr-* left-* right-* text-left text-right border-l* border-r* rounded-l* rounded-r* space-x-*`. Use logical: `ms-* me-* ps-* pe-* start-* end-* text-start text-end border-s* border-e* rounded-s* rounded-e* gap-*`. `npm run check:rtl` enforces this.
  - **R8** Every user-visible string comes from i18n keys; `messages/en.json` and `messages/ar.json` must have identical key sets (a test enforces it).
  - **R9** Every page/action/route handler that reads or writes data calls `requireUser()` (or the public-token verifier) then `assertCan(user, permission)`.
  - **R10** Validate every input with Zod **on the server**.
  - **R11** No business logic in React components or `page.tsx`/`route.ts`; it lives in `src/server/services/*`. Server actions are thin wrappers.
  - **R12** `better-sqlite3` transactions are **synchronous**. Never `await` inside a transaction. Never do PDF/email/file/network I/O inside a transaction.
  - **R13** Never log secrets/tokens/passwords/OTP/signature data.
  - **R14** Never use `dangerouslySetInnerHTML`. Generated HTML is only shown in `<iframe sandbox="" srcDoc={html}>`.
  - **R19** Date-only fields are `'YYYY-MM-DD'` strings; instants are integer ms UTC. Use `src/lib/dates.ts`, never `new Date('YYYY-MM-DD')`.
  - **R20** Commit format `T-0NN: short summary`, one task = one branch `t-0NN-slug`.
  - **R21** Run `npm run check` before every commit; never commit red.
  - **R28** All DB access goes through the `db` exported from `src/db/index.ts`.
- **Security:** session cookies HttpOnly; tokens stored only as HMAC; uploads validated by magic bytes + size; the public signing/verification pages must not leak internals.

## Out of scope (must NOT be built)
Per `DOSSIER_PLAN.md` 1.5 and section 19 (Phase 5): client accounts/portal, multi-tenant, online payments/gateways, accounting/ledger, certified e-invoicing (ZATCA/Fatoora, UAE FTA, ETA Egypt), PKI/qualified digital signatures, AI features, mobile apps, contract amendments/credit notes, Hijri dates, amount-in-words, multi-currency conversion, recurring invoices, WYSIWYG editors, real-time collaboration. **Do not invent features (R26).**

---

# 2) Current State

## What works now (verified by running the commands)
- **`npm run check` → PASS.** Output tail: `Test Files 57 passed (57)` / `Tests 489 passed (489)`.
- **`npm run build` → PASS.** Output tail: `✓ Compiled successfully` and the route list (all `/app` routes are `ƒ` dynamic; `/s/[token]`, `/s/[token]/pdf`, `/v/[code]`, `/verify` present).
- **`npm run worker` → WORKS.** Starts (logs `worker_started` + `worker_heartbeat`), runs the outbox job every 5 s, retries pending finalizations every 5 min, expires overdue sent contracts every hour, and exits cleanly on SIGINT/SIGTERM (`worker_stopping`). Needs a migrated `DATA_DIR`.
- **Public signing works.** `/s/[token]` resolves a client link, records `viewed_at`, gates on OTP, records the client signature, supports decline, and serves the unsigned PDF at `/s/[token]/pdf`.
- **Finalization works.** When the last signatory signs, the contract becomes `signed` with a `verificationCode`, all tokens/OTP are nulled, and a sealed PDF (signatures + verification block + certificate page + QR) is stored with a matching `pdfSha256`; `contract_signed_copy` emails (with the PDF attached) are queued to the client, provider and creator.
- **Public verification works.** `/v/[code]` shows a minimal public DTO for a signed/terminated contract or a non-draft invoice (no client email/phone/amounts); `/verify` accepts a code and an optional PDF upload that is SHA-256-compared to the sealed contract PDF (`match`/`mismatch`); both are rate-limited and `noindex`/`no-referrer`.
- **Contract lifecycle works.** Recall (`reviseContract`) sent/declined/expired → draft (versionNo bumped, tokens revoked), regenerate a client signing link (once-only URL), hourly expiry, cancel (draft/sent/declined/expired), complete and terminate (owner). The detail page has per-status action buttons, a populated **Signatures** tab, and the **History** tab (versions + audit).
- **Template editor works.** `/templates/new` and `/templates/[id]/edit` create/edit custom templates with a clause editor (add/up/down/duplicate/delete, AR+EN), live `validateTemplateClauses` messages, a live sample-data preview (`renderTemplatePreviewHtml` in a sandboxed iframe, AR/EN toggle), editable defaults (hasFees, payment terms, default titles, optional milestone preset), and the legal notice. System templates are read-only in the UI; **Duplicate** copies any template into an editable copy (`isSystem=false`, `key=NULL`) and opens its editor; **Archive** hides a custom template. Services `createTemplate`/`updateTemplate`/`duplicateTemplate`/`archiveTemplate` validate clauses and reject system edits with `INVALID_STATE`; actions enforce `templates.write`.
- **Dashboard works.** `/` renders all 7.12 metrics: contracts awaiting signature (count + list with days waiting), signed in the last 30 days, draft counts, per-currency outstanding/overdue, "due in the next 7 days", per-currency revenue (current/previous month from non-voided payments by `paidOn`), contracts ending within 30 days, and the last 15 contract/invoice/payment audit rows. An owner-only worker-stale warning shows when the `worker_heartbeat` is missing or >5 min old. Service `getDashboard(today?)` in `src/server/services/dashboard.ts`.
- **Invoice emails & reminders work.** `sendInvoiceEmail` (P `invoices.issue`) enqueues `invoice_issued` (locale per invoice rule; PDF **not** in the payload) and the email worker renders the invoice PDF at send time; the invoice detail page has an "Email invoice" button. `runDailyJobs` (every 15 min in `scripts/worker.ts`) runs `sendOverdueReminders` once per business-tz date at hour 08 when `email.overdueRemindersEnabled` is on, only on `overdueReminderDays` offsets, at most once per day per invoice, auditing `invoice.reminder_sent`. Templates `invoice_issued` / `invoice_overdue_reminder` / `contract_declined_notice` are implemented (AR/EN).
- **Backups & health work.** The worker snapshots the DB daily at 03:00 business time (`sqlite.backup()` → `${DATA_DIR}/backups/dossier-YYYYMMDD-HHmm.sqlite`), archives `files/` every Sunday (`files-YYYYMMDD.tar.gz`), prunes old backups (`BACKUP_RETENTION_DAYS`, keeping the 3 newest), and audits `backup.completed`/`backup.failed`. `GET /api/health` (public) returns `{"ok":true}` 200 after `SELECT 1`, or `{"ok":false}` 503 if the DB is closed. README documents the restore steps.
- **Users management works.** `/users` (list), `/users/new`, `/users/[id]` (all `users.manage`): create a user (email/name/role/password/`canSignForCompany`), edit role + `canSignForCompany`, enable/disable (disabling ends all their sessions immediately), and an owner sets a new password (which also ends all their sessions). The **last active owner** can never be demoted or disabled (`INVALID_STATE`). Audits `user.created|updated|status_changed|password_reset`.
- **Task-board link works (minimal).** Projects have an editable `taskboardRef` (≤200 chars) and the project overview shows it as an external link when it resolves (`src/lib/taskboard.ts` `resolveTaskboardUrl`: absolute URL used as-is, else `${TASKBOARD_API_URL}/${ref}`, else plain text). **No automatic task creation and no network calls** (deferred via `OPEN_QUESTIONS.md` Q-1).
- **Docker deployment works.** `Dockerfile` (multi-stage, Playwright base) + `docker-compose.yml` (app + worker, one worker replica) + `nginx/dossier.conf` + deployment README. `docker compose build` succeeds, `up -d` starts both services, `/api/health` → 200, the worker heartbeat logs, and an Arabic PDF renders in the container (Cairo embedded).
- **End-to-end tests work.** `npm run test:e2e` (Playwright, Chromium) boots a production build against a throwaway `DATA_DIR` on port 3210 and runs 3 specs: the full chain (client → project → contract → send → OTP → sign → sealed PDF → invoice from milestone → issue → payment → Paid), the verification page (`/v/<code>` valid + not-found), and RTL (Arabic sets `dir="rtl"` + sidebar on the right). Emails are never sent; tests read `email_outbox` directly for the signing link and OTP. CI has an `e2e` job.
- **Security & QA pass done.** Every section-20 checklist item is verified (authorization table test for all 54 server actions; data-integrity invariant tests; RTL/e2e; magic-byte uploads; session flags; outbox redaction; DB immutability triggers). `npm audit --omit=dev` reports 3 advisories (`next` critical, `drizzle-orm` high, `nodemailer` high) — deferred via `OPEN_QUESTIONS.md` Q-2 (fixing needs breaking upgrades); CI runs it as a non-blocking report.
- **Tasks T-001 through T-043 are complete and committed** (47 commits, see `git log`).

## What is NOT yet built (do not assume it exists)
- **No remaining task cards** (T-001…T-043 all complete). Open follow-ups only (see below).
- **No "Sign as company" action on the contract detail page** for a `sent` contract whose provider signatory is still pending (line 1999 of the plan). The service `signAsProvider` + action exist and provider signing before send works; only the on-detail-page UI is missing. (Follow-up.)
- **Email templates `contract_expired_notice` and `internal_notice` are still not implemented** — `renderEmail` throws `EMAIL_FAILED` for them. (They are not enqueued anywhere yet; `invoice_issued`, `invoice_overdue_reminder` and `contract_declined_notice` are now implemented in T-037.)

## What is broken / warnings / debt
- The local `./data/dossier.sqlite` is **unmigrated** (migrations were applied on throwaway `DATA_DIR`s only). `npm run worker` against `DATA_DIR=./data` fails with `no such table: settings` until you run `npm run db:migrate` for that dir. Not a code bug.
- **Port 3000 is occupied** by another local project's dev server (TaskBoard). Run Dossier's dev server on a free port, e.g. `PORT=3100 DATA_DIR=... npm run dev`.
- `npm run test:e2e` now boots `next start` on port 3210 with a temp `DATA_DIR` and runs 3 specs (green locally). It prints a benign warning `"next start" does not work with "output: standalone"` — the standalone server can't be used because its trace omits `playwright-core` (see Failed Attempts #26).
- `contract_expired_notice` is in the `EmailTemplateKey` union but **is not in the 15.1 template table**; `DOSSIER_PLAN.md` 7.4 says the worker revokes tokens and audits `contract.expired` (no email is specified). Do not assume an email is required — see OPEN_QUESTIONS if unsure.
- **`Cache-Control: no-store` from `next.config.ts` is overridden by Next.js to `no-cache, must-revalidate` on dynamic HTML pages** (including `/s/*`, `/v/*`, `/verify`). The PDF routes keep `no-store`. To force `no-store` on the HTML document, add `middleware.ts` (T-043) — the pages are already `force-dynamic` + `noindex` + `no-referrer`.
- `tests/e2e/` now holds the Playwright specs (config/helpers/prepare + 2 spec files); `nginx/` has the real conf files (no `.gitkeep`).
- `PROGRESS.md` is large but complete and is the authoritative task log.

## Environment
- **OS:** Fedora Linux 44 (KDE Plasma). **Runtime:** Node `v24.18.0`, npm `12.0.2`.
- **Working directory / project root:** `/home/shadow-x7/Projects/Websites/Typescript/Next.js/Dossier` (git repo). **Currently checked out: `t-043-security-qa` (HEAD `e5d2791`), tracked tree clean (`handoff.md` is untracked).**
- **Git branches:** there is **NO `main` branch** (verified: `git branch --list main` is empty). All work is on branches named `t-001-bootstrap` … `t-043-security-qa`; `t-043-security-qa` carries the full linear history (T-001…T-043). A few stale branch pointers also exist (`t-005-schema`, `t-005-schema-identity` at T-004, and the branch `t-021-pdf-endpoint` was deleted though its commit `5e70830` is in history). **Do not `git checkout main`** — it will fail. All tasks are done; there is no next task branch.
- **Install:** `npm install` (npm 12 blocks native install scripts; the needed ones are approved in `package.json` `allowScripts`).
- **Run dev:** `npm run dev` (Turbopack) → http://localhost:3000. Requires a complete `.env.local` (see below) because `src/lib/env.ts` fails fast. **Next.js auto-loads `.env.local`; `tsx` scripts do NOT.** So `npm run dev` / `npm run build` pick up `.env.local` automatically, but `db:migrate` / `seed` / `user:create` / `worker` (all run via `tsx`) will throw `Invalid environment configuration` unless you export the vars inline, e.g. `NODE_ENV=development APP_URL=http://localhost:3000 APP_SECRET=<64 hex> DATA_DIR=./data npm run seed`.
- **Build:** `npm run build`. **Typecheck:** `npm run typecheck`. **Lint:** `npm run lint`. **RTL check:** `npm run check:rtl`. **Tests:** `npm run test`. **All:** `npm run check`.
- **DB:** SQLite. Apply migrations with `npm run db:migrate`. Seed with `npm run seed` (creates the bootstrap owner from `BOOTSTRAP_OWNER_*` if there are zero users). Create a user: `npm run user:create -- <email> <name> <password> [owner|member|viewer]`.
- **Port:** 3000 (dev). **DB file:** `${DATA_DIR}/dossier.sqlite` (default `./data/dossier.sqlite`, gitignored).
- **Env variable NAMES** (values are secret/placeholder — never commit real values):
  - Required: `NODE_ENV`, `APP_URL`, `APP_SECRET` (≥ 64 hex chars).
  - Optional: `PORT` (3000), `DATA_DIR` (`./data`), `DATABASE_PATH`, `DEFAULT_LOCALE` (`ar`), `PDF_TIMEOUT_MS` (30000), `PDF_CONCURRENCY` (2), `BACKUP_RETENTION_DAYS` (30), `TZ` (`UTC`), `TASKBOARD_API_URL`, `TASKBOARD_API_TOKEN`.
  - Required in production: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.
  - First-run only: `BOOTSTRAP_OWNER_EMAIL`, `BOOTSTRAP_OWNER_PASSWORD` (≥ 12 chars), `BOOTSTRAP_OWNER_NAME`.
  - A `.env.local` **exists locally** (gitignored) with development values, e.g. `APP_SECRET=<64 hex chars>`, `SMTP_HOST=<placeholder>`, `SMTP_USER=<placeholder>`, `SMTP_PASS=<placeholder>`.
- **Config files:** `next.config.ts`, `tsconfig.json`, `eslint.config.mjs`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `drizzle.config.ts`, `.prettierrc`, `.prettierignore`, `.npmrc`, `.env.example`, `.github/workflows/ci.yml`, `playwright.config.ts` (T-042).
- **Playwright:** Chromium revision **1248** is installed in `~/.cache/ms-playwright` (verified working; `page.pdf()` produces a `%PDF-` buffer).

## Architecture overview
- **Framework:** Next.js App Router. Route groups: `src/app/(app)/*` is the authenticated shell (calls `requireUserPage()`); `src/app/login`, `src/app/api/*` are outside the shell.
- **Data flow:** UI (`src/app/**/page.tsx`, server components) → server actions (`src/server/actions/*.ts`, thin wrappers using `runAction`) → services (`src/server/services/*.ts`, all business logic) → Drizzle (`src/db/index.ts` exports `db`, `sqlite`, `withTx`, `DbTx`) → SQLite.
- **Auth:** `src/server/auth/*` (argon2 passwords, HMAC'd session tokens, rate limiting, `requireUser`/`requireUserPage`). Authorization via `src/lib/permissions.ts` (`can`/`assertCan`, section 8 matrix).
- **i18n:** `next-intl` without locale routing; locale from cookie `dossier_locale` via `src/i18n/request.ts`; messages in `messages/{en,ar}.json`.
- **PDF:** `src/server/pdf/*` — `browser.ts` (lazy Chromium singleton + concurrency semaphore), `render.ts` (`renderPdf`), `fonts.ts` (Cairo base64), `qr.ts`, `html/{shared,contract,invoice,certificate}.ts`.
- **Entry points:** `src/app/layout.tsx` (root), `src/app/(app)/layout.tsx` (app shell), `src/app/api/**/route.ts` (PDF + files downloads), `scripts/seed.ts`, `scripts/create-user.ts`.

## Open questions awaiting the user's decision
- `OPEN_QUESTIONS.md` currently contains **only the header** — there are no open questions recorded. (Do not invent answers; if you hit ambiguity, append there and stop.)

---

# 3) Active Files

Legend for **Status**: `NEW` = created in a recent task, actively evolving · `MOD` = modified often · `CRIT` = untouched-but-critical (imported everywhere; do not change casually) · `DO NOT TOUCH` = frozen/immutable.

### Core config & docs (root)
| Path | Purpose | Status | Key contents | Depends on |
|---|---|---|---|---|
| `DOSSIER_PLAN.md` | **The single source of truth.** Sections 0–22 incl. all task cards. | DO NOT TOUCH (read-only spec) | T-001…T-043 cards; R1–R28 | — |
| `PROGRESS.md` | Task log; one entry per task. | MOD (append per task) | T-001…T-029 entries | — |
| `OPEN_QUESTIONS.md` | Where to record ambiguities. | MOD (append, then stop) | header only | — |
| `package.json` | Scripts + exact deps + `allowScripts`. | CRIT | see §2 | — |
| `package-lock.json` | Lockfile (committed; CI uses `npm ci`). | DO NOT TOUCH (except via npm) | — | — |
| `.env.local` | Local dev env (gitignored). | DO NOT TOUCH / never commit | dev values | — |
| `.env.example` | Documented env template. | CRIT | all var names | — |
| `.gitignore` | Ignores `.env.*` (except example), `data/`, `*.sqlite*`, `.next/`, `node_modules/`, `tmp/`, `*.tsbuildinfo`, `next-env.d.ts`. | DO NOT TOUCH | — | — |
| `next.config.ts` | `output: 'standalone'`, `serverExternalPackages`, next-intl plugin, 9.5 security `headers()`. | CRIT | — | `src/i18n/request.ts` |
| `tsconfig.json` | strict + `@/*` → `./src/*`. | CRIT | — | — |
| `eslint.config.mjs` | Flat config; bans `any`, ts-comment, non-null. | CRIT | — | — |
| `tailwind.config.ts`, `postcss.config.mjs` | Tailwind 3 config + theme tokens. | CRIT | — | — |
| `vitest.config.ts` | `@` alias, `setupFiles: ["tests/setup-env.ts"]`, excludes `tests/e2e/**`. | CRIT | — | `tests/setup-env.ts` |
| `drizzle.config.ts` | drizzle-kit CLI config (sqlite, schema `./src/db/schema.ts`, out `./drizzle`). | CRIT | — | — |
| `scripts/check-rtl.sh` | R7 enforcement; optional target-dir arg. | DO NOT TOUCH unless RTL rule changes | — | — |
| `scripts/check-rtl.test.ts` | Tests the RTL script. | CRIT | — | `scripts/check-rtl.sh` |
| `scripts/seed.ts` | Seeds 5 settings rows + system templates + bootstrap owner. | MOD | `main()` | `services/templates`, `services/settings`, `auth/password` |
| `scripts/create-user.ts` | CLI to create a user. | CRIT | `main()` | `auth/password` |
| `scripts/worker.ts` | **NEW (T-030).** Long-lived worker: outbox every 5 s, finalize every 5 min, expire hourly, daily jobs every 15 min, heartbeat every 60 s, graceful shutdown. | NEW | `main`, `start`, `safeHeartbeat` | `services/email-worker`, `services/daily-jobs`, `services/settings` |
| `.github/workflows/ci.yml` | CI: Node 22; `check` job (`npm ci && npm run check`) + `e2e` job (install Chromium, `npm run test:e2e`). | CRIT | — | — |
| `playwright.config.ts` | **NEW (T-042).** E2E config: port 3210, single worker, `webServer` = `npm run e2e:serve`. | MOD | — | — |
| `tests/e2e/config.ts`, `tests/e2e/prepare.ts`, `tests/e2e/helpers.ts` | **NEW (T-042).** E2E env, DB prep (migrate/seed/company settings), outbox readers + login. | MOD | — | — |
| `tests/e2e/full-flow.spec.ts`, `tests/e2e/rtl.spec.ts` | **NEW (T-042).** 16.2 scenarios. | MOD | — | — |
| `Dockerfile` | **NEW (T-041).** Multi-stage image (Playwright base, `pwuser` UID 1001); build-time placeholder env; runner CMD migrates then `node server.js`. | MOD | — | — |
| `docker-compose.yml` | **NEW (T-041).** `app` + `worker` (one replica) sharing `./data`; healthcheck on `/api/health`; bound to `127.0.0.1:3000`. | MOD | — | — |
| `nginx/dossier.conf`, `nginx/dossier-proxy.conf` | **NEW (T-041).** TLS termination + rate limiting for `/s/`+`/v/`; shared proxy headers. | MOD | — | — |
| `README.md` | Setup/commands; **T-041** adds the Docker deployment + first-run checklist. | MOD | — | — |
| `assets/fonts/Cairo.ttf`, `assets/fonts/OFL.txt` | Self-hosted Cairo variable font + license. | DO NOT TOUCH | — | — |

### Database (`src/db/`)
| Path | Purpose | Status | Key exports | Depends on |
|---|---|---|---|---|
| `src/db/schema.ts` | All tables (users, sessions, settings, files, audit_log, number_sequences, clients, projects, templates, template_clauses, contracts, contract_items, contract_clauses, payment_milestones, contract_versions, contract_signatories, invoices, invoice_lines, payments, email_outbox) + CHECKs + partial unique index + aggregate `schema`. | CRIT (schema changes only via drizzle-kit, R5) | table objects, `schema` | `lib/constants` |
| `src/db/index.ts` | Opens SQLite (WAL/foreign_keys/busy_timeout/synchronous) **lazily on first use (T-041; Proxy over `db`/`sqlite`)**, creates `DATA_DIR` (0700), exports `sqlite`, `db`, `withTx`, `DbTx`, `openDb`, `runMigrations`. | CRIT | `db`, `sqlite`, `withTx`, `DbTx`, `openDb`, `runMigrations`, `DbInstance` | `lib/env` |
| `src/db/migrate.ts` | Migration entry (`npm run db:migrate`). | DO NOT TOUCH | — | `db/index` |
| `src/db/test-db.ts` | `createTestDb()` → in-memory DB with migrations. | CRIT (tests) | `createTestDb` | `db/index` |
| `src/db/*.test.ts` | index/schema/integrity tests. | CRIT | — | — |
| `src/server/actions/authorization.test.ts` | **NEW (T-043).** Table test: every server action rejects unauthenticated callers; viewers FORBIDDEN on writes. | CRIT | — | — |
| `src/server/services/data-integrity.test.ts` | **NEW (T-043).** Invariant queries (milestone Σ, paid == Σ payments). | CRIT | — | — |
| `drizzle/*.sql`, `drizzle/meta/*` | Generated + custom migrations (committed). | DO NOT TOUCH (never edit committed migrations, R5) | — | — |

### Libraries (`src/lib/`)
| Path | Purpose | Status | Key exports |
|---|---|---|---|
| `src/lib/env.ts` | Zod-validated env; fails fast at import. | CRIT | `env`, `Env` |
| `src/lib/constants.ts` | Enums (ROLES, CONTRACT_STATUSES, INVOICE_STATUSES, …), `CURRENCIES`, `MAX_MINOR`, `AUDIT_ACTIONS`, types. | CRIT | many |
| `src/lib/money.ts` | Integer-minor money math. | DO NOT TOUCH (pure, tested) | `parseMajorToMinor`, `formatMoney`, `formatMinor`, `mulDivRound`, `percentOfBp`, `allocateProportional`, `allocateByBp`, `normalizeDigits` |
| `src/lib/dates.ts` | Date-only/instant helpers. | DO NOT TOUCH | `todayInTz`, `addDays`, `formatDateLong`, `formatInstant`, `utcStartOfDayMs`, `utcEndOfDayMs`, `nowMs`, `isValidDateStr`, `compareDateStr`, `daysBetween` |
| `src/lib/crypto.ts` | HMAC/sha256/safe-equal. | DO NOT TOUCH | `hmacToken`, `sha256Hex`, `safeEqualHex` |
| `src/lib/ids.ts` | IDs, tokens, Crockford codes. | DO NOT TOUCH | `newId`, `newToken`, `generateCode`, `normalizeCode`, `formatCode` |
| `src/lib/canonical-json.ts` | Deterministic JSON for hashing. | DO NOT TOUCH | `canonicalize` |
| `src/lib/errors.ts` | `AppError`, `ERROR_CODES`, `ErrorCode`. | CRIT | `AppError`, `ERROR_CODES` |
| `src/lib/result.ts` | `ActionResult<T>`. | CRIT | `ActionResult` |
| `src/lib/permissions.ts` | Section-8 matrix; `can`/`assertCan`. | CRIT | `can`, `assertCan`, `PERMISSIONS`, `Permission` |
| `src/lib/taskboard.ts` | **NEW (T-040).** Pure task-board link resolver (no network). | DO NOT TOUCH (pure, tested) | `resolveTaskboardUrl` |
| `src/lib/logger.ts` | JSON-line logger + recursive redactor. | DO NOT TOUCH | `logger`, `redact` |
| `src/lib/i18n.ts` | Cookie names, locale/theme helpers (env-free!). | CRIT | `LOCALE_COOKIE`, `THEME_COOKIE`, `resolveLocale`, `resolveTheme`, `themeClass` |
| `src/lib/doc-lang.ts` | `DocLang`, `allowedDocLangs`, `defaultDocLang`. | CRIT | `DocLang`, `allowedDocLangs`, `defaultDocLang`, `isDocLang` |
| `src/lib/validation/*.ts` | Zod schemas (auth, account, clients, projects, contracts, invoices, signing, settings, template, issues). | CRIT | schemas + types |

### Server auth (`src/server/auth/`)
| Path | Purpose | Key exports |
|---|---|---|
| `password.ts` | Argon2id hash/verify + policy. | `hashPassword`, `verifyPassword`, `assertPasswordPolicy` |
| `session.ts` | Session create/validate/delete; cookie options; `SESSION_COOKIE`. | `createSession`, `validateSession`, `deleteSession`, `deleteOtherSessions`, `deleteUserSessions`, `cleanupExpiredSessions`, `sessionCookieOptions`, `sessionIdFromToken`, `SessionUser`, `RequestMeta`, `SESSION_COOKIE`, `SESSION_TTL_MS` |
| `rate-limit.ts` | In-memory limiter. | `isRateLimited`, `assertNotRateLimited`, `recordFailure`, `clearEmailFailures`, `resetRateLimits` |
| `login.ts` | Login service. | `login` |
| `require-user.ts` | Session readers. | `getCurrentUser`, `requireUser`, `requireUserPage` |
| `test-utils.ts` | `createTestUser()` for tests. | `createTestUser` |

### Services (`src/server/services/`) — business logic
| Path | Purpose | Key exports (verified) |
|---|---|---|
| `audit.ts` | Write + query audit rows; request meta. | `audit`, `getRequestMeta`, `listAuditEntries`, `AUDIT_PAGE_SIZE` |
| `settings.ts` | Settings read/write + internal settings + bank instructions. | `getSettings`, `updateSettings`, `getInternalSetting`, `setInternalSetting`, `buildPaymentInstructions` |
| `files.ts` | File storage (magic bytes, sizes, sha256). | `saveFile`, `readFile`, `findFileBySha256`, `getFileRow`, `deleteAttachment`, `detectMime`, `StoredFile` |
| `numbering.ts` | Sequence allocation + doc numbers. | `allocateNumber`, `formatProjectCode`, `formatDocNumber` |
| `clients.ts` | Client CRUD. | `listClients`, `getClient`, `listClientOptions`, `createClient`, `updateClient`, `archiveClient`, `unarchiveClient` |
| `projects.ts` | Project CRUD + options. | `listProjects`, `getProject`, `getProjectWithClient`, `listProjectOptions`, `createProject`, `updateProject`, `setProjectStatus`, `archiveProject`, `unarchiveProject` |
| `project-summary.ts` | Dossier financial summary (7.11), activity, attachments. | `getProjectSummary`, `listProjectActivity`, `listProjectAttachments` |
| `dashboard.ts` | **NEW (T-036).** Dashboard metrics (7.12), per-currency grouping. | `getDashboard`, `DashboardData`, `CurrencyAmount`, `AwaitingSignatureRow`, `DueSoonRow`, `EndingSoonRow`, `ActivityRow` |
| `templates.ts` | Seed + read templates; **T-035** adds create/update/duplicate/archive with clause validation + audit. | `listTemplates`, `getTemplate`, `seedSystemTemplates`, `createTemplate`, `updateTemplate`, `duplicateTemplate`, `archiveTemplate` |
| `contract-calc.ts` | Totals math (7.2). | `calcTotals`, `CalcInput`, `CalcOutput` |
| `milestones.ts` | Milestone planning (7.3). | `planMilestones`, `validateMilestones` |
| `contracts.ts` | Contract draft CRUD, list, versions, project contracts. | `createContractFromTemplate`, `updateContractBasics`, `saveContractItems`, `saveMilestones`, `saveClauses`, `previewTotals`, `deleteDraftContract`, `cancelContract`, `listContracts`, `getContract`, `getContractDetail`, `listContractVersions`, `listProjectContracts`, `CONTRACT_SORT_FIELDS` |
| `contract-snapshot.ts` | 7.6 snapshot + hash. | `buildContractSnapshot`, `hashSnapshot` |
| `contracts-validate.ts` | 7.5 send validation. | `validateContractForSend`, `SendValidationOptions`, `CONTRACT_ISSUE_CODES` |
| `contracts-send.ts` | **NEW (T-029).** Send + provider sign + signers; `signAsProvider` is now `async` (T-032 finalizes + seals); `tokenExpiryMs` exported (T-034). | `sendContract`, `signAsProvider`, `tokenExpiryMs`, `listCompanySigners`, `countContractSignatories`, `CompanySigner` |
| `contract-documents.ts` | Contract HTML/PDF resolution. | `resolveDocLang`, `buildContractHtml`, `safePdfFilename`, `resolveContractPdf`, `snapshotForRendering` |
| `invoices.ts` | Invoice service (create/milestone/issue/void/lines/overdue); T-037 adds `sendInvoiceEmail` + `localeForInvoice`. | `createInvoice`, `createInvoiceFromMilestone`, `updateInvoiceDraft`, `saveInvoiceLines`, `issueInvoice`, `sendInvoiceEmail`, `localeForInvoice`, `voidInvoice`, `deleteDraftInvoice`, `listInvoices`, `getInvoice`, `getInvoiceDetail`, `isOverdue`, `listInvoiceableMilestones`, `INVOICE_SORT_FIELDS` |
| `daily-jobs.ts` | **NEW (T-037).** Worker daily jobs (7.9/15.2): overdue reminders + backup pass + `worker_state`. | `sendOverdueReminders`, `runDailyJobs` (async) |
| `backups.ts` | **NEW (T-038).** DB snapshot + weekly files tar + retention (15.4). | `runBackup`, `createDatabaseBackup`, `createFilesArchive`, `applyRetention`, `backupsDir`, `BackupResult` |
| `health.ts` | **NEW (T-038).** Health probe (15.5). | `checkDatabase`, `getHealth`, `HealthDb` |
| `payments.ts` | Payments record/void + recompute. | `recordPayment`, `voidPayment`, `listPayments`, `listPaymentsPaged`, `getPaymentDetail` |
| `invoice-documents.ts` | Invoice HTML/PDF resolution. | `resolveInvoiceDocLang`, `buildInvoiceHtml`, `invoiceSafePdfFilename`, `resolveInvoicePdf` |
| `account.ts` | Account update + password change. | `updateAccount`, `changePassword` |
| `users.ts` | **NEW (T-039).** User management + last-owner guard (8). | `listUsers`, `getUser`, `createUser`, `updateUser`, `setUserStatus`, `setUserPassword`, `UserListRow` |
| `email.ts` | **NEW (T-029).** Outbox enqueue + read; `EMAIL_TEMPLATE_KEYS` + `isEmailTemplateKey` (T-030). | `enqueueEmail`, `listPendingEmails`, `countPendingEmails`, `EMAIL_TEMPLATE_KEYS`, `isEmailTemplateKey`, `EmailTemplateKey`, `EnqueueEmailInput` |
| `email-templates.ts` | **NEW (T-030).** Pure AR/EN email renderer (HTML + text); T-032 adds `contract_signed_copy`; T-037 adds `contract_declined_notice`, `invoice_issued`, `invoice_overdue_reminder`. | `renderEmail`, `escapeHtml`, `RenderedEmail` |
| `email-worker.ts` | **NEW (T-030).** nodemailer transport + race-safe `processOutbox` (claim, send, redact, backoff); T-032 adds file attachments; T-037 renders the invoice PDF at send time (`processOutbox(sender, deps?)`). | `createTransport`, `processOutbox`, `claimOutboxRow`, `MailSender`, `OutgoingMail`, `MailAttachment`, `OutboxRow`, `OutboxDeps` |
| `signing.ts` | **NEW (T-031).** Public client signing: token resolve, OTP, sign, decline, rate limit. `submitClientSignature` is now `async` and finalizes (T-032). | `resolveSignatory`, `getSigningContext`, `requestSigningOtp`, `verifySigningOtp`, `submitClientSignature`, `declineContract`, `assertSigningRateLimit`, `resetSigningRateLimits`, `SigningContext`, `SigningLanguageMode` |
| `contract-finalize.ts` | **NEW (T-032).** Finalize tx, sealed PDF + certificate, signed-copy emails, retry. | `finalizeContractTx`, `generateSealedPdf`, `retryPendingFinalizations`, `MAX_PDF_ATTEMPTS`, `SealedPdfOptions` |
| `verification.ts` | **NEW (T-033).** Public code lookup (minimal DTO) + PDF SHA-256 check + rate limits. | `lookupVerification`, `checkPdfUpload`, `assertLookupRateLimit`, `assertFileCheckRateLimit`, `resetVerificationRateLimits`, `VerificationResult`, `ContractVerification`, `InvoiceVerification`, `PdfCheckResult` |
| `contracts-lifecycle.ts` | **NEW (T-034).** Recall, regenerate link, expire, complete, terminate, list signatories. | `reviseContract`, `regenerateSigningLink`, `expireContracts`, `completeContract`, `terminateContract`, `listContractSignatories`, `ContractSignatoryRow` |

### Templating (`src/server/templating/`)
| Path | Purpose | Key exports |
|---|---|---|
| `render-body.ts` | Parse clause bodies + inline render (escaping, `<bdi>`). | `parseBody`, `extractVariables`, `renderInline`, `findMisplacedBlocks`, `specialBlockSequence`, `numberedParagraphLabels`, `Block` |
| `variables.ts` | 11.3 whitelist + variable map + `ContractSnapshotV1`. | `ALLOWED_VARIABLES`, `FEE_VARIABLES`, `isAllowedVariable`, `buildVariableMap`, `ContractSnapshotV1` |
| `validate.ts` | Template save-time validation. | `validateTemplateClauses` |
| `seed-templates.ts` | 11.7 clause library + 4 templates. | `CLAUSES`, `TEMPLATES`, `clauseDefsFor` |
| `sample-snapshot.ts` | 21.6 worked-example fixture. | `SAMPLE_SNAPSHOT` |
| `preview.ts` | Sample-data preview HTML (templates page). | `renderTemplatePreviewHtml` |

### PDF (`src/server/pdf/`)
| Path | Purpose | Key exports |
|---|---|---|
| `browser.ts` | Chromium singleton + semaphore. | `getBrowser`, `closeBrowser`, `renderSemaphore` |
| `render.ts` | `renderPdf(html, footer)`. | `renderPdf` |
| `fonts.ts` | Cairo base64 CSS. | `getFontCss`, `FONT_STACK` |
| `qr.ts` | QR SVG data URI + verify URL. | `makeQrDataUri`, `verificationUrl` |
| `html/shared.ts` | `esc`, base CSS, `documentShell`, block renderers. | `esc`, `documentShell`, `buildFooterTemplate`, `renderPartiesBlock`, `renderPricingTableBlock`, `renderPaymentScheduleBlock`, `renderSignaturesBlock`, `DocLang`, `SignatureRender` |
| `html/contract.ts` | `renderContractHtml`. | `renderContractHtml`, `ContractHtmlInput` |
| `html/invoice.ts` | `renderInvoiceHtml`. | `renderInvoiceHtml`, `InvoiceHtmlInput`, `SellerSnapshot`, `BuyerSnapshot` |
| `html/certificate.ts` | Certificate page. | `renderCertificateSection`, `CertificateData` |

### UI (`src/components/`)
- `ui/` primitives: `Button`, `Input`, `Select`, `Textarea`, `Field`, `BilingualField`, `Dialog`, `ConfirmDialog`, `Table`, `Badge`, `Toast`/`useToast`, `Tabs`, `Card`, `Pagination`, `EmptyState`, `cn`. (`src/components/documents/.gitkeep` is empty.)
- `layout/`: `Sidebar`, `TopBar`, `UserMenu`, `LocaleSwitch`, `ThemeSwitch`, `SettingsNav`.
- `forms/`: `LoginForm`, `AccountForm`, `ChangePasswordForm`, `ClientForm`, `ClientArchiveButton`, `ProjectForm`, `ProjectActions`, `ProjectFiles`, `CreateInvoiceFromMilestoneButton`, `NewContractForm`, `ContractBuilder` + `Contract{Basics,Pricing,Schedule,Clauses,Review}Step`, `ContractDraftActions`, `ContractLifecycleActions`, `ContractDocumentViewer`, `SendContractDialog`, `SignaturePad`, `NewInvoiceForm`, `InvoiceLinesEditor`, `InvoiceMetaForm`, `InvoiceActions`, `InvoiceDocumentViewer`, `SettingsForm`, `ImageUploadField`, `TestEmailButton`, `SigningExperience`, `FinalizeRetryBanner`, `VerificationForm`, **`TemplateForm` (T-035)**, **`TemplateActions` (T-035)**.

### Routes (`src/app/`)
- Authenticated group `(app)`: `layout.tsx`, `page.tsx` (dashboard, T-036), `account`, `audit`, `clients/{page,new,[id],[id]/edit}`, `projects/{page,new,[id],[id]/edit}`, `contracts/{page,new,[id],[id]/edit}`, `invoices/{page,new,[id],[id]/edit}`, `templates/{page,new,[id],[id]/edit}`, `users/{page,new,[id]}`, `settings/{layout,page,company,defaults,numbering,signing,email}`, `error.tsx`.
- Public: `login/page.tsx`, `layout.tsx`, `globals.css`, `s/[token]/page.tsx`, `s/[token]/pdf/route.ts`, `v/[code]/page.tsx`, `verify/page.tsx`.
- API: `api/health/route.ts` (public), `api/contracts/[id]/pdf/route.ts`, `api/invoices/[id]/pdf/route.ts`, `api/files/[id]/route.ts`.
- **Missing (future):** none of the planned page routes (all built).

### Files that look related but must NOT be edited
- Anything under `drizzle/` (committed migrations/snapshots) — R5.
- `src/db/schema.ts` — change only via `npm run db:generate` (never hand-edit a committed migration).
- `package-lock.json` — only via npm.
- `.env.local` — never commit; never print values.
- Pure utilities already covered by tests (`money.ts`, `dates.ts`, `crypto.ts`, `ids.ts`, `canonical-json.ts`, `render-body.ts`, `variables.ts`) — treat as frozen unless the task explicitly says so.

---

# 4) Changes Made

This is a summary of the committed work (one commit per task; full details are in `PROGRESS.md`). Chronological, most recent last. Each entry names the files and the key decision.

1. **T-001 Repository bootstrap** (`55a82cf`): Next 16.3.3 + React 18.3.1 mirrored from `task-board`; layout; deps; `next.config.ts` standalone; Tailwind 3; `.env.example`; Cairo font.
2. **T-002 Tooling & CI**: scripts, ESLint flat config, Prettier, `vitest.config.ts`, `scripts/check-rtl.sh` + test, CI workflow.
3. **T-003 Env & logger**: `src/lib/env.ts` (fail-fast Zod), `src/lib/logger.ts` (redactor).
4. **T-004 DB layer**: `src/db/index.ts` (WAL etc.), `migrate.ts`, `drizzle.config.ts`, `test-db.ts`, `tests/setup-env.ts`.
5. **T-005 Schema: identity/infra** + append-only `audit_log` triggers (`drizzle/0000`, `0001`).
6. **T-006 Pure utils**: ids, crypto, money, dates, canonical-json, errors, result (all 16.1 vectors tested).
7. **T-007 i18n/fonts/theme/root layout**: next-intl cookie locale, Cairo, `LocaleSwitch`/`ThemeSwitch`, `messages/*.json`.
8. **T-008 Auth**: argon2, sessions, rate limit, login/logout, `/login`, `scripts/{create-user,seed}.ts`; **created `services/audit.ts` + `actions/_run.ts` early**.
9. **T-009 App shell + UI primitives + account + permissions**; **created `lib/permissions.ts` early**; fixed a `check:rtl` false positive (`rounded-lg`/`border-red-500`).
10. **T-010 Audit service/page + action wrapper tests**; fixed missing-field Zod message to use `required_error: "errors.required"`.
11. **T-011 Settings + files services, settings pages, `/api/files/[id]`**.
12. **T-012 Clients** (schema + migration `0002`, service, pages, LIKE-escaping).
13. **T-013 Projects + numbering** (migration `0003`, `P-NNNN` codes).
14. **T-014 Contract schema + integrity triggers** (migrations `0004` + `0005`).
15. **T-015 Template engine** (`render-body.ts`, `variables.ts`, `sample-snapshot.ts`).
16. **T-016 Seed templates + read-only template pages + preview**; `scripts/seed.ts` now seeds settings + templates.
17. **T-017 Contract totals + milestone planning** (`contract-calc.ts`, `milestones.ts`).
18. **T-018 Contract service (draft side)** + snapshot + send validation + actions.
19. **T-019 Contract builder UI** (list/new/detail/4-step builder, live totals); fixed nullable milestone schema fields.
20. **T-020 PDF infra + contract HTML**; installed Chromium 1248; confirmed data-URI images render with network blocked and page numbers work with JS disabled.
21. **T-021 Contract PDF endpoint + preview action + Review step**; doc-lang compatibility.
22. **T-022 Contracts list sort whitelist + tabbed detail + project contracts tab**.
23. **T-023 Invoice/payment schema + triggers** (migrations `0006` + `0007`; partial unique milestone index).
24. **T-024 Invoice service**; fixed `issueInvoice` reading `prefix` from the wrong settings section.
25. **T-025 Payments**; added `amountMinor ≥ 1` guard (otherwise a raw `SqliteError`).
26. **T-026 Invoice pages**; fixed payments table header using the `{currency}`-param key.
27. **T-027 Invoice PDF**; **fixed an XSS gap** in `pick()` (single-language mode returned unescaped text) in `pdf/html/shared.ts` and `pdf/html/invoice.ts`.
28. **T-028 Project dossier** (financial summary 7.11, milestones-to-invoice, files, activity).
29. **T-029 Send flow** (`services/email.ts`, `validation/signing.ts`, `services/contracts-send.ts`, actions, `SignaturePad`, `SendContractDialog`, Review-step wiring). Fixed `MISSING_MESSAGE` bugs (cross-namespace translator) and the same `prefix` settings bug in `sendContract`.
30. **T-030 Email service and worker skeleton** (`services/email.ts` key array + `isEmailTemplateKey` + `test_email`; new `services/email-templates.ts`, `services/email-worker.ts`, `scripts/worker.ts`; `sendTestEmailAction`; `TestEmailButton`; worker-status card on the settings email page; `settings.worker.*` i18n). Enriched the `contract_signing_link` payload in `contracts-send.ts` with `number`/`titleAr`/`titleEn`.
31. **T-031 Public signing experience** (new `services/signing.ts`, `actions/signing.ts`, `app/s/[token]/page.tsx`, `app/s/[token]/pdf/route.ts`, `components/forms/SigningExperience.tsx`; `validation/signing.ts` schemas; `signing.*` i18n; 9.5 security headers in `next.config.ts`). Records the client signature but does **not** finalize (T-032).
32. **T-032 Finalization, sealed PDF, certificate** (new `services/contract-finalize.ts` + `components/forms/FinalizeRetryBanner.tsx`; `submitClientSignature`/`signAsProvider` now finalize + seal; `contract_signed_copy` email template; email-worker attachments; worker `retryPendingFinalizations`; `retryFinalizeAction`; banner on the contract detail page; `contracts.finalize.*` i18n).
33. **T-033 Verification** (new `services/verification.ts` + `actions/verification.ts` + `app/v/[code]/page.tsx` + `app/verify/page.tsx` + `components/forms/VerificationForm.tsx`; `verification.*` i18n; public DTO with no client PII/amounts; PDF SHA-256 check; per-IP rate limits).
34. **T-034 Lifecycle** (new `services/contracts-lifecycle.ts` + `components/forms/ContractLifecycleActions.tsx`; `cancelContract` extended; worker hourly `expireContracts`; `reviseContractAction`/`regenerateSigningLinkAction`/`completeContractAction`/`terminateContractAction`; Signatures tab populated; `contracts.actions|signatures|revise*|terminate*|link*` i18n).
35. **T-035 Template editor** (`validation/template.ts` gains `templateInputSchema`/`templateClauseInputSchema`; `services/templates.ts` gains `createTemplate`/`updateTemplate`/`duplicateTemplate`/`archiveTemplate` + `assertValidClauses`/`insertClauses`; new `actions/templates.ts`, `components/forms/TemplateForm.tsx`, `components/forms/TemplateActions.tsx`, routes `/templates/new` + `/templates/[id]/edit`; list page New button; detail page Edit/Duplicate/Archive + read-only notice; `templates.*` i18n; new `templates-editor.test.ts` + a clause-copy test in `contracts.test.ts`).
36. **T-036 Dashboard** (new `services/dashboard.ts` `getDashboard(today?)` implementing all 7.12 metrics with per-currency grouping and business-tz month boundaries; `src/app/(app)/page.tsx` replaced the placeholder with stat cards + awaiting/due-soon/ending-soon/activity tables + an owner-only worker-stale warning; `dashboard.*` i18n; new `dashboard.test.ts` with an isolated fixture DB).
37. **T-037 Invoice emails, reminders, daily jobs** (`email-templates.ts` implements `invoice_issued`/`invoice_overdue_reminder`/`contract_declined_notice`; `signing.ts` adds `declinedByName`; `invoices.ts` adds `sendInvoiceEmail` + `localeForInvoice`; `email-worker.ts` renders the invoice PDF at send time via an injectable `OutboxDeps`; new `daily-jobs.ts` `sendOverdueReminders`/`runDailyJobs`; `scripts/worker.ts` runs `runDailyJobs` every 15 min; `sendInvoiceEmailAction` + an "Email invoice" button; `invoices.sendEmail`/`invoices.emailQueued` i18n; new `invoice-emails.test.ts` + 6 `email-templates.test.ts` tests).
38. **T-038 Backups and health** (new `services/backups.ts` `runBackup`/`createDatabaseBackup`/`createFilesArchive`/`applyRetention`; new `services/health.ts` `checkDatabase`/`getHealth`; new public `app/api/health/route.ts`; `daily-jobs.ts` `runDailyJobs` made async and runs the backup at hour 03 via `worker_state.lastBackupDate`; `scripts/worker.ts` awaits the daily job through `inFlight`; README restore section; new `backups.test.ts` (6) + `health.test.ts` (2)).
39. **T-039 Users management** (new `validation/users.ts`; new `services/users.ts` `createUser`/`updateUser`/`setUserStatus`/`setUserPassword`/`listUsers`/`getUser` + last-owner guard; new `actions/users.ts`; new `components/forms/UserForm.tsx`/`UserPasswordForm.tsx`/`UserStatusButton.tsx`; routes `/users`, `/users/new`, `/users/[id]`; `users.*` i18n + `errors.emailInUse`; new `users.test.ts` (11)).
40. **T-040 task-board link** (new `lib/taskboard.ts` `resolveTaskboardUrl`; project overview link display on `projects/[id]/page.tsx`; `projects.taskboardOpen` i18n; new `taskboard.test.ts` (5) + 2 in `projects.test.ts`; `OPEN_QUESTIONS.md` Q-1). The `taskboardRef` field itself already existed from earlier tasks.
41. **T-041 Docker, compose, Nginx, README** (new `Dockerfile`, `docker-compose.yml`, `nginx/dossier.conf`, `nginx/dossier-proxy.conf`, `public/.gitkeep`; extended `.dockerignore`; README deployment + first-run checklist; **`src/db/index.ts` opens SQLite lazily** to survive `next build`). No new unit tests.
42. **T-042 End-to-end tests** (new `playwright.config.ts`, `tests/e2e/{config,prepare,helpers,full-flow.spec,rtl.spec}.ts`; `package.json` `e2e:prepare`/`e2e:serve`; `.gitignore` `.e2e-data/`; CI `e2e` job). 3 Playwright specs; no new unit tests.
43. **T-043 Security & QA pass** (i18n'd the toast dismiss label; new `src/server/actions/authorization.test.ts` table test for all 54 server actions; new `src/server/services/data-integrity.test.ts` invariant queries; CI non-blocking `npm audit`; `OPEN_QUESTIONS.md` Q-2 for the audit findings; full section-20 results recorded in `PROGRESS.md`). 5 new tests.

## Commands run that changed the system
- `npm install` (and `npm rebuild better-sqlite3`) — installed deps; approved native install scripts via `package.json` `allowScripts`.
- `npx playwright install chromium` — downloaded Chromium revision 1248 into `~/.cache/ms-playwright`.
- `npm run db:generate` (several times) — created migrations `0000`…`0007`.
- `npm run db:migrate` on throwaway `DATA_DIR`s — applied migrations (never on a committed DB).
- `npm run seed` — seeded settings + templates + bootstrap owner.
- Temporary local `.env.local` created (gitignored) so dev/build pass env validation.

## Decisions taken (and alternatives rejected)
- **Mirror `task-board` versions** (Next 16.3.3 + React 18.3.1) rather than the spec's React 19 fallback (R3.1 says task-board wins). ESLint uses task-board's flat config (`@next/eslint-plugin-next` + `typescript-eslint` + react plugins) instead of `eslint-config-next`.
- **`withTx` is synchronous** (better-sqlite3); no `await` inside a transaction (R12). File I/O (signatures) happens **before** the transaction in `sendContract`.
- **Token storage:** the signatory row stores only `hmacToken(rawToken)`; the raw token exists only inside the `email_outbox` payload (per 15.1), to be redacted when the worker sends it (T-030). The spec conflicts (16.1 says "raw token not stored anywhere"); documented in `PROGRESS.md`.
- **Overdue** is derived at read time (`isOverdue` + business timezone), never stored.
- **Integrity tests** use a fresh in-memory DB per test because immutable rows (audit log, versions, sent contracts) cannot be cleaned up in a shared DB.

## Left half-done / inconsistent
- "Sign as company" on the contract detail page (plan line 1999) is not implemented; the `signAsProvider` service/action exist and provider signing before send works. Follow-up.
- `expireContracts` expires only on `signingDeadline < today` (7.4); contracts with no signing deadline never auto-expire (their link still dies at the token TTL).
- 7 email templates are implemented (`contract_signing_link`, `contract_otp`, `contract_signed_copy`, `contract_declined_notice`, `invoice_issued`, `invoice_overdue_reminder`, `test_email`); `contract_expired_notice` and `internal_notice` still throw `EMAIL_FAILED` (not enqueued anywhere yet).
- `Cache-Control: no-store` from `next.config.ts` is overridden by Next.js on dynamic HTML pages (kept on the PDF routes); a middleware is needed to force it on the document (T-043).
- `playwright.config.ts` + `tests/e2e/*` exist (T-042); `npm run test:e2e` is green (port 3210). The e2e server uses `next start` (benign standalone warning).
- Local `./data/dossier.sqlite` is unmigrated (run `npm run db:migrate` for it before `npm run worker`).
- Port 3000 is used by another local project (TaskBoard); run Dossier's dev server with `PORT=3100`.

---

# 5) Failed Attempts

1. **npm 12 blocked native install scripts.** Symptom: after `npm install`, `require('better-sqlite3')` / `require('esbuild')` failed (no binary). Cause: npm 12 refuses package install scripts by default. Fix: added `allowScripts` entries to `package.json` (mirroring `task-board`) and ran `npm rebuild better-sqlite3`. Do not retry by disabling scripts globally.
2. **`tsx` could not resolve the `@/` alias at first** (appeared as an error running `db:migrate`). Cause: I had not passed a valid `NODE_ENV`/env, so `env.ts` threw `NODE_ENV: Required`; the alias itself actually resolves via `tsx`. Fix: run scripts with a complete env. Do not "fix" the alias by adding a loader.
3. **`NODE_ENV` is readonly in `@types/node`** in tests. Symptom: `error TS2540: Cannot assign to 'NODE_ENV' because it is a read-only property.` Fix: replace `process.env` wholesale (`process.env = { ...process.env, NODE_ENV: "test" }`) in test helpers, not `process.env.NODE_ENV = …`.
4. **`check:rtl.sh` false positives.** The T-002 compound pattern matched `rounded-l` inside `rounded-lg` and `border-r` inside `border-red-500`. Fix: `PATTERN_2` now requires a non-letter after `border-[lr]`/`rounded-[lr]`; a regression test locks it. Do not loosen R7 or allow-list classes.
5. **Shared-DB test cleanup hit integrity triggers.** Symptom: `SqliteError: signed contracts are immutable` / `issued invoices are immutable` when deleting rows in `beforeEach`. Fix: those test files use a fresh `createTestDb()` per test (or reset rows to `draft`/`null` before deleting). Do not weaken the triggers.
6. **`milestoneRowSchema` rejected `null`.** Symptom: saving the schedule step failed with a generic `VALIDATION_FAILED` (field errors under `rows.*`) instead of `errors.milestonesSumMismatch`. Fix: added `nullableOptDate`/`nullableOptText`; regression test added. Do not "fix" by sending `undefined` instead of `null`.
7. **`MISSING_MESSAGE` runtime errors (T-029).** `SendContractDialog` used `useTranslations("contracts")` then `t("common.cancel")`; `ContractReviewStep` used `t(issue.messageKey)` where the key already includes the `contracts.` prefix. Symptom: console `MISSING_MESSAGE: Could not resolve 'contracts.common.cancel' …` and the dialog silently failed to submit. Fix: root translators (`useTranslations()`) for cross-namespace keys; typed `CONTRACT_ISSUE_CODES`; a messages test asserts every issue code has a key. Do not add duplicate flat keys.
8. **Wrong settings section for `prefix`.** Both `issueInvoice` and `sendContract` read `defaults.prefix`; the prefix actually lives in the **`numbering`** section. Symptom: `Property 'prefix' does not exist on type …` at typecheck. Fix: `getSettings("numbering").prefix`. Check any future numbering code uses the `numbering` section.
9. **XSS gap in PDF `pick()` (T-027).** In single-language (`ar`/`en`) mode the helper returned **unescaped** text, so hostile item/milestone descriptions or buyer names could inject HTML into the PDF. Symptom: a test asserting `not.toContain("<script>")` failed. Fix: escape in every branch of `pick()` in `pdf/html/shared.ts` and `pdf/html/invoice.ts`; regression tests added. Do not remove the escaping.
10. **Playwright browser revision missing.** `playwright` 1.64 needs Chromium 1248, which was not cached. Fix: `npx playwright install chromium`. Do not skip the install and assume `page.pdf()` works.
11. **Local test/QA server management.** Running `npm run dev` with shell backgrounding (`&`) inside the tool was unreliable (server died / log path lost). Fix: use the `background_process` tool with a `ready` pattern (`Ready in`) instead. Not a code bug.
12. **`getTranslations({ locale })` override ignored (T-031).** In this next-intl setup (no locale routing), `getTranslations({ locale: "en", namespace: "signing" })` kept returning the **cookie** locale, so `?lang=en` rendered Arabic server strings. Symptom: `/s/<token>?lang=en` showed "تنزيل PDF". Fix: read the chosen-locale `messages/<locale>.json` bundle directly for server-rendered strings and wrap the client subtree in a nested `NextIntlClientProvider locale={locale}`. Do not rely on the `locale` argument of `getTranslations` here.
13. **zsh does not word-split unquoted variables.** `ENV="A=1 B=2" && env $ENV cmd` passed the whole string as one variable. Fix: pass env inline on the command (`A=1 B=2 cmd`) or quote/`eval`. Not a code bug.
14. **Dev server vs. fixture secret mismatch (T-031).** The signing token hash is `hmacToken(token, APP_SECRET)`; a fixture created with one `APP_SECRET` is invalid under the dev server's `.env.local` secret. Fix: run the dev server with the same `APP_SECRET` inline when testing a fixture-created token.
15. **Port 3000 already in use (T-032).** Another local project (TaskBoard) runs its own `next dev` on port 3000, so `npm run dev` for Dossier failed the readiness probe. Fix: run Dossier with `PORT=3100 ... npm run dev` (and set `APP_URL` to the same origin). Not a code bug.
16. **next-intl `FORMATTING_ERROR` when translating a server field-error key (T-035).** The template service returns `fieldErrors` as `{ field: messageKey }` only (no interpolation params), but `templates.unknownVariable`/`templates.signaturesBlockCount` contain `{variable}`/`{count}`. Calling `t(key)` without params logged `IntlError: FORMATTING_ERROR: The intl string context variable "variable" was not provided…` (and rendered the raw placeholder). Fix: only translate plain `errors.*` keys on the client; for param-bearing validation keys fall back to the generic `errors.VALIDATION_FAILED`, and rely on the **client-side live validator** (same `validateTemplateClauses`) to show the precise per-issue message with params. Do not translate a messageKey without its params.
17. **Deleting issued invoices in tests fails (T-037).** `beforeEach` cleanup with `db.delete(invoices)` threw `SqliteError: issued invoices cannot be deleted` (trigger `invoices_no_delete_issued`: `OLD.number IS NOT NULL OR OLD.status <> 'draft'`). Fix: do **not** delete issued invoices in tests; give each test its own dated fixtures and clear only `email_outbox` (no trigger). The same applies to non-draft contracts/payments (`contracts_no_delete_sent`, `payments_no_delete`).
18. **`tsx` + top-level `await` in a throwaway script (T-037).** `npx tsx tmp/x.ts` with a top-level `await` failed: `Top-level await is currently not supported with the "cjs" output format`. Fix: wrap the body in an `async function main()` and call `void main()`.
19. **`.rejects` on a synchronous service call (T-039).** `await expect(updateUser(...)).rejects.toMatchObject(...)` failed: `updateUser` is synchronous and throws **before** a promise exists, so the thrown `AppError` escaped the assertion. Fix: wrap the call in an async thunk — `await expect(async () => updateUser(...)).rejects.toMatchObject({ code: "INVALID_STATE" })` — or use `expect(() => fn()).toThrow()`. Only truly async functions (`createUser`, `setUserPassword`) work with `.rejects` directly.
20. **Test fixtures that create owners break the last-owner guard test (T-039).** The guard counts active owners globally; an earlier test creating an `owner` actor left 2 owners, so the "last owner" assertion did not trigger. Fix: keep the persisted owner count at zero in helper fixtures (actors are `member`s) and build the guard test around a single `beforeAll` owner.
21. **`document.body.textContent` gives false positives in dev (T-040).** Checking whether a label rendered via `document.body.textContent.includes("task-board reference")` returned `true` even when the field was absent, because Next.js dev embeds the RSC payload and next-intl messages as inline script text. Fix: assert against the rendered elements (`[...document.querySelectorAll("dl dt")].map((d) => d.textContent)`), not the whole body text.
22. **`better-sqlite3` fails to install in the Docker image (T-041).** `npm ci` in the Playwright image ran better-sqlite3's install script, which tried to compile from source (no prebuilt binary for the image's Node 24 ABI) and failed: `gyp ERR! stack Error: not found: make`. Fix: `apt-get install build-essential python3` in the base stage.
23. **`next build` aborts in the Docker image with a Node native assertion (T-041).** After the toolchain fix, `next build` compiled and ran TypeScript, then crashed during "Collecting page data": `# Assertion failed: (env) != nullptr` in `node::RemoveEnvironmentCleanupHook`, called from `Statement::~Statement()` in `better_sqlite3.node`, ending with `Next.js build worker exited with code: null and signal: SIGABRT`. Cause: `src/db/index.ts` opened SQLite at import time, so each short-lived page-data worker opened the connection and its native destructors ran after the V8 env was torn down. Fix: open SQLite **lazily on first use** (Proxy over `db`/`sqlite`) so the build never opens it. All 489 tests still pass.
24. **Runner missing `tsconfig.json` breaks `tsx` (T-041).** `npm run db:migrate` / `npx tsx scripts/worker.ts` failed to resolve `@/*` because the runner stage did not copy `tsconfig.json`. Fix: `COPY --from=build /app/tsconfig.json ./tsconfig.json`.
25. **Wrong container UID in the plan (T-041).** The plan's note said `chown 1000:1000 data`, but the Playwright image's `pwuser` is **UID/GID 1001**, so the container could not write `./data` (`SQLITE_CANTOPEN`, then `SQLITE_READONLY` from stale UID-1000 files). Fix: make `./data` writable by 1001 (`chmod 777` for the local check; README documents `chown -R 1001:1001 data`) and remove stale host-created DB files.
26. **`pkill -f "standalone/server.js"` kills the shell itself (T-042).** The Bash tool wraps the command in a shell whose own command line contains that string, so `pkill -f` matched and killed the wrapper — the tool returned no output and the redirect never ran. Fix: never `pkill -f` a pattern contained in your own command; kill by port instead (`PID=$(ss -ltnp | grep ':3210' | grep -oE 'pid=[0-9]+' | cut -d= -f2); kill $PID`).
27. **Standalone server can't run the app's action chain (T-042).** `node .next/standalone/server.js` served pages, but creating a contract draft failed: `Failed to load external module playwright-...: Cannot find module '.next/standalone/node_modules/playwright-core/browsers.json'` — Next's standalone trace omits the transitive `playwright-core`. Fix for e2e: serve with `next start` (full `node_modules`; prints a benign "does not work with output: standalone" warning). Docker is fine because its runner copies the full `node_modules`.
28. **`/clients/new` matches `/clients/[^/]+$` (T-042).** After saving a client, `await expect(page).toHaveURL(/\/clients\/[^/]+$/)` matched **immediately** while still on `/clients/new` ("new" matches `[^/]+`), so `clientId` became `"new"` and `selectOption("new")` hung. Fix: use a negative lookahead (`/\/clients\/(?!new$)[^/]+$/`).
29. **Reading the id from the full URL (T-042).** `page.url().split("/").filter(Boolean)[1]` on `http://127.0.0.1:3210/contracts/<id>/edit` yields `"127.0.0.1:3210"`, not the id (the contract detail page then 404s). Fix: `new URL(page.url()).pathname.split("/")[2]`.
30. **Playwright default action timeout is 0 (T-042).** With no `actionTimeout`, a `selectOption`/`click` waiting on a locator that never resolves hangs until the **test** timeout (180 s), hiding the real failure. Fix: set `actionTimeout`/`navigationTimeout` in `playwright.config.ts` so failures localize.
31. **Guessing a service signature in a test (T-043).** Calling `voidPayment(user, paymentId, meta)` compiled at the call site only after TS, but at runtime threw `RangeError: Too few parameter values were provided` because the real signature is `voidPayment(user, paymentId, reason, meta)`. Lesson: read the service signature before calling it in a test. Separately, `uploadAttachmentAction(formData: FormData)` is not assignable to a `(raw: unknown) => …` table entry — cast it (`as unknown as Action`) in the authorization table.

## Ruled out as causes
- The `@/` alias is **not** broken for `tsx` (scripts work with a valid env).
- The integrity triggers are **not** too strict; tests adapt to them, not vice versa.
- React 18.3.1 with Next 16.3.3 is **not** the cause of any failure seen so far (build + all tests pass).

---

# 6) Next Steps

**T-043 is COMPLETE** (all steps done, committed on branch `t-043-security-qa`, HEAD `e5d2791`). **All 43 tasks are complete.** No next task exists.

The repo has a remote named `Dossier` → `https://github.com/red-shadows-rs/dossier.git`. Do **not** push unless the user asks. There is **no `main` branch**; the full linear history (T-001…T-043) is on `t-043-security-qa` (current HEAD).

### T-043 completion record (all steps done on `t-043-security-qa`)
1. `src/components/ui/Toast.tsx` + `messages/{en,ar}.json` — i18n'd `aria-label` (`common.dismiss`) — the only hard-coded English string found.
2. `src/server/actions/authorization.test.ts` (new) — table test: all 54 session-guarded actions reject unauthenticated callers (`UNAUTHENTICATED`); viewers get `FORBIDDEN` on every write action; read/account actions pass the gate.
3. `src/server/services/data-integrity.test.ts` (new) — query invariants: Σ milestone total == contract total; `paid_minor` == Σ non-voided payments.
4. `.github/workflows/ci.yml` — non-blocking `npm audit --omit=dev`.
5. `OPEN_QUESTIONS.md` Q-2 — deferred the 3 audit advisories (breaking upgrades).
6. `PROGRESS.md` — full section-20 checklist results.
7. Commits: `T-043: i18n the toast dismiss label (no hard-coded English)`, `T-043: authorization table test for every server action (9.12)`, `T-043: data-integrity invariant tests (20.5)`, `T-043: non-blocking npm audit report in CI (9.11)`, `T-043: record the security/QA pass results; defer npm audit findings`.

Note: `middleware.ts` was **not** added (checklist item was optional "consider"); the `Cache-Control` note remains as low-risk debt. `npm audit --omit=dev` → 3 advisories (`next` critical, `drizzle-orm` high, `nodemailer` high; installed nodemailer 7.0.13); deferred to Q-2.

### T-043 final verification checklist (all passed)
- [x] `npm run check` green (typecheck + lint + check:rtl + **494 tests, 59 files**).
- [x] `npm run build` green.
- [x] `npm run test:e2e` green (3 specs).
- [x] Every section-20 checklist item ticked or deferred with a reason (Q-2).
- [x] Authorization table test green; data-integrity invariants green.
- [x] No secrets committed; no dependency added or upgraded.
- [x] `PROGRESS.md` has a T-043 entry; commits are on branch `t-043-security-qa`.

### T-042 completion record (all steps done on `t-042-e2e`)
1. `playwright.config.ts` (new) — port 3210, `webServer: npm run e2e:serve`, action/navigation timeouts.
2. `tests/e2e/config.ts` / `prepare.ts` / `helpers.ts` (new).
3. `tests/e2e/full-flow.spec.ts` + `tests/e2e/rtl.spec.ts` (new).
4. `package.json` — `e2e:prepare`, `e2e:serve`; `.gitignore` — `.e2e-data/`; CI — `e2e` job.
5. `PROGRESS.md` T-042 entry + commit `T-042: Playwright end-to-end tests (full flow, verification, RTL)`.

Note: the e2e server is `next start` on port 3210 (standalone can't load `playwright-core`); emails stay in `email_outbox` and are read directly. `prepare.ts` fills company email + governing law/jurisdiction (required by template variables). The signing page is opened with `?lang=en`.

### T-042 final verification checklist (all passed)
- [x] `npm run test:e2e` green locally (3 specs).
- [x] `npm run check` green (489 tests, 57 files) and `npm run build` green.
- [x] 16.2 #1 (login→client→project→contract→send→OTP→sign→sealed PDF) passes.
- [x] 16.2 #2 (invoice from milestone→issue→payment→Paid) passes.
- [x] 16.2 #3 (`/v/<code>` valid + not-found) passes.
- [x] 16.2 #4 (Arabic → `dir="rtl"` + sidebar right) passes.
- [x] CI has an `e2e` job; no secrets committed; no dependency added outside section 3.3.
- [x] `PROGRESS.md` has a T-042 entry; the commit is on branch `t-042-e2e`.

### T-041 completion record (all steps done on `t-041-docker`)
1. `Dockerfile` (new) — multi-stage Playwright-based image; `build-essential`+`python3`; build-only placeholder env; runner copies standalone + `tsconfig.json`.
2. `docker-compose.yml` (new) — app + single worker, shared `./data`, healthcheck.
3. `nginx/dossier.conf` + `nginx/dossier-proxy.conf` (new).
4. `.dockerignore` extended; `public/.gitkeep` added.
5. `README.md` — deployment + first-run checklist (UID 1001).
6. `src/db/index.ts` — lazy SQLite open.
7. `PROGRESS.md` T-041 entry + commit `T-041: Dockerfile, compose, Nginx, deployment README (lazy DB for build)`.

Note: the Playwright image's `pwuser` is UID/GID **1001** (not 1000). `docker compose build` + `up -d` verified; `/api/health` 200; worker heartbeat logged; Arabic PDF rendered in-container with Cairo embedded.

### T-041 final verification checklist (all passed)
- [x] `npm run check` green (typecheck + lint + check:rtl + **489 tests, 57 files**) and `npm run build` green after the lazy-DB change.
- [x] `docker compose build` succeeds (`dossier-app:latest`, `dossier-worker:latest`).
- [x] `docker compose up -d` starts app + worker.
- [x] `/api/health` → `200 {"ok":true}` in the container.
- [x] Worker heartbeat appears (`worker_heartbeat`).
- [x] A PDF renders inside the container (Arabic correct: `%PDF-1.4`, 32,634 bytes, `Cairo-Regular` embedded).
- [x] No secrets committed; no dependency added outside section 3.3.
- [x] `PROGRESS.md` has a T-041 entry; the commit is on branch `t-041-docker`.

### T-040 completion record (all steps done on `t-040-taskboard-link`)
1. `src/lib/taskboard.ts` (new) — pure `resolveTaskboardUrl(reference, baseUrl?)`.
2. `src/app/(app)/projects/[id]/page.tsx` — overview link display (external link or plain text).
3. `messages/{en,ar}.json` — `projects.taskboardOpen`.
4. `src/server/services/projects.test.ts` (+2) + `src/lib/taskboard.test.ts` (new, 5).
5. `OPEN_QUESTIONS.md` — Q-1 (automatic task creation + ref shape).
6. `PROGRESS.md` T-040 entry + commit `T-040: task-board reference link display (no auto creation, no network calls)`.

Note: `taskboardRef` already existed (schema/validation/service/form) from earlier tasks; T-040 added the link display. **No network calls and no automatic task creation** (deferred to Q-1). The link is an absolute URL used as-is, else `${TASKBOARD_API_URL}/${ref}`, else plain text.

### T-040 final verification checklist (all passed)
- [x] `npm run check` green (typecheck + lint + check:rtl + **489 tests, 57 files**).
- [x] `npm run build` green.
- [x] Field saved/validated (tests: schema accepts/trims, rejects >200; `createProject` persists).
- [x] No network calls to task-board (pure helper; browser shows a static `href`).
- [x] Browser: plain ref → `${TASKBOARD_API_URL}/${ref}`; absolute ref → used as-is; no ref → no field; 0 console errors.
- [x] No secrets committed; no dependency added outside section 3.3.
- [x] `PROGRESS.md` has a T-040 entry; the commit is on branch `t-040-taskboard-link`.

### T-039 completion record (all steps done on `t-039-users-management`)
1. `src/lib/validation/users.ts` (new) — `createUserSchema`, `updateUserSchema`, `setUserStatusSchema`, `setUserPasswordSchema`.
2. `src/server/services/users.ts` (new) — `listUsers`, `getUser`, `createUser`, `updateUser`, `setUserStatus`, `setUserPassword` + `isLastActiveOwner`.
3. `src/server/actions/users.ts` (new) — 4 actions (`users.manage`).
4. `src/components/forms/UserForm.tsx` / `UserPasswordForm.tsx` / `UserStatusButton.tsx` (new).
5. Routes `src/app/(app)/users/{page,new/page,[id]/page}.tsx`.
6. `users.*` i18n + `errors.emailInUse`; `users.test.ts` (11); `PROGRESS.md` T-039 entry + commit `T-039: users management — create/update/status/password, last-owner guard`.

Note: the last active owner can never be demoted or disabled (`INVALID_STATE`); disabling or password-resetting a user deletes all their sessions immediately. `createUser`/`setUserPassword` are async (argon2). Services do not check the actor's permission (actions do).

### T-039 final verification checklist (all passed)
- [x] `npm run check` green (typecheck + lint + check:rtl + **482 tests, 56 files**).
- [x] `npm run build` green (`/users`, `/users/[id]`, `/users/new` in the route list).
- [x] Cannot demote/disable the last owner (tests + browser).
- [x] A disabled user's session is invalid immediately (test).
- [x] `canSignForCompany` toggle works (test + browser).
- [x] Owner can set a new password (test).
- [x] No secrets committed; no dependency added outside section 3.3.
- [x] `PROGRESS.md` has a T-039 entry; the commit is on branch `t-039-users-management`.

### T-038 completion record (all steps done on `t-038-backups-health`)
1. `src/server/services/backups.ts` (new) — `createDatabaseBackup`, `createFilesArchive`, `applyRetention`, `runBackup`, `backupsDir`.
2. `src/server/services/health.ts` (new) — `checkDatabase`, `getHealth`.
3. `src/app/api/health/route.ts` (new) — public `GET` → 200/503.
4. `src/server/services/daily-jobs.ts` — `runDailyJobs` async + backup at hour 03.
5. `scripts/worker.ts` — daily job awaited through `inFlight`.
6. README — "Backups and restore".
7. Tests: `backups.test.ts` (6) + `health.test.ts` (2); `PROGRESS.md` T-038 entry + commit `T-038: backups and health endpoint`.

Note: the DB snapshot uses the better-sqlite3 online `backup()` API; the Sunday files tar uses `execFile('tar', [constant args])`; retention keeps the 3 newest regardless of age; the backup pass is idempotent per business-tz date via `worker_state.lastBackupDate`. `checkDatabase`/`getHealth` accept an optional handle (defaults to the app `sqlite`) so the closed-DB path is unit-testable.

### T-038 final verification checklist (all passed)
- [x] `npm run check` green (typecheck + lint + check:rtl + **471 tests, 55 files**).
- [x] `npm run build` green (`/api/health` in the route list).
- [x] A backup of a temp DB opens successfully (test).
- [x] Retention keeps the 3 newest (test).
- [x] Health returns 503 if the DB is closed (test) and 200 `{"ok":true}` over HTTP (dev server).
- [x] No secrets committed; no dependency added outside section 3.3.
- [x] `PROGRESS.md` has a T-038 entry; the commit is on branch `t-038-backups-health`.

### T-037 completion record (all steps done on `t-037-invoice-emails`)
1. `email-templates.ts` — implemented `contract_declined_notice`, `invoice_issued`, `invoice_overdue_reminder` (AR/EN).
2. `signing.ts` — `declinedByName` added to the declined-notice payload.
3. `invoices.ts` — `sendInvoiceEmail` + `localeForInvoice` (enqueue only; status unchanged; audit `invoice.sent`).
4. `email-worker.ts` — renders the invoice PDF at send time (`resolveInvoicePdf` + `renderPdf`), injectable via `OutboxDeps`.
5. `daily-jobs.ts` (new) — `sendOverdueReminders(today, atMs?)`, `runDailyJobs(atMs?)` with `worker_state`.
6. `scripts/worker.ts` — `runDailyJobs` every 15 min + at startup.
7. `actions/invoices.ts` + `InvoiceActions.tsx` — `sendInvoiceEmailAction` + "Email invoice" button; `invoices.sendEmail`/`invoices.emailQueued` i18n.
8. Tests: `invoice-emails.test.ts` (13) + 6 in `email-templates.test.ts`; `PROGRESS.md` T-037 entry + commit `T-037: invoice emails, overdue reminders, daily jobs`.

Note: reminders run only when `email.overdueRemindersEnabled`; only on `overdueReminderDays` offsets; at most once per day per invoice; the reminder pass runs once per business-tz date at hour 08. The invoice PDF is rendered by the worker at send time (never inside a transaction). (`runDailyJobs` now also runs the T-038 backup pass at hour 03 and is async.)

### T-037 final verification checklist (all passed)
- [x] `npm run check` green (typecheck + lint + check:rtl + **463 tests, 53 files**).
- [x] `npm run build` green.
- [x] Reminders only when enabled and only on configured offsets (tests).
- [x] At most once per day per invoice (tests).
- [x] PDF rendered at send time, not inside a transaction (tests + real-path smoke: worker rendered the invoice PDF with Chromium and marked the row `sent`).
- [x] Browser: "Email invoice" button enqueues `invoice_issued`; invoice status unchanged.
- [x] No secrets committed; no dependency added outside section 3.3.
- [x] `PROGRESS.md` has a T-037 entry; the commit is on branch `t-037-invoice-emails`.

### T-036 completion record (all steps done on `t-036-dashboard`)
1. `src/server/services/dashboard.ts` (new) — `getDashboard(today?)` implementing 7.12.1–7.12.7 (awaiting signature, signed-last-30, drafts, outstanding/overdue, due-soon, revenue by month, ending-soon, recent activity), all money grouped per currency.
2. `src/app/(app)/page.tsx` — stat cards + four tables + owner-only worker-stale warning; per-currency `formatMoney`; entity links to contract/invoice detail.
3. `messages/{en,ar}.json` — `dashboard.*` (~25 new keys).
4. `src/server/services/dashboard.test.ts` (new, 8 tests) — isolated fixture DB covering every metric.
5. `PROGRESS.md` T-036 entry + commit `T-036: dashboard — 7.12 metrics, per-currency grouping, worker-stale warning`.

Note: outstanding/overdue use only `issued`/`partially_paid`; revenue filters `payments.voidedAt IS NULL`; month boundaries come from `todayInTz(business tz)`. `getDashboard` takes an optional `today` for deterministic tests. The awaiting list is capped at 50 rows (count is exact). The dashboard has no new permission (all authenticated users); only the worker warning is owner-only.

### T-036 final verification checklist (all passed)
- [x] `npm run check` green (typecheck + lint + check:rtl + **446 tests, 52 files**).
- [x] `npm run build` green.
- [x] Browser (owner): all 7.12 metrics render correctly in Arabic RTL and English, **0 console errors**; worker-stale warning shown for the owner.
- [x] Browser (member): dashboard renders without the worker warning (owner-only gate).
- [x] Tests with fixture data match 7.12 (month boundaries; voided payments excluded; per-currency grouping).
- [x] No secrets committed; no dependency added outside section 3.3.
- [x] `PROGRESS.md` has a T-036 entry; the commit is on branch `t-036-dashboard`.

### T-035 completion record (all steps done on `t-035-template-editor`)
1. `src/lib/validation/template.ts` — `templateClauseInputSchema`, `templateInputSchema` (nested `templateDefaultsSchema`, 1–60 clauses).
2. `src/server/services/templates.ts` — `createTemplate`, `updateTemplate`, `duplicateTemplate`, `archiveTemplate` (+ `insertClauses`, `assertValidClauses`); system templates → `INVALID_STATE`; audits `template.created|updated|duplicated|archived`.
3. `src/server/actions/templates.ts` — `createTemplateAction`, `updateTemplateAction`, `duplicateTemplateAction`, `archiveTemplateAction` (`templates.write`).
4. `src/components/forms/TemplateForm.tsx` (basics + defaults incl. milestone preset + clause editor + live validation + live preview + legal notice) and `TemplateActions.tsx` (Duplicate/Archive).
5. Routes `src/app/(app)/templates/new/page.tsx`, `src/app/(app)/templates/[id]/edit/page.tsx`; list New button; detail Edit/Duplicate/Archive + read-only notice; `templates.*` i18n (~34 keys en/ar).
6. Tests: `src/server/services/templates-editor.test.ts` (15) + 1 in `contracts.test.ts` (clause-copy unaffected); `PROGRESS.md` T-035 entry + commit `T-035: template editor — create/update/duplicate/archive, clause editor with live preview`.

Note: system templates are read-only everywhere (UI hides Edit; service throws `INVALID_STATE`); "Duplicate" copies any template into an editable copy (`isSystem=false`, `key=NULL`) and opens its editor. Server field errors carry message keys only, so the form shows precise clause issues via the **client live validator** and a generic `errors.VALIDATION_FAILED` for the server rejection (see Failed Attempts #16).

### T-035 final verification checklist (all passed)
- [x] `npm run check` green (typecheck + lint + check:rtl + **438 tests, 51 files**).
- [x] `npm run build` green (`/templates/new` + `/templates/[id]/edit` in the route list).
- [x] Browser: system template read-only (no Edit, only Duplicate); duplicate → editable copy + editor; unknown variable shows a live message and save is rejected with **0 console errors**.
- [x] A contract created from a template copy keeps its clauses after the template is edited (test).
- [x] No secrets committed; no dependency added outside section 3.3.
- [x] `PROGRESS.md` has a T-035 entry; the commit is on branch `t-035-template-editor`.

### T-034 completion record (all steps done on `t-034-lifecycle`)
1. `src/server/services/contracts-lifecycle.ts` — `reviseContract` (recall), `regenerateSigningLink`, `expireContracts`, `completeContract`, `terminateContract`, `listContractSignatories` (+ 12 tests).
2. `src/server/services/contracts.ts` — `cancelContract` now allows draft/sent/declined/expired + revokes tokens; `contracts-send.ts` exports `tokenExpiryMs`.
3. `scripts/worker.ts` — hourly `expireContracts` (runs at startup too).
4. `src/server/actions/contracts.ts` — `reviseContractAction`, `regenerateSigningLinkAction`, `completeContractAction`, `terminateContractAction`.
5. `src/components/forms/ContractLifecycleActions.tsx` + the detail page: per-status action buttons, once-only fresh-link dialog, terminate reason dialog; the **Signatures** tab now lists signatories.
6. `contracts.actions|signatures|revise*|terminate*|link*` i18n (en/ar); `PROGRESS.md` T-034 entry + commit `T-034: revise, regenerate link, expire, complete, terminate`.

Note: 7.4 revise applies to **sent/declined/expired** (not signed) and keeps the existing children/versions in place (it does not copy clauses/items/milestones); only `versionNo` is bumped and tokens revoked.

### T-034 final verification checklist (all passed)
- [x] `npm run check` green (typecheck + lint + check:rtl + **422 tests, 50 files**).
- [x] `npm run build` green.
- [x] Recall sent → draft, versionNo 1→2, same number, tokens nulled, audit; re-send → version 2 with a different hash (test + browser).
- [x] Regenerate issues a fresh link (old invalid), once-only dialog (browser); non-sent → `INVALID_STATE` (test).
- [x] Hourly expire of an overdue sent contract, tokens revoked, audit (test + worker run).
- [x] Complete (signed → completed) and terminate (signed → terminated + reason); invalid transitions → `INVALID_STATE` (test + browser).
- [x] Cancel for sent/declined/expired + token revoke; signed → `INVALID_STATE` (test + browser).
- [x] Signatures tab shows statuses + viewed/OTP/signed times + method (browser).
- [x] No secrets committed; no dependency added outside section 3.3.
- [x] `PROGRESS.md` has a T-034 entry; the commit is on branch `t-034-lifecycle`.

### T-033 completion record (all steps done on `t-033-verification`)
1. `src/server/services/verification.ts` — `lookupVerification` (minimal public DTO, no client PII/amounts), `checkPdfUpload` (in-memory SHA-256 vs `pdfSha256`), `assertLookupRateLimit`/`assertFileCheckRateLimit` (+ 7 tests).
2. `src/server/actions/verification.ts` — public, rate-limited `verifyCodeAction`/`checkPdfAction`.
3. `src/app/v/[code]/page.tsx` + `src/app/verify/page.tsx` + `src/components/forms/VerificationForm.tsx`.
4. `verification.*` i18n (en/ar); 9.5 headers already cover `/v/*` and `/verify` (T-031).
5. `PROGRESS.md` T-033 entry + commit `T-033: verification`.

### T-033 final verification checklist (all passed)
- [x] `npm run check` green (typecheck + lint + check:rtl + **410 tests, 49 files**).
- [x] `npm run build` green (`/v/[code]` + `/verify` in the route list).
- [x] Browser: `/v/<contract>` and `/v/<invoice>` render minimal DTOs; unknown code → generic not-found; `/verify` lookup + PDF upload match/mismatch.
- [x] Contract DTO contains no client email/phone/amounts (test).
- [x] `nosniff` + `X-Frame-Options: DENY` + `Referrer-Policy: no-referrer` + `X-Robots-Tag: noindex` on `/v/*` and `/verify`.
- [x] No secrets committed; no dependency added outside section 3.3.
- [x] `PROGRESS.md` has a T-033 entry; the commit is on branch `t-033-verification`.

### T-032 completion record (all steps done on `t-032-finalization`)
1. `src/server/services/contract-finalize.ts` — `finalizeContractTx` (all-signed + integrity check + code + token null + audit), `generateSealedPdf` (snapshot + signatures + certificate + QR + sealed file + `pdfSha256` + signed-copy emails + failure/retry), `retryPendingFinalizations`.
2. `submitClientSignature` (now `async`) and `signAsProvider` (now `async`) finalize inside the tx and seal after.
3. `contract_signed_copy` email template + worker attachments (`OutgoingMail.attachments`, `attachmentFileIds` in the payload).
4. `scripts/worker.ts` — finalize retry every 5 min (serialized).
5. `retryFinalizeAction` + `FinalizeRetryBanner` (red banner + attempts + Retry) + `contracts.finalize.*` i18n.
6. `PROGRESS.md` T-032 entry + commit `T-032: finalization, sealed PDF, certificate`.

### T-032 final verification checklist (all passed)
- [x] `npm run check` green (typecheck + lint + check:rtl + **403 tests, 48 files**).
- [x] `npm run build` green.
- [x] After both signatures: `signed`, code set, tokens/OTP nulled, sealed PDF stored with matching `sha256` (test + browser).
- [x] Simulated render failure → `finalPdfFileId` null + `pdfAttempts=1`; worker retry seals it (test + browser Retry button).
- [x] Integrity check (tampered snapshot hash) aborts the finalize tx (test).
- [x] Certificate page readable in the sealed PDF (`pdftotext` shows title/code/hash/statement).
- [x] No secrets committed; no dependency added outside section 3.3.
- [x] `PROGRESS.md` has a T-032 entry; the commit is on branch `t-032-finalization`.

### T-031 completion record (all steps done on `t-031-signing-page`)
1. `src/server/services/signing.ts` — token resolve, `getSigningContext`, `requestSigningOtp`, `verifySigningOtp`, `submitClientSignature`, `declineContract`, `assertSigningRateLimit` (+ 11 tests).
2. `src/lib/validation/signing.ts` — `clientSignInputSchema`, `otpCodeSchema`, `declineInputSchema`.
3. `src/server/actions/signing.ts` — public, rate-limited, Zod-validated actions.
4. `src/app/s/[token]/page.tsx` (RTL/LTR, sandboxed iframe, doc-language toggle, generic invalid page) + `src/app/s/[token]/pdf/route.ts` (unsigned PDF).
5. `src/components/forms/SigningExperience.tsx` (OTP gate, drawn/typed signature, consent, decline, confirmations).
6. `signing.*` i18n (en/ar); 9.5 security headers in `next.config.ts`.
7. `PROGRESS.md` T-031 entry + commit `T-031: public signing experience`.

### T-031 final verification checklist (all passed)
- [x] `npm run check` green (typecheck + lint + check:rtl + **398 tests, 47 files**).
- [x] `npm run build` green (`/s/[token]` + `/s/[token]/pdf` in the route list).
- [x] Public signing verified in a browser: OTP → typed signature → confirmation; DB shows the client signatory `signed`; unsigned PDF returns `%PDF-` with the right headers; invalid token → 404; used token → generic 200 page; `?lang=en` renders English.
- [x] No secrets committed; no dependency added outside section 3.3.
- [x] `PROGRESS.md` has a T-031 entry; the commit is on branch `t-031-signing-page`.

### T-030 completion record (all steps done on `t-030-email-worker`)
1. `"test_email"` added to `EMAIL_TEMPLATE_KEYS` (+ `isEmailTemplateKey` runtime guard) in `email.ts`.
2. `src/server/services/email-templates.ts` renderer (`contract_signing_link`, `contract_otp`, `test_email`) + 6 tests.
3. `src/server/services/email-worker.ts` (`createTransport`, race-safe `processOutbox`) + 7 tests.
4. `scripts/worker.ts` (outbox every 5 s, heartbeat every 60 s, graceful SIGTERM/SIGINT).
5. `sendTestEmailAction` + `TestEmailButton` + worker-status card + `settings.worker.*` i18n.
6. `PROGRESS.md` T-030 entry + commit `T-030: email service and worker skeleton`.

### T-030 final verification checklist (all passed)
- [x] `npm run check` green (typecheck + lint + check:rtl + **387 tests, 46 files**).
- [x] `npm run worker` starts, logs a heartbeat, and exits cleanly on SIGINT.
- [x] No secrets committed (`.env.local` is gitignored/untracked; no `.env*` added).
- [x] No dependency added outside section 3.3 (`nodemailer` was already listed in 3.3).
- [x] `PROGRESS.md` has a T-030 entry; the commit is on branch `t-030-email-worker`.
- [x] Reported to the user in English.

### Risks & rollback
- The worker runs a long-lived process: use `background_process` and **stop it** when done (it writes `worker_heartbeat` into the settings table of your `DATA_DIR`).
- `processOutbox` must stay race-safe: keep the conditional `UPDATE … WHERE status='pending'` and check the changed-row count.
- Never put the raw signing token in a log (`R13`); the logger redactor drops keys matching `/token|secret|password|otp|signature|authorization|cookie/i`, but do not rely on it for new field names — redact explicitly.
- Before risky edits: commit or `git stash`; you can always `git checkout -- <file>` to revert a tracked file.

---

## Quick command reference
```bash
# from /home/shadow-x7/Projects/Websites/Typescript/Next.js/Dossier
git status && git log --oneline -5      # confirm clean tree + current branch
npm run check                            # typecheck + lint + check:rtl + tests (must be green)
npx vitest run <path-to-test>            # run one test file
npm run build                            # production build (must be green); loads .env.local automatically
# tsx scripts do NOT load .env.local — export the env inline (example):
NODE_ENV=development APP_URL=http://localhost:3000 APP_SECRET=<64 hex> DATA_DIR=./data npm run db:migrate
NODE_ENV=development APP_URL=http://localhost:3000 APP_SECRET=<64 hex> DATA_DIR=./data npm run seed
npm run worker                           # T-030: starts the email worker (needs a migrated DATA_DIR)
```

## Known spec sections you will need soon
- **15.1** email templates + worker loop, **15.2** worker schedule, **15.3** files, **15.4** backups, **15.5** logging/health.
- **7.7** signing flow, **7.8** finalization/sealed PDF, **7.10** verification.
- **16.1** numeric test vectors (contracts/send/invoices/payments) and **16.2** e2e list.
- **Section 8** permissions matrix, **Section 9** security, **Section 13** pages/routes, **Section 20** QA checklists.
