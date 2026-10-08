# Dossier — Implementation Specification

| | |
|---|---|
| **Product** | Dossier — contracts & invoices platform (one "dossier" per project) |
| **Team** | RED SHADOWS \| RS — https://github.com/red-shadows-rs |
| **Spec version** | 1.0 (2026-10-08) |
| **Spec language** | English (the product UI and the generated documents are Arabic / English) |
| **Audience** | An implementing AI model (possibly a small/cheap one) + a human reviewer |
| **Sibling project** | `task-board` in the same GitHub org (Next.js + SQLite, bilingual AR/EN, roles, PDF reports). Dossier MUST feel like the same family: same stack, same conventions. |

---

## Table of contents

0. How to use this document (READ FIRST)
1. Product overview, scope, glossary
2. Decisions and assumptions
3. Tech stack and dependency policy
4. Repository layout, scripts, environment variables
5. Cross-cutting conventions (ids, money, dates, errors, transactions, UI)
6. Database schema (Drizzle code, triggers, indexes)
7. Business rules (numbering, calculations, lifecycles, signing, verification)
8. Roles and permissions
9. Security requirements
10. i18n, RTL, theme
11. Template engine, variables, seed templates (full AR/EN clause text)
12. PDF engine
13. Pages and routes
14. Services and server actions (exact contracts)
15. Email, worker, files, backups
16. Testing strategy (with exact numeric test vectors)
17. Deployment (Docker, Nginx)
18. Task cards (T-001 … T-043) — the implementation order
19. Phase 5 backlog (NOT in scope now)
20. QA checklists
21. Appendices (settings schemas, i18n key skeleton, glossary AR/EN, error codes, audit actions)
22. Known limitations

---

# 0. How to use this document (READ FIRST)

## 0.1 Purpose

This file is the single source of truth for building Dossier. It is written so that a model with limited reasoning ability can implement the system **task by task** without breaking existing code. Everything that could be ambiguous has been decided in advance. If something is NOT specified, do not guess — see 0.4.

## 0.2 Golden rules (violating any of these is a defect)

- **R1** Execute tasks in the order of section 18. Do not start a task before all its dependencies are done and `npm run check` is green.
- **R2** Do not add dependencies that are not listed in 3.3. If you believe one is needed, STOP and write it in `OPEN_QUESTIONS.md`.
- **R3** Do not change the version of any installed package. Never run `npm update`, `npm audit fix --force`, or `npx npm-check-updates`.
- **R4** TypeScript `strict: true`. No `any`, no `@ts-ignore`, no `@ts-expect-error` (except in tests with a comment), no non-null assertion `!` (except in tests). Use `unknown` + Zod to narrow.
- **R5** Schema changes only through drizzle-kit migrations. Never edit a migration that has already been committed. Never delete a migration. Never edit the SQLite file by hand.
- **R6** Money is **integer minor units** (e.g. halalas / cents / fils). Never use floating point for money. Use only the helpers in `src/lib/money.ts`.
- **R7** RTL safety: never use physical Tailwind utilities `ml-* mr-* pl-* pr-* left-* right-* text-left text-right border-l* border-r* rounded-l* rounded-r* space-x-*`. Use logical ones: `ms-* me-* ps-* pe-* start-* end-* text-start text-end border-s* border-e* rounded-s* rounded-e*` and `gap-*`. `npm run check:rtl` enforces this.
- **R8** Every user-visible string comes from i18n keys. `messages/en.json` and `messages/ar.json` are edited in the same commit and must have identical key sets (a test enforces it).
- **R9** Every page, server action and route handler that reads/writes data MUST call `requireUser()` (or the specific public-token verifier) first and then `assertCan(user, permission)`. Never rely on middleware/proxy for authorization.
- **R10** Validate every input with Zod **on the server**, even when the client already validated.
- **R11** No business logic in React components or in `page.tsx`/`route.ts` files. Business logic lives in `src/server/services/*`. Server actions are thin wrappers: authenticate → authorize → validate → call service → return `ActionResult`.
- **R12** better-sqlite3 transactions are **synchronous**. Never `await` inside a transaction callback. Never do PDF generation, email sending, file I/O or network calls inside a transaction.
- **R13** Never log secrets, tokens, passwords, OTP codes, or signature image data.
- **R14** Never use `dangerouslySetInnerHTML`. The only place generated HTML is shown in the UI is `<iframe sandbox="" srcDoc={html}>` (empty sandbox attribute = no scripts).
- **R15** Minimal diffs. Do not refactor, rename, reformat or "improve" code outside the current task. Do not touch files that the task card does not list unless strictly required (then say why in the commit message).
- **R16** Never delete or weaken a test to make it pass. If a test fails, fix the code. If you believe the test is wrong, write why in `OPEN_QUESTIONS.md` and stop.
- **R17** Never commit secrets, `.env*` (except `.env.example`), `data/`, `*.sqlite*`, generated PDFs, `node_modules`, `.next`.
- **R18** Immutability: signed contracts, `contract_versions`, `audit_log`, and signatory evidence are never updated or deleted by any code path (the DB triggers in 6.3 also enforce this).
- **R19** Date-only fields are `'YYYY-MM-DD'` strings; instants are integer milliseconds since epoch (UTC). Never do date-only arithmetic with `new Date('YYYY-MM-DD')` (timezone shifts). Use `src/lib/dates.ts`.
- **R20** Commit format: `T-0xx: short summary`. One task = one branch `t-0xx-slug`. Small, focused commits.
- **R21** Run `npm run check` before every commit (typecheck + lint + check:rtl + unit tests). Never commit with it red.
- **R22** No third-party scripts, CDNs, analytics, or remote fonts at runtime. Everything is self-hosted.
- **R23** Keep every source file under ~400 lines; split by responsibility.
- **R24** Named exports only, except where Next.js requires default exports (`page.tsx`, `layout.tsx`, `error.tsx`, `not-found.tsx`, `loading.tsx`, config files).
- **R25** Where this spec says **VERIFY**, you must check the installed package's real types/docs before coding, because APIs differ between versions. Do not rely on memory.
- **R26** Do not invent features. If a requirement is not here, it is out of scope (see 19).
- **R27** Authorization failures and validation failures must never leak internals (stack traces, SQL, file paths). Return the error codes in 21.4.
- **R28** All DB access goes through `src/db/index.ts`'s exported `db`. Never open a second connection in app code (scripts may open their own).

## 0.3 Workflow for every task

1. Read the task card in section 18 and every section it lists under **Read first**.
2. Create branch `t-0xx-slug`.
3. For pure logic (money, numbering, templating, calculations): write the unit tests first using the numeric vectors in section 16.
4. Implement exactly what the card lists. Nothing more.
5. Run `npm run check`. Fix until green.
6. Perform the card's **Manual verification** steps.
7. Append an entry to `PROGRESS.md`:
   ```
   ## T-0xx — <title> — <YYYY-MM-DD>
   - Done: <what>
   - Files: <list>
   - Tests: <list>
   - Deviations: <none | description>
   ```
8. Commit. Stop and report. Do not chain into the next task unless asked.

## 0.4 When something is unclear or conflicts

Do NOT guess. Append to `OPEN_QUESTIONS.md`:
```
## Q-<n> — <date> — T-0xx
- Question:
- What the spec says:
- Options considered:
- What I did meanwhile: <nothing | safest default>
```
Then stop and report. Safest default means: the most restrictive/immutable/secure behavior.

## 0.5 Kickoff prompt (copy-paste to the implementing model)

```
You are implementing "Dossier", a contracts & invoices platform, strictly following DOSSIER_PLAN.md.
Read section 0 completely, then sections 1-5. Do ONLY the task I name (e.g. "Do T-001").
Obey the golden rules R1-R28. Never add dependencies outside section 3.3. Never refactor
code outside the task. Write tests first for pure logic. Run `npm run check` before committing.
If anything is ambiguous, write it to OPEN_QUESTIONS.md and stop. After finishing, append to
PROGRESS.md, commit, and report briefly what you did and any deviations.
```

## 0.6 Notation

- **MUST / MUST NOT / SHOULD** follow RFC 2119 meaning.
- `src/...` paths are relative to the repo root `dossier/`.
- Code blocks are normative unless marked *example*.
- **VERIFY** = check the real API of the installed version before coding.
- "AR" = Arabic, "EN" = English.

---

# 1. Product overview, scope, glossary

## 1.1 What Dossier is

A self-hosted web platform for the RS team to create **contracts** and **invoices** for **projects**, and export them as **PDF in Arabic, English, or both side by side**. Every project has one **dossier** (the project page) gathering: client, contract(s), payment schedule, invoices, payments, attachments, activity.

Core chain: **Client → Project → Contract → Payment milestones → Invoices → Payments.**
A contract generates its payment schedule; each milestone generates an invoice with exactly the same numbers; payments close invoices.

## 1.2 Users

- **Team members** (internal): log in, manage everything allowed by role.
- **Clients** (external): NO accounts in this version. They receive private links to review/sign a contract and a verification page. (Client accounts are Phase 5.)

## 1.3 Core flows (must all work end to end)

1. Owner configures company profile, defaults, numbering, bank details, logo, stamp.
2. Member creates a client, then a project for that client.
3. Member creates a contract from a template for the project: fills parties, scope, pricing lines, discount, tax, dates, clauses, payment milestones; previews the PDF (AR / EN / bilingual); fixes validation issues.
4. Member sends the contract: provider signs in-app, a private signing link is emailed to the client.
5. Client opens the link, verifies by email OTP, reads the contract, signs (drawn or typed), or declines with a reason.
6. When all parties signed: the contract is frozen, a sealed PDF (with certificate page, QR, hash) is generated and emailed to both sides.
7. Member generates invoices from milestones (or standalone), issues them (number assigned), sends them, records payments; overdue invoices are flagged and reminders are sent.
8. Anyone holding a document can scan its QR / enter its code at the public verification page to check authenticity.

## 1.4 In scope (this spec)

Auth + roles; clients; projects; templates (+ editor); contracts (+ clauses, pricing lines, milestones, versions); e-signature with evidence; sealed PDFs; invoices + payments; dashboard; email notifications; worker; backups; audit log; settings; Docker/Nginx deployment; tests.

## 1.5 Out of scope (do NOT build)

Client accounts/portal; multi-tenant; online payments/gateways; accounting/ledger; certified e-invoicing (ZATCA/Fatoora, UAE FTA, ETA Egypt, etc.); PKI/qualified digital signatures; AI features; mobile apps; amendments/credit notes (Phase 5); Hijri dates; amount-in-words (Phase 5); multi-currency conversion; recurring invoices; WYSIWYG editors; real-time collaboration.

## 1.6 Glossary (AR / EN)

| EN | AR | Meaning |
|---|---|---|
| Dossier | الدوسيه | The project file gathering everything |
| Client | العميل | Party buying services |
| Provider | المزوّد / الطرف الأول | The RS team (company) |
| Project | المشروع | Unit of work for a client |
| Contract | العقد | Agreement for a project |
| Clause | البند / المادة | Numbered contract section |
| Milestone | الدفعة / مرحلة الدفع | Scheduled payment inside a contract |
| Invoice | الفاتورة | Payment request |
| Payment | الدفعة المستلمة | Money received against an invoice |
| Template | القالب | Reusable set of clauses |
| Signatory | الموقّع | Person signing for a party |
| Verification code | رمز التحقق | Public code printed on documents |
| Sealed PDF | النسخة الموقّعة المختومة | Final signed PDF with certificate |

---

# 2. Decisions and assumptions

## 2.1 Decided by the product owner

| ID | Decision |
|---|---|
| D-01 | Product name: **Dossier**. Repo name `dossier` under `red-shadows-rs`. Dev domain suggestion: `dossier.red-shadows-rs.com` (verify availability before launch). |
| D-02 | One unified website for contracts AND invoices, per project. |
| D-03 | PDFs in Arabic, English, or bilingual. |
| D-04 | Ability to add contract details (parties, scope, pricing lines, clauses, dates) and invoices. |
| D-05 | Stack aligned with `task-board`: Next.js + TypeScript + SQLite, self-hosted. |

## 2.2 Assumptions (defaults; all changeable in Settings — NEVER hardcode them in logic)

| ID | Assumption |
|---|---|
| A-01 | Internal-first: only team members have accounts; clients use private links. |
| A-02 | Defaults (editable in Settings): country `SA`, timezone `Asia/Riyadh`, currency `SAR`, VAT 15% (`1500` bp), payment terms 14 days, numbering prefix `DOS`. |
| A-03 | Invoices are commercial documents. They are NOT certified e-invoices. If the jurisdiction mandates certified e-invoicing, that is a separate integration project. The invoice PDF MUST NOT claim to be a certified tax invoice. |
| A-04 | E-signature = simple electronic signature with an evidence trail (timestamp, IP, user agent, email OTP, document hash). Not a qualified/PKI signature. Legal validity varies by country. Seed clause text is a **starter** that a lawyer must review. |
| A-05 | Single company (single tenant), single server instance, SQLite (WAL mode). |
| A-06 | Digits: Western (0-9) in UI and PDFs by default. |
| A-07 | Document language per contract/invoice: `ar`, `en`, or `bilingual`. UI language per user: `ar` or `en` (default `ar`). |

---

# 3. Tech stack and dependency policy

## 3.1 Alignment with task-board (do this BEFORE T-001)

Read `https://github.com/red-shadows-rs/task-board`: `package.json`, `next.config.*`, `tsconfig.json`, ESLint/Tailwind/PostCSS configs, `Dockerfile`, `.nvmrc`/engines, folder structure, UI components. **Mirror** the following exactly: Node version, `next`/`react`/`react-dom` versions, Tailwind major version and config style, ESLint setup, formatting (Prettier), component conventions. If task-board's versions differ from this spec, **task-board wins**; note it in `PROGRESS.md`.

If task-board is unavailable, use: Node 22 LTS, latest stable Next.js 15/16 (App Router), React 19, Tailwind CSS 4.

## 3.2 Runtime stack

| Concern | Choice |
|---|---|
| Framework | Next.js App Router, TypeScript strict |
| UI | React + Tailwind CSS (logical utilities only), small hand-written component set in `src/components/ui` (button, input, select, textarea, dialog, table, badge, toast, tabs, card) |
| i18n | `next-intl` **without locale routing** (locale from cookie `dossier_locale`); VERIFY the request-config API of the installed version |
| DB | SQLite via `better-sqlite3` + `drizzle-orm` + `drizzle-kit` (migrations) |
| Validation | `zod` |
| Forms | `react-hook-form` + `@hookform/resolvers` (complex forms only; simple forms use plain `<form action>` + server actions) |
| PDF | `playwright` (Chromium `page.pdf()`), HTML built by pure TS string functions |
| QR | `qrcode` (SVG string output) |
| Email | `nodemailer` (SMTP) |
| Password hashing | `@node-rs/argon2` (argon2id) |
| Signature drawing | `signature_pad` |
| Icons | `lucide-react` |
| Class utils | `clsx`, `tailwind-merge` |
| Tests | `vitest` (unit/integration, in-memory SQLite), `@playwright/test` (e2e) |
| Lint/format | ESLint (next config), Prettier |
| Scripts runner | `tsx` |

Next config: `serverExternalPackages: ['better-sqlite3', 'playwright', '@node-rs/argon2']` (VERIFY option name for installed Next version) and `output: 'standalone'`.

## 3.3 Allowed dependencies (exhaustive)

`dependencies`: next, react, react-dom, next-intl, drizzle-orm, better-sqlite3, zod, react-hook-form, @hookform/resolvers, playwright, qrcode, nodemailer, @node-rs/argon2, signature_pad, lucide-react, clsx, tailwind-merge.

`devDependencies`: typescript, @types/node, @types/react, @types/react-dom, @types/better-sqlite3, @types/qrcode, @types/nodemailer, drizzle-kit, vitest, @playwright/test, eslint, eslint-config-next, prettier, prettier-plugin-tailwindcss (only if task-board uses it), tailwindcss (+ its postcss plugin matching the major), tsx.

Anything else → STOP (R2). Notably: **no** moment/dayjs/date-fns (use `Intl`), **no** lodash, **no** axios (use `fetch`), **no** UI kits (MUI, Chakra…), **no** PDF libs other than Playwright, **no** ORMs other than Drizzle, **no** auth libs (custom sessions, see 9).

## 3.4 Forbidden at runtime

Remote fonts/CDNs, analytics, `eval`/`new Function`, dynamic `require` of user input, shelling out with user input, storing sessions in `localStorage`.

---

# 4. Repository layout, scripts, environment

## 4.1 Layout

```
dossier/
├─ .github/workflows/ci.yml           # runs `npm ci && npm run check`
├─ assets/fonts/                      # Cairo font file(s) (see 12.3)
├─ data/                              # GITIGNORED: dossier.sqlite, files/, backups/
├─ drizzle/                           # generated migrations (committed) incl. custom trigger SQL
├─ messages/{en,ar}.json
├─ nginx/dossier.conf
├─ scripts/
│  ├─ check-rtl.sh
│  ├─ create-user.ts
│  ├─ seed.ts                         # seeds system templates + default settings
│  └─ worker.ts                       # background worker entry
├─ src/
│  ├─ app/                            # see section 13
│  ├─ components/{ui,forms,layout,documents}/
│  ├─ db/{index.ts,schema.ts,migrate.ts}
│  ├─ lib/
│  │  ├─ env.ts ids.ts crypto.ts money.ts dates.ts errors.ts result.ts
│  │  ├─ canonical-json.ts permissions.ts constants.ts i18n.ts
│  │  └─ validation/*.ts              # Zod schemas shared by client+server
│  └─ server/
│     ├─ auth/{session.ts,password.ts,rate-limit.ts,require-user.ts}
│     ├─ services/{audit,clients,projects,templates,contracts,contract-calc,milestones,signing,invoices,payments,settings,files,numbering,email,dashboard,users,verification}.ts
│     ├─ actions/{auth,clients,projects,templates,contracts,signing,invoices,payments,settings,users}.ts
│     ├─ pdf/{browser.ts,fonts.ts,render.ts,qr.ts,html/{shared.ts,contract.ts,invoice.ts,certificate.ts}}
│     └─ templating/{variables.ts,render-body.ts,seed-templates.ts}
├─ tests/e2e/
├─ Dockerfile  docker-compose.yml  .env.example  .gitignore  .dockerignore
├─ drizzle.config.ts  next.config.ts  vitest.config.ts  tsconfig.json  eslint.config.mjs
└─ PROGRESS.md  OPEN_QUESTIONS.md  README.md
```
Unit tests are colocated: `foo.ts` → `foo.test.ts`.

## 4.2 npm scripts (exact names)

| Script | Command |
|---|---|
| `dev` | `next dev` |
| `build` | `next build` |
| `start` | `node .next/standalone/server.js` (or `next start` if not standalone — mirror task-board) |
| `typecheck` | `tsc --noEmit` |
| `lint` | `next lint` or `eslint .` (mirror task-board) |
| `check:rtl` | `bash scripts/check-rtl.sh` |
| `test` | `vitest run` |
| `test:e2e` | `playwright test` |
| `check` | `npm run typecheck && npm run lint && npm run check:rtl && npm run test` |
| `db:generate` | `drizzle-kit generate` |
| `db:migrate` | `tsx src/db/migrate.ts` |
| `seed` | `tsx scripts/seed.ts` |
| `user:create` | `tsx scripts/create-user.ts` |
| `worker` | `tsx scripts/worker.ts` |

`scripts/check-rtl.sh` greps `src/` for banned class tokens (R7) and exits 1 on any match. Use word-boundary-aware patterns, e.g. `grep -rEn '(^|[ "'"'"'`])(ml|mr|pl|pr|left|right)-[0-9a-z\[]' src --include=*.tsx`, plus `text-left|text-right|border-l|border-r|rounded-l|rounded-r|space-x-`. Allow-list nothing; if a false positive appears, rename the offending identifier instead.

## 4.3 Environment variables

All read ONLY in `src/lib/env.ts` through a Zod schema; the app crashes at boot with a clear message if invalid. Never read `process.env` elsewhere.

| Var | Required | Default | Notes |
|---|---|---|---|
| `NODE_ENV` | yes | — | `development` / `production` / `test` |
| `PORT` | no | `3000` | |
| `APP_URL` | yes | — | Public base URL, no trailing slash. Used in emails and QR codes. |
| `APP_SECRET` | yes | — | ≥ 32 random bytes hex. Used for HMAC of tokens. Rotating it invalidates all sessions and pending signing links. |
| `DATA_DIR` | no | `./data` | Holds `dossier.sqlite`, `files/`, `backups/` |
| `DATABASE_PATH` | no | `${DATA_DIR}/dossier.sqlite` | |
| `DEFAULT_LOCALE` | no | `ar` | `ar` or `en` |
| `SMTP_HOST` `SMTP_PORT` `SMTP_SECURE` `SMTP_USER` `SMTP_PASS` | prod | — | `SMTP_SECURE` = `true` for port 465 |
| `SMTP_FROM` | prod | — | e.g. `Dossier <no-reply@example.com>` |
| `BOOTSTRAP_OWNER_EMAIL` `BOOTSTRAP_OWNER_PASSWORD` `BOOTSTRAP_OWNER_NAME` | first run | — | Used by `seed` only if there are zero users. Password ≥ 12 chars. |
| `PDF_TIMEOUT_MS` | no | `30000` | |
| `PDF_CONCURRENCY` | no | `2` | |
| `BACKUP_RETENTION_DAYS` | no | `30` | |
| `TASKBOARD_API_URL` `TASKBOARD_API_TOKEN` | no | — | Phase 4 optional integration |
| `TZ` | no | `UTC` | Process timezone stays UTC. Business timezone lives in Settings. |

`.env.example` lists every var with safe placeholder values and comments. `.gitignore` includes `.env`, `.env.*` (except `.env.example`), `data/`, `*.sqlite*`, `.next/`, `node_modules/`, `tmp/`, `playwright-report/`, `test-results/`.

---
# 5. Cross-cutting conventions

## 5.1 Identifiers, tokens, codes (`src/lib/ids.ts`, `src/lib/crypto.ts`)

```ts
import { randomBytes, createHmac, createHash, timingSafeEqual } from 'node:crypto';

export const newId = (): string => randomBytes(12).toString('base64url');      // 16 chars, primary keys
export const newToken = (): string => randomBytes(32).toString('base64url');   // 43 chars, session & signing tokens

export const hmacToken = (token: string, secret: string): string =>
  createHmac('sha256', secret).update(token).digest('hex');                    // what we STORE; never store raw tokens

export const sha256Hex = (data: string | Buffer): string =>
  createHash('sha256').update(data).digest('hex');

export const safeEqualHex = (a: string, b: string): boolean => {
  const ba = Buffer.from(a, 'hex'); const bb = Buffer.from(b, 'hex');
  return ba.length === bb.length && timingSafeEqual(ba, bb);
};
```

**Verification code**: 12 characters from the Crockford Base32 alphabet `0123456789ABCDEFGHJKMNPQRSTVWXYZ` (no I, L, O, U), generated from `crypto.randomInt(0, 32)` per character. Stored uppercase without dashes. Displayed grouped `XXXX-XXXX-XXXX`. Lookup normalization: uppercase → remove spaces and dashes → map `O→0`, `I→1`, `L→1`. Must be unique (retry up to 5 times on unique violation).

**Email OTP**: 6 digits from `crypto.randomInt(0, 1_000_000)` zero-padded; stored as `hmacToken(otp + ':' + signatoryId, APP_SECRET)`.

## 5.2 Money (`src/lib/money.ts`)

- Type: `type Minor = number` — a non-negative safe integer.
- Constant `MAX_MINOR = 10_000_000_000` (enforced everywhere amounts enter the system; keeps `a * b` below 2^53 for `b ≤ 10_000`).
- Supported currencies and decimal exponents (single source of truth, `src/lib/constants.ts`):

```ts
export const CURRENCIES = {
  SAR: 2, AED: 2, QAR: 2, EGP: 2, USD: 2, EUR: 2, GBP: 2,
  KWD: 3, BHD: 3, OMR: 3, JOD: 3,
} as const;
export type CurrencyCode = keyof typeof CURRENCIES;
```

Required functions (all pure, all unit-tested with vectors from 16.1):

| Function | Behavior |
|---|---|
| `normalizeDigits(s)` | Converts Arabic-Indic `٠-٩`, Persian `۰-۹`, Arabic decimal sep `٫` → `.`, Arabic thousands sep `٬` → `,` to Western equivalents. |
| `parseMajorToMinor(input, currency)` | Strict parse of a user-typed decimal string. Strips `,` and spaces. Accepts `^\d+(\.\d{1,E})?$` where `E` is the currency exponent. Rejects negatives, exponents, more decimals than allowed, empty. Returns integer minor. Throws `AppError('VALIDATION_FAILED')`. Never uses `parseFloat`. |
| `formatMinor(minor, currency, locale)` | `Intl.NumberFormat('en-US', {minimumFractionDigits:E, maximumFractionDigits:E})` on `minor / 10**E`… **but** to avoid float artefacts, build the string with integer math: `intPart = Math.floor(minor / 10**E)`, `frac = minor % 10**E` padded to `E` digits, then group `intPart` with commas via `Intl.NumberFormat('en-US').format(intPart)`. Returns e.g. `1,234.50` (no currency code). |
| `formatMoney(minor, currency, locale)` | `formatMinor(...) + ' ' + currency` e.g. `1,234.50 SAR`. Same output for `ar` and `en` (Western digits). |
| `mulDivRound(a, b, d)` | Half-up rounding of `a*b/d` for non-negative integers: `Math.floor((a * b + Math.floor(d / 2)) / d)`. Throws if `!Number.isSafeInteger(a*b)` or `d <= 0`. |
| `percentOfBp(minor, bp)` | `mulDivRound(minor, bp, 10_000)`. |
| `allocateProportional(total, weights)` | Splits `total` proportionally to non-negative integer `weights` using **cumulative rounding** (guarantees every part ≥ 0 and the parts sum exactly to `total`). Let `cumW_i = w_0+…+w_i` and `S = Σw`. `cumAlloc_i = (i == last) ? total : mulDivRound(total, cumW_i, S)`; `part_i = cumAlloc_i - cumAlloc_(i-1)` with `cumAlloc_(-1)=0`. If `S == 0` returns all zeros. |
| `allocateByBp(total, bps)` | `bps` must sum to exactly `10_000` (else throws) then returns `allocateProportional(total, bps)`. |

Rate and percent values are stored as **basis points** (`1500` = 15.00 %). UI shows percent with up to 2 decimals and converts with `Math.round(percent * 100)` after strict string parsing (no float ambiguity: parse as `parseMajorToMinor(input,'USD')` semantics, i.e. 2 decimals ⇒ bp).

## 5.3 Dates and time (`src/lib/dates.ts`)

- Instants: `integer` ms UTC (`Date.now()`); helper `nowMs()` (mockable in tests).
- Date-only: `'YYYY-MM-DD'` strings, validated by regex **and** by round-tripping through `Date.UTC`.
- Business timezone: Settings `defaults.timezone` (IANA). Helpers:
  - `todayInTz(tz): string` → `new Intl.DateTimeFormat('en-CA', {timeZone: tz, year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date(nowMs()))` (`en-CA` yields `YYYY-MM-DD`).
  - `addDays(dateStr, n): string` using `Date.UTC(y, m-1, d + n)` then formatting from UTC fields.
  - `isValidDateStr`, `compareDateStr(a,b)` (plain string compare is valid for ISO dates), `daysBetween(a,b)`.
  - `formatDateLong(dateStr, lang)`:
    - `en`: `new Intl.DateTimeFormat('en-GB', {day:'numeric', month:'long', year:'numeric', timeZone:'UTC'})` → `7 October 2026`.
    - `ar`: `new Intl.DateTimeFormat('ar-SA-u-ca-gregory-nu-latn', {day:'numeric', month:'long', year:'numeric', timeZone:'UTC'})` → `7 أكتوبر 2026`.
    - Both build the `Date` with `new Date(Date.UTC(y, m-1, d))`.
  - `formatInstant(ms, tz, lang)` → date + `HH:mm` in business timezone, plus ` UTC` variant for certificates.
- The Node process runs with `TZ=UTC`; never rely on the server's local timezone.

## 5.4 Errors and results (`src/lib/errors.ts`, `src/lib/result.ts`)

```ts
export class AppError extends Error {
  constructor(
    public code: ErrorCode,                       // see 21.4
    message: string,                              // SAFE to show to users (generic)
    public fieldErrors?: Record<string, string>,  // field -> i18n key
    public cause?: unknown,
  ) { super(message); }
}

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: ErrorCode; message: string; fieldErrors?: Record<string, string> } };
```

Rules:
- Services throw `AppError`. Server actions catch **everything** and return `ActionResult`; unknown errors become `{code:'INTERNAL'}` and are logged (without secrets).
- `fieldErrors` values are **i18n keys** (e.g. `errors.required`), never raw English.
- UI shows error toasts using `t('errors.' + code)`.

## 5.5 Transactions and concurrency

```ts
// src/db/index.ts exports: db (drizzle instance), sqlite (raw better-sqlite3), withTx
export function withTx<T>(fn: (tx: DbTx) => T): T { return db.transaction((tx) => fn(tx)); }
```
- The callback is **synchronous**. All reads/writes inside use `tx`.
- Open the DB with pragmas: `journal_mode = WAL`, `foreign_keys = ON`, `busy_timeout = 5000`, `synchronous = NORMAL`.
- Number allocation and status transitions MUST happen inside a single `withTx` together with the row update they belong to.
- Every status transition re-reads the row **inside** the transaction and checks the allowed-from state (optimistic safety).

## 5.6 Naming

- Tables: `snake_case` plural. Columns: `snake_case`. Drizzle property names `camelCase` mapped explicitly (`text('client_id')`).
- Files: `kebab-case.ts`; React components `PascalCase.tsx`; hooks `useXxx`.
- i18n keys: dotted lowerCamel, grouped by area: `contracts.status.signed`, `common.save`, `errors.NOT_FOUND`.
- Server actions: verbs `createClient`, `updateClient`, `archiveClient`.
- Constants: `UPPER_SNAKE`. Enums are `as const` arrays in `src/lib/constants.ts`, imported by schema, validation and UI.

## 5.7 Lists, search, pagination

- Query params: `?q=<text>&status=<enum>&page=<n>&sort=<field>&dir=asc|desc`.
- Page size fixed at 20. Offset pagination (`LIMIT 20 OFFSET (page-1)*20`) plus a `COUNT(*)`.
- Search uses `LIKE ? ESCAPE '\'` with `%` and `_` and `\` escaped in the user input; lowercase compare via `lower()`.
- Sort fields are whitelisted per list; unknown values fall back to the default sort.

## 5.8 UI conventions

- App shell: sidebar (start side) + top bar (locale switch, theme switch, user menu). Content max width 1280px.
- Every list page: title, primary action button, filters row, table, pagination, empty state (icon + message + CTA), loading skeleton (`loading.tsx`).
- Every form: labels above inputs, inline field errors, submit button shows pending state and is disabled while pending, success toast + redirect.
- Destructive actions use a confirm dialog with explicit consequence text.
- Status badges: draft=gray, sent=blue, signed=green, declined=red, expired=amber, completed=teal, terminated=red, cancelled=gray; invoice: draft=gray, issued=blue, partially_paid=amber, paid=green, void=gray-strikethrough, overdue(derived)=red.
- Numbers/IDs/emails/URLs inside RTL text are wrapped in `<bdi>` or have `dir="ltr"`.
- Accessibility: all inputs have labels, dialogs trap focus, icon-only buttons have `aria-label`.
- Theme tokens (CSS variables, dark default, light optional): background `#0B0B0F`, surface `#14141A`, border `#26262E`, text `#EDEDF0`, muted `#9A9AA6`, primary (red) `#E11D48`, danger `#EF4444`, success `#22C55E`, warning `#F59E0B`, info `#3B82F6`. Light theme: background `#FFFFFF`, surface `#F6F6F8`, border `#E4E4E9`, text `#16161A`, muted `#6B6B76`, same accents.

---

# 6. Database schema

## 6.1 Constants (`src/lib/constants.ts`)

```ts
export const ROLES = ['owner', 'member', 'viewer'] as const;
export const LOCALES = ['ar', 'en'] as const;
export const LANG_MODES = ['ar', 'en', 'bilingual'] as const;
export const CLIENT_TYPES = ['company', 'individual'] as const;
export const PROJECT_STATUSES = ['lead', 'active', 'on_hold', 'completed', 'cancelled'] as const;
export const TEMPLATE_TYPES = ['contract', 'nda', 'other'] as const;
export const CONTRACT_STATUSES = ['draft', 'sent', 'declined', 'expired', 'signed', 'completed', 'terminated', 'cancelled'] as const;
export const INVOICE_STATUSES = ['draft', 'issued', 'partially_paid', 'paid', 'void'] as const;
export const DISCOUNT_TYPES = ['none', 'percent', 'fixed'] as const;
export const MILESTONE_MODES = ['percent', 'fixed'] as const;
export const PAYMENT_METHODS = ['bank_transfer', 'cash', 'card', 'cheque', 'other'] as const;
export const SIGNATORY_ROLES = ['provider', 'client'] as const;
export const SIGNATORY_STATUSES = ['pending', 'signed', 'declined'] as const;
export const SIGNATURE_METHODS = ['drawn', 'typed'] as const;
export const FILE_KINDS = ['logo', 'stamp', 'signature', 'contract_pdf', 'attachment'] as const;
export const EMAIL_STATUSES = ['pending', 'sending', 'sent', 'failed'] as const;
export const SEQ_KEYS = ['contract', 'invoice', 'project'] as const;
```

## 6.2 Drizzle schema (`src/db/schema.ts`) — normative

> **VERIFY**: In recent drizzle-orm the third argument of `sqliteTable` returns an **array** of indexes/constraints; older versions expect an **object**. Use whatever the installed version expects. Also VERIFY the `check()` and partial-index `.where()` helpers exist; if not, put those in the custom SQL migration (6.3) instead.

```ts
import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import * as C from '@/lib/constants';

const pk = () => text('id').primaryKey();
const createdAt = () => integer('created_at').notNull();
const updatedAt = () => integer('updated_at').notNull();
const bool = (name: string) => integer(name, { mode: 'boolean' }).notNull().default(false);
const money = (name: string) => integer(name).notNull().default(0);

// ───────── identity ─────────
export const users = sqliteTable('users', {
  id: pk(),
  email: text('email').notNull(),                       // stored lowercase, trimmed
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role', { enum: C.ROLES }).notNull().default('member'),
  status: text('status', { enum: ['active', 'disabled'] }).notNull().default('active'),
  locale: text('locale', { enum: C.LOCALES }).notNull().default('ar'),
  canSignForCompany: bool('can_sign_for_company'),      // may sign as provider
  signerTitleAr: text('signer_title_ar'),
  signerTitleEn: text('signer_title_en'),
  lastLoginAt: integer('last_login_at'),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [uniqueIndex('users_email_uq').on(t.email)]);

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),                          // = hmacToken(rawToken)
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: createdAt(),
  expiresAt: integer('expires_at').notNull(),
  lastSeenAt: integer('last_seen_at').notNull(),
  ip: text('ip'), userAgent: text('user_agent'),
}, (t) => [index('sessions_user_idx').on(t.userId), index('sessions_exp_idx').on(t.expiresAt)]);

// key/value JSON settings, validated by Zod schemas in src/lib/validation/settings.ts (see 21.1)
export const settings = sqliteTable('settings', {
  key: text('key').primaryKey(),                        // 'company' | 'defaults' | 'numbering' | 'signing' | 'email'
  valueJson: text('value_json').notNull(),
  updatedAt: updatedAt(),
  updatedBy: text('updated_by').references(() => users.id, { onDelete: 'set null' }),
});

export const files = sqliteTable('files', {
  id: pk(),
  kind: text('kind', { enum: C.FILE_KINDS }).notNull(),
  mime: text('mime').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  sha256: text('sha256').notNull(),
  storagePath: text('storage_path').notNull(),          // relative to DATA_DIR/files, e.g. '2026/10/<id>'
  originalName: text('original_name'),                  // display only, sanitized, never used as a path
  ownerType: text('owner_type'),                        // 'project' | 'contract' | 'setting' | ...
  ownerId: text('owner_id'),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
}, (t) => [index('files_owner_idx').on(t.ownerType, t.ownerId)]);

export const auditLog = sqliteTable('audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ts: integer('ts').notNull(),
  actorType: text('actor_type', { enum: ['user', 'signer', 'system'] }).notNull(),
  actorId: text('actor_id'),
  action: text('action').notNull(),                     // see 21.5
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  ip: text('ip'), userAgent: text('user_agent'),
  metaJson: text('meta_json'),                          // small JSON, NO secrets
}, (t) => [index('audit_entity_idx').on(t.entityType, t.entityId), index('audit_ts_idx').on(t.ts)]);

export const numberSequences = sqliteTable('number_sequences', {
  seqKey: text('seq_key', { enum: C.SEQ_KEYS }).notNull(),
  year: integer('year').notNull(),                      // 0 for non-yearly sequences (project)
  lastValue: integer('last_value').notNull().default(0),
}, (t) => [uniqueIndex('number_sequences_uq').on(t.seqKey, t.year)]);

// ───────── parties & projects ─────────
export const clients = sqliteTable('clients', {
  id: pk(),
  type: text('type', { enum: C.CLIENT_TYPES }).notNull().default('company'),
  nameAr: text('name_ar'), nameEn: text('name_en'),               // at least one required (service + CHECK)
  legalNameAr: text('legal_name_ar'), legalNameEn: text('legal_name_en'),
  email: text('email'), phone: text('phone'),
  country: text('country'),                                       // ISO 3166-1 alpha-2
  city: text('city'),
  addressAr: text('address_ar'), addressEn: text('address_en'),
  taxNumber: text('tax_number'), crNumber: text('cr_number'),     // VAT no. / commercial registration
  repNameAr: text('rep_name_ar'), repNameEn: text('rep_name_en'), // legal representative
  repTitleAr: text('rep_title_ar'), repTitleEn: text('rep_title_en'),
  preferredLanguage: text('preferred_language', { enum: C.LOCALES }).notNull().default('ar'),
  notes: text('notes'),
  archivedAt: integer('archived_at'),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [index('clients_archived_idx').on(t.archivedAt)]);

export const projects = sqliteTable('projects', {
  id: pk(),
  code: text('code').notNull(),                                   // 'P-0001', from sequence 'project'
  clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'restrict' }),
  nameAr: text('name_ar'), nameEn: text('name_en'),               // at least one required
  description: text('description'),
  status: text('status', { enum: C.PROJECT_STATUSES }).notNull().default('lead'),
  startDate: text('start_date'), endDate: text('end_date'),       // 'YYYY-MM-DD'
  budgetMinor: integer('budget_minor'),                           // optional
  currency: text('currency').notNull(),
  taskboardRef: text('taskboard_ref'),                            // Phase 4 optional link to task-board
  notes: text('notes'),
  archivedAt: integer('archived_at'),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [uniqueIndex('projects_code_uq').on(t.code), index('projects_client_idx').on(t.clientId), index('projects_status_idx').on(t.status)]);

// ───────── templates ─────────
export const templates = sqliteTable('templates', {
  id: pk(),
  type: text('type', { enum: C.TEMPLATE_TYPES }).notNull().default('contract'),
  key: text('key'),                                               // stable key for system templates, e.g. 'web-development'
  nameAr: text('name_ar').notNull(), nameEn: text('name_en').notNull(),
  descriptionAr: text('description_ar'), descriptionEn: text('description_en'),
  defaultLanguageMode: text('default_language_mode', { enum: C.LANG_MODES }).notNull().default('bilingual'),
  defaultsJson: text('defaults_json').notNull().default('{}'),    // validated by templateDefaultsSchema (11.6)
  isSystem: bool('is_system'),
  archivedAt: integer('archived_at'),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [uniqueIndex('templates_key_uq').on(t.key)]);

export const templateClauses = sqliteTable('template_clauses', {
  id: pk(),
  templateId: text('template_id').notNull().references(() => templates.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),                        // 1-based, contiguous
  key: text('key'),                                               // e.g. 'scope', 'confidentiality'
  titleAr: text('title_ar').notNull(), titleEn: text('title_en').notNull(),
  bodyAr: text('body_ar').notNull(), bodyEn: text('body_en').notNull(),
}, (t) => [uniqueIndex('template_clauses_pos_uq').on(t.templateId, t.position)]);

// ───────── contracts ─────────
export const contracts = sqliteTable('contracts', {
  id: pk(),
  number: text('number'),                                         // assigned at first send; NULL while never sent
  kind: text('kind', { enum: ['contract', 'amendment'] }).notNull().default('contract'), // only 'contract' used now
  parentContractId: text('parent_contract_id'),                   // reserved for amendments (Phase 5)
  clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'restrict' }),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'restrict' }),
  templateId: text('template_id').references(() => templates.id, { onDelete: 'set null' }),
  status: text('status', { enum: C.CONTRACT_STATUSES }).notNull().default('draft'),
  languageMode: text('language_mode', { enum: C.LANG_MODES }).notNull().default('bilingual'),
  hasFees: integer('has_fees', { mode: 'boolean' }).notNull().default(true),   // false for NDAs: no items, no milestones, no totals
  titleAr: text('title_ar'), titleEn: text('title_en'),
  scopeAr: text('scope_ar'), scopeEn: text('scope_en'),           // free text used by {{contract.scope}}
  currency: text('currency').notNull(),
  discountType: text('discount_type', { enum: C.DISCOUNT_TYPES }).notNull().default('none'),
  discountValue: integer('discount_value').notNull().default(0),  // bp if percent, minor if fixed
  subtotalMinor: money('subtotal_minor'), discountMinor: money('discount_minor'),
  netMinor: money('net_minor'), taxRateBp: integer('tax_rate_bp').notNull().default(0),
  taxMinor: money('tax_minor'), totalMinor: money('total_minor'),
  milestoneMode: text('milestone_mode', { enum: C.MILESTONE_MODES }).notNull().default('percent'),
  startDate: text('start_date'), endDate: text('end_date'),
  paymentTermsDays: integer('payment_terms_days').notNull().default(14),
  governingLawAr: text('governing_law_ar'), governingLawEn: text('governing_law_en'),
  jurisdictionAr: text('jurisdiction_ar'), jurisdictionEn: text('jurisdiction_en'),
  signingDeadline: text('signing_deadline'),                      // 'YYYY-MM-DD' or NULL
  internalNotes: text('internal_notes'),
  versionNo: integer('version_no').notNull().default(1),
  currentVersionId: text('current_version_id'),                   // no FK (avoids circular FK)
  verificationCode: text('verification_code'),
  contentHash: text('content_hash'),                              // sha256 of canonical snapshot (7.6)
  finalPdfFileId: text('final_pdf_file_id').references(() => files.id, { onDelete: 'set null' }),
  pdfSha256: text('pdf_sha256'),
  pdfAttempts: integer('pdf_attempts').notNull().default(0),
  sentAt: integer('sent_at'), signedAt: integer('signed_at'), completedAt: integer('completed_at'),
  terminatedAt: integer('terminated_at'), terminationReason: text('termination_reason'),
  cancelledAt: integer('cancelled_at'),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [
  uniqueIndex('contracts_number_uq').on(t.number),
  uniqueIndex('contracts_vcode_uq').on(t.verificationCode),
  index('contracts_project_idx').on(t.projectId), index('contracts_client_idx').on(t.clientId), index('contracts_status_idx').on(t.status),
]);

export const contractItems = sqliteTable('contract_items', {        // pricing lines
  id: pk(),
  contractId: text('contract_id').notNull().references(() => contracts.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  descriptionAr: text('description_ar'), descriptionEn: text('description_en'),
  qtyMilli: integer('qty_milli').notNull().default(1000),          // quantity ×1000 (1.5 → 1500)
  unitPriceMinor: integer('unit_price_minor').notNull(),
  lineTotalMinor: integer('line_total_minor').notNull(),           // = mulDivRound(unit, qtyMilli, 1000)
}, (t) => [uniqueIndex('contract_items_pos_uq').on(t.contractId, t.position)]);

export const contractClauses = sqliteTable('contract_clauses', {
  id: pk(),
  contractId: text('contract_id').notNull().references(() => contracts.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  key: text('key'),
  titleAr: text('title_ar').notNull(), titleEn: text('title_en').notNull(),
  bodyAr: text('body_ar').notNull(), bodyEn: text('body_en').notNull(),
}, (t) => [uniqueIndex('contract_clauses_pos_uq').on(t.contractId, t.position)]);

export const paymentMilestones = sqliteTable('payment_milestones', {
  id: pk(),
  contractId: text('contract_id').notNull().references(() => contracts.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  titleAr: text('title_ar').notNull(), titleEn: text('title_en').notNull(),
  percentBp: integer('percent_bp'),                                // set when milestoneMode = 'percent'
  amountMinor: integer('amount_minor').notNull(),                  // net (pre-tax) amount
  taxMinor: integer('tax_minor').notNull().default(0),
  totalMinor: integer('total_minor').notNull(),                    // amount + tax
  dueDate: text('due_date'),                                       // optional fixed date
  triggerNoteAr: text('trigger_note_ar'), triggerNoteEn: text('trigger_note_en'), // e.g. "upon signing"
}, (t) => [uniqueIndex('milestones_pos_uq').on(t.contractId, t.position)]);

export const contractVersions = sqliteTable('contract_versions', {
  id: pk(),
  contractId: text('contract_id').notNull().references(() => contracts.id, { onDelete: 'cascade' }),
  versionNo: integer('version_no').notNull(),
  snapshotJson: text('snapshot_json').notNull(),                   // canonical JSON (7.6)
  contentHash: text('content_hash').notNull(),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
}, (t) => [uniqueIndex('contract_versions_uq').on(t.contractId, t.versionNo)]);

export const contractSignatories = sqliteTable('contract_signatories', {
  id: pk(),
  contractId: text('contract_id').notNull().references(() => contracts.id, { onDelete: 'cascade' }),
  versionId: text('version_id').notNull().references(() => contractVersions.id, { onDelete: 'restrict' }),
  role: text('role', { enum: C.SIGNATORY_ROLES }).notNull(),
  name: text('name').notNull(), title: text('title'), email: text('email'),
  signerUserId: text('signer_user_id').references(() => users.id, { onDelete: 'set null' }), // provider side
  sortOrder: integer('sort_order').notNull().default(0),
  status: text('status', { enum: C.SIGNATORY_STATUSES }).notNull().default('pending'),
  tokenHash: text('token_hash'), tokenExpiresAt: integer('token_expires_at'),               // client link
  otpHash: text('otp_hash'), otpExpiresAt: integer('otp_expires_at'),
  otpAttempts: integer('otp_attempts').notNull().default(0), otpVerifiedAt: integer('otp_verified_at'),
  viewedAt: integer('viewed_at'),
  signedAt: integer('signed_at'),
  signatureMethod: text('signature_method', { enum: C.SIGNATURE_METHODS }),
  signatureFileId: text('signature_file_id').references(() => files.id, { onDelete: 'set null' }),
  typedName: text('typed_name'),
  consentTextHash: text('consent_text_hash'),
  declinedAt: integer('declined_at'), declineReason: text('decline_reason'),
  ip: text('ip'), userAgent: text('user_agent'),
  createdAt: createdAt(),
}, (t) => [index('signatories_contract_idx').on(t.contractId), uniqueIndex('signatories_token_uq').on(t.tokenHash)]);

// ───────── invoices & payments ─────────
export const invoices = sqliteTable('invoices', {
  id: pk(),
  number: text('number'),                                          // assigned at ISSUE; NULL for drafts
  verificationCode: text('verification_code'),                     // assigned at ISSUE
  clientId: text('client_id').notNull().references(() => clients.id, { onDelete: 'restrict' }),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'restrict' }),
  contractId: text('contract_id').references(() => contracts.id, { onDelete: 'restrict' }),   // optional
  milestoneId: text('milestone_id').references(() => paymentMilestones.id, { onDelete: 'restrict' }),
  status: text('status', { enum: C.INVOICE_STATUSES }).notNull().default('draft'),
  languageMode: text('language_mode', { enum: C.LANG_MODES }).notNull().default('bilingual'),
  currency: text('currency').notNull(),
  issueDate: text('issue_date'), dueDate: text('due_date'),
  discountType: text('discount_type', { enum: C.DISCOUNT_TYPES }).notNull().default('none'),
  discountValue: integer('discount_value').notNull().default(0),
  subtotalMinor: money('subtotal_minor'), discountMinor: money('discount_minor'),
  netMinor: money('net_minor'), taxRateBp: integer('tax_rate_bp').notNull().default(0),
  taxMinor: money('tax_minor'), totalMinor: money('total_minor'),
  paidMinor: money('paid_minor'),                                  // cached sum of non-voided payments
  notesAr: text('notes_ar'), notesEn: text('notes_en'),
  paymentInstructionsAr: text('payment_instructions_ar'), paymentInstructionsEn: text('payment_instructions_en'),
  sellerSnapshotJson: text('seller_snapshot_json'),                // frozen at issue
  buyerSnapshotJson: text('buyer_snapshot_json'),                  // frozen at issue
  issuedAt: integer('issued_at'), paidAt: integer('paid_at'),
  voidedAt: integer('voided_at'), voidReason: text('void_reason'),
  lastReminderAt: integer('last_reminder_at'),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(), updatedAt: updatedAt(),
}, (t) => [
  uniqueIndex('invoices_number_uq').on(t.number),
  uniqueIndex('invoices_vcode_uq').on(t.verificationCode),
  // one ACTIVE invoice per milestone (voiding frees the milestone):
  uniqueIndex('invoices_milestone_active_uq').on(t.milestoneId).where(sql`milestone_id IS NOT NULL AND status <> 'void'`),
  index('invoices_project_idx').on(t.projectId), index('invoices_client_idx').on(t.clientId),
  index('invoices_contract_idx').on(t.contractId), index('invoices_status_idx').on(t.status), index('invoices_due_idx').on(t.dueDate),
]);

export const invoiceLines = sqliteTable('invoice_lines', {
  id: pk(),
  invoiceId: text('invoice_id').notNull().references(() => invoices.id, { onDelete: 'cascade' }),
  position: integer('position').notNull(),
  descriptionAr: text('description_ar'), descriptionEn: text('description_en'),
  qtyMilli: integer('qty_milli').notNull().default(1000),
  unitPriceMinor: integer('unit_price_minor').notNull(),
  lineTotalMinor: integer('line_total_minor').notNull(),
}, (t) => [uniqueIndex('invoice_lines_pos_uq').on(t.invoiceId, t.position)]);

export const payments = sqliteTable('payments', {
  id: pk(),
  invoiceId: text('invoice_id').notNull().references(() => invoices.id, { onDelete: 'restrict' }),
  amountMinor: integer('amount_minor').notNull(),                  // > 0
  paidOn: text('paid_on').notNull(),                               // 'YYYY-MM-DD'
  method: text('method', { enum: C.PAYMENT_METHODS }).notNull().default('bank_transfer'),
  reference: text('reference'), notes: text('notes'),
  voidedAt: integer('voided_at'), voidReason: text('void_reason'),
  createdBy: text('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: createdAt(),
}, (t) => [index('payments_invoice_idx').on(t.invoiceId)]);

// ───────── outbound email queue ─────────
export const emailOutbox = sqliteTable('email_outbox', {
  id: pk(),
  toEmail: text('to_email').notNull(), toName: text('to_name'),
  locale: text('locale', { enum: C.LOCALES }).notNull().default('en'),
  templateKey: text('template_key').notNull(),                     // 'contract_signing_link' | 'contract_otp' | ...
  payloadJson: text('payload_json').notNull(),                     // variables + attachment file ids; NO raw tokens in logs
  status: text('status', { enum: C.EMAIL_STATUSES }).notNull().default('pending'),
  attempts: integer('attempts').notNull().default(0),
  lastError: text('last_error'),
  scheduledAt: integer('scheduled_at').notNull(), sentAt: integer('sent_at'),
  entityType: text('entity_type'), entityId: text('entity_id'),
  createdAt: createdAt(),
}, (t) => [index('outbox_status_idx').on(t.status, t.scheduledAt)]);
```

**Design notes the implementer must respect**
- `payment_milestones` has **no** `invoice_id`; "invoiced" is derived from an active invoice with that `milestone_id`.
- Circular FKs are avoided on purpose (`current_version_id` is a plain column).
- Drafts never have numbers. Numbers are allocated at `send` (contracts) and `issue` (invoices).
- `contract_signatories.version_id` ties every signature to the exact version that was signed.

## 6.3 Custom SQL migration (triggers + CHECKs)

Create custom migrations with `npx drizzle-kit generate --custom --name=<name>` and paste the SQL. **The SQL below is split across tasks because each trigger needs its table to exist**: audit triggers → T-005 (`integrity_audit`); versions/signatories/contracts/clauses/items/milestones triggers → T-014 (`integrity_contracts`); invoices/invoice_lines/payments triggers → T-023 (`integrity_invoices`). Separate statements with `--> statement-breakpoint` (VERIFY the exact marker used by the installed drizzle-kit by opening a generated migration).

```sql
-- append-only audit log
CREATE TRIGGER audit_log_no_update BEFORE UPDATE ON audit_log BEGIN SELECT RAISE(ABORT, 'audit_log is append-only'); END;
--> statement-breakpoint
CREATE TRIGGER audit_log_no_delete BEFORE DELETE ON audit_log BEGIN SELECT RAISE(ABORT, 'audit_log is append-only'); END;
--> statement-breakpoint
-- immutable contract versions
CREATE TRIGGER contract_versions_no_update BEFORE UPDATE ON contract_versions BEGIN SELECT RAISE(ABORT, 'contract_versions are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER contract_versions_no_delete BEFORE DELETE ON contract_versions BEGIN SELECT RAISE(ABORT, 'contract_versions are immutable'); END;
--> statement-breakpoint
-- signatories and payments are never deleted
CREATE TRIGGER signatories_no_delete BEFORE DELETE ON contract_signatories BEGIN SELECT RAISE(ABORT, 'signatories cannot be deleted'); END;
--> statement-breakpoint
CREATE TRIGGER payments_no_delete BEFORE DELETE ON payments BEGIN SELECT RAISE(ABORT, 'payments cannot be deleted; void them'); END;
--> statement-breakpoint
CREATE TRIGGER payments_core_immutable BEFORE UPDATE OF amount_minor, invoice_id, paid_on, method, reference ON payments BEGIN SELECT RAISE(ABORT, 'payments are immutable; void and re-enter'); END;
--> statement-breakpoint
-- numbered / non-draft documents cannot be deleted
CREATE TRIGGER contracts_no_delete_sent BEFORE DELETE ON contracts WHEN OLD.number IS NOT NULL OR OLD.status <> 'draft' BEGIN SELECT RAISE(ABORT, 'sent contracts cannot be deleted'); END;
--> statement-breakpoint
CREATE TRIGGER invoices_no_delete_issued BEFORE DELETE ON invoices WHEN OLD.number IS NOT NULL OR OLD.status <> 'draft' BEGIN SELECT RAISE(ABORT, 'issued invoices cannot be deleted'); END;
--> statement-breakpoint
-- signed contracts: content columns frozen
CREATE TRIGGER contracts_signed_immutable BEFORE UPDATE OF number, client_id, project_id, language_mode, has_fees, title_ar, title_en, scope_ar, scope_en, currency, discount_type, discount_value, subtotal_minor, discount_minor, net_minor, tax_rate_bp, tax_minor, total_minor, milestone_mode, start_date, end_date, content_hash ON contracts
  WHEN OLD.status IN ('signed', 'completed', 'terminated') BEGIN SELECT RAISE(ABORT, 'signed contracts are immutable'); END;
--> statement-breakpoint
-- contract children are editable only while the parent is a draft
CREATE TRIGGER contract_clauses_draft_ins BEFORE INSERT ON contract_clauses WHEN (SELECT status FROM contracts WHERE id = NEW.contract_id) <> 'draft' BEGIN SELECT RAISE(ABORT, 'contract is not editable'); END;
--> statement-breakpoint
CREATE TRIGGER contract_clauses_draft_upd BEFORE UPDATE ON contract_clauses WHEN (SELECT status FROM contracts WHERE id = OLD.contract_id) <> 'draft' BEGIN SELECT RAISE(ABORT, 'contract is not editable'); END;
--> statement-breakpoint
CREATE TRIGGER contract_clauses_draft_del BEFORE DELETE ON contract_clauses WHEN (SELECT status FROM contracts WHERE id = OLD.contract_id) <> 'draft' BEGIN SELECT RAISE(ABORT, 'contract is not editable'); END;
--> statement-breakpoint
CREATE TRIGGER contract_items_draft_ins BEFORE INSERT ON contract_items WHEN (SELECT status FROM contracts WHERE id = NEW.contract_id) <> 'draft' BEGIN SELECT RAISE(ABORT, 'contract is not editable'); END;
--> statement-breakpoint
CREATE TRIGGER contract_items_draft_upd BEFORE UPDATE ON contract_items WHEN (SELECT status FROM contracts WHERE id = OLD.contract_id) <> 'draft' BEGIN SELECT RAISE(ABORT, 'contract is not editable'); END;
--> statement-breakpoint
CREATE TRIGGER contract_items_draft_del BEFORE DELETE ON contract_items WHEN (SELECT status FROM contracts WHERE id = OLD.contract_id) <> 'draft' BEGIN SELECT RAISE(ABORT, 'contract is not editable'); END;
--> statement-breakpoint
CREATE TRIGGER milestones_draft_ins BEFORE INSERT ON payment_milestones WHEN (SELECT status FROM contracts WHERE id = NEW.contract_id) <> 'draft' BEGIN SELECT RAISE(ABORT, 'contract is not editable'); END;
--> statement-breakpoint
CREATE TRIGGER milestones_draft_upd BEFORE UPDATE ON payment_milestones WHEN (SELECT status FROM contracts WHERE id = OLD.contract_id) <> 'draft' BEGIN SELECT RAISE(ABORT, 'contract is not editable'); END;
--> statement-breakpoint
CREATE TRIGGER milestones_draft_del BEFORE DELETE ON payment_milestones WHEN (SELECT status FROM contracts WHERE id = OLD.contract_id) <> 'draft' BEGIN SELECT RAISE(ABORT, 'contract is not editable'); END;
--> statement-breakpoint
-- issued invoices: money/identity columns frozen
CREATE TRIGGER invoices_issued_immutable BEFORE UPDATE OF number, client_id, project_id, contract_id, milestone_id, currency, issue_date, due_date, discount_type, discount_value, subtotal_minor, discount_minor, net_minor, tax_rate_bp, tax_minor, total_minor, seller_snapshot_json, buyer_snapshot_json ON invoices
  WHEN OLD.status <> 'draft' BEGIN SELECT RAISE(ABORT, 'issued invoices are immutable'); END;
--> statement-breakpoint
CREATE TRIGGER invoice_lines_draft_ins BEFORE INSERT ON invoice_lines WHEN (SELECT status FROM invoices WHERE id = NEW.invoice_id) <> 'draft' BEGIN SELECT RAISE(ABORT, 'invoice is not editable'); END;
--> statement-breakpoint
CREATE TRIGGER invoice_lines_draft_upd BEFORE UPDATE ON invoice_lines WHEN (SELECT status FROM invoices WHERE id = OLD.invoice_id) <> 'draft' BEGIN SELECT RAISE(ABORT, 'invoice is not editable'); END;
--> statement-breakpoint
CREATE TRIGGER invoice_lines_draft_del BEFORE DELETE ON invoice_lines WHEN (SELECT status FROM invoices WHERE id = OLD.invoice_id) <> 'draft' BEGIN SELECT RAISE(ABORT, 'invoice is not editable'); END;
```

Notes:
- Because these triggers abort, services must **only** `UPDATE` the allowed columns after a document leaves draft (status, timestamps, `paid_minor`, `verification_code`, `final_pdf_file_id`, `pdf_sha256`, `pdf_attempts`, etc.). Never write `.set({...fullRow})`.
- The draft→issued invoice transition is allowed to set number/dates/snapshots because the trigger's `WHEN OLD.status <> 'draft'` is false for that update.
- Add CHECK constraints (Drizzle `check()` or in the same custom migration via table rebuild — prefer Drizzle `check()` in `schema.ts` if available): `length(currency) = 3`; all `*_minor >= 0` (`amount_minor > 0` for payments); `qty_milli > 0`; `tax_rate_bp BETWEEN 0 AND 10000`; `clients: nameAr IS NOT NULL OR nameEn IS NOT NULL`; `projects: same`; every `position >= 1`.
- A test (T-014/T-023) must try to violate each trigger and assert an error is thrown.

## 6.4 Seed data (`scripts/seed.ts`, idempotent)

1. Default settings rows (see 21.1 defaults) if missing.
2. System templates (11.7) upserted by `key` — never overwrite a template whose `isSystem=false`.
3. If zero users and `BOOTSTRAP_OWNER_*` set: create the owner (`role='owner'`, `canSignForCompany=true`).
4. Sequences are created lazily by the allocator (7.1), not seeded.

---
# 7. Business rules

## 7.1 Document numbering (`src/server/services/numbering.ts`)

| Sequence key | Year column | Format | Example | Assigned when |
|---|---|---|---|---|
| `contract` | year of the send date (business timezone) | `{prefix}-C-{YYYY}-{NNNN}` | `DOS-C-2026-0001` | first `send` of a contract (never changes afterwards) |
| `invoice` | year of the invoice **issue date** | `{prefix}-I-{YYYY}-{NNNN}` | `DOS-I-2026-0001` | `issue` of an invoice |
| `project` | `0` | `P-{NNNN}` | `P-0001` | project creation |

- `{prefix}` = Settings `numbering.prefix` (default `DOS`, 2–6 uppercase letters/digits).
- `{NNNN}` = counter zero-padded to **at least** 4 digits (`10000` stays `10000`).
- Counters restart each year per key (new row with `year`).
- Allocation (inside the SAME transaction as the row that receives the number):

```ts
export function allocateNumber(tx: DbTx, key: SeqKey, year: number): number {
  tx.insert(numberSequences).values({ seqKey: key, year, lastValue: 0 }).onConflictDoNothing().run();
  const row = tx.update(numberSequences)
    .set({ lastValue: sql`${numberSequences.lastValue} + 1` })
    .where(and(eq(numberSequences.seqKey, key), eq(numberSequences.year, year)))
    .returning({ v: numberSequences.lastValue }).get();
  if (!row) throw new AppError('INTERNAL', 'sequence');
  return row.v;
}
```
(VERIFY `.returning().get()` with the installed drizzle + better-sqlite3.)
- **Gapless guarantee**: because allocation and the document update share one transaction, a rollback also rolls back the counter. Voided invoices/cancelled contracts keep their numbers.
- Pure helper `formatDocNumber(prefix, kind: 'C'|'I', year, n)` and `formatProjectCode(n)` are unit-tested.

## 7.2 Totals calculation (`src/server/services/contract-calc.ts`, used by contracts AND invoices)

```ts
export type CalcInput = {
  items: { unitPriceMinor: number; qtyMilli: number }[];
  discount: { type: 'none' | 'percent' | 'fixed'; value: number };   // value: bp or minor
  taxRateBp: number;                                                   // 0..10000
  fixedTaxMinor?: number;                                              // override (milestone invoices only)
};
export type CalcOutput = {
  lineTotals: number[]; subtotal: number; discount: number; net: number; tax: number; total: number;
};
```

Algorithm (order is normative):
1. `lineTotal_i = mulDivRound(unitPriceMinor_i, qtyMilli_i, 1000)`.
2. `subtotal = Σ lineTotal_i`.
3. `discount`: `none → 0`; `percent → percentOfBp(subtotal, value)` (value ∈ [0, 10000]); `fixed → value` (must be ≤ `subtotal`, else `AppError('VALIDATION_FAILED', fieldErrors: {discountValue: 'errors.discountExceedsSubtotal'})`).
4. `net = subtotal - discount`.
5. `tax = fixedTaxMinor ?? percentOfBp(net, taxRateBp)`.
6. `total = net + tax`.
7. All results ≤ `MAX_MINOR`, else `VALIDATION_FAILED`.

Tax is **exclusive** (added on top). Tax-inclusive pricing is not supported.

## 7.3 Payment milestone planning (`src/server/services/milestones.ts`)

Contract stores `milestoneMode` = `percent` or `fixed`.

Input: `net`, `tax` (contract-level, from 7.2), rows `{titleAr,titleEn, percentBp? , amountMinor?, dueDate?, triggerNote*}`.

- **percent mode**: all rows need `percentBp ≥ 1`; `Σ percentBp == 10_000`. `amounts = allocateByBp(net, bps)`.
- **fixed mode**: all rows need `amountMinor ≥ 1`; `Σ amountMinor == net` exactly, else `VALIDATION_FAILED (milestonesSumMismatch)`. `percentBp` is stored as `NULL`.
- **tax per milestone**: `taxes = allocateProportional(tax, amounts)`; `totalMinor_i = amount_i + tax_i`.
- Result invariant (asserted in code and tests): `Σ amount_i == net`, `Σ tax_i == tax`, `Σ total_i == contract.totalMinor`.
- Re-planning is a pure recomputation from the editable rows; the service rewrites all milestone rows (delete + insert in one transaction) whenever pricing, discount, tax, mode or rows change while the contract is draft.
- When `hasFees`, at least 1 milestone is required to send. A one-row plan with `percentBp = 10000` is the "pay in full" case.

## 7.4 Contract lifecycle

Statuses: `draft, sent, declined, expired, signed, completed, terminated, cancelled`.

| From | Action (service fn) | To | Guards | Side effects (all in ONE tx unless noted) |
|---|---|---|---|---|
| draft | `sendContract` | sent | `validateContractForSend` returns no errors (7.5); actor has `contracts.send`; provider signer chosen | allocate contract number if `number IS NULL`; insert `contract_versions` row (snapshot + hash, 7.6); set `currentVersionId`, `contentHash`, `sentAt`; create signatory rows (provider + client) bound to that version; provider signs now if setting `requireProviderSignatureBeforeSend` (default true); generate client token (hmac stored) and enqueue signing-link email (after tx the outbox row is already inserted inside tx — email is *sent* later by worker); audit `contract.sent` |
| sent | `signAsProvider` | sent / signed | actor `canSignForCompany` + `contracts.sign_provider`; provider signatory pending | store signature evidence; if all signatories signed → finalize (7.8) |
| sent | `submitClientSignature` (public) | sent / signed | valid token, OTP verified (if required), consent true | same as above |
| sent | `declineContract` (public) | declined | valid token | revoke tokens; notify team; audit `contract.declined` |
| sent | worker `expireContracts` | expired | `signingDeadline < todayInTz` | revoke tokens; audit `contract.expired` |
| sent, declined, expired | `reviseContract` (alias *recall*) | draft | actor `contracts.write` | `versionNo += 1`; revoke ALL tokens (`token_hash = NULL`); old signatory rows stay as history; audit `contract.recalled`. The contract becomes editable again. Next send creates a NEW version row and NEW signatory rows. |
| draft, sent, declined, expired | `cancelContract` | cancelled | `contracts.cancel`; reason optional | revoke tokens; audit; number (if any) is kept |
| signed | `completeContract` | completed | `contracts.write` | `completedAt`; audit |
| signed | `terminateContract` | terminated | owner only (`contracts.terminate`); reason required | `terminatedAt`, `terminationReason`; audit. Existing issued invoices are unaffected; un-invoiced milestones can no longer be invoiced. |
| completed, terminated, cancelled | — | — | terminal | — |

Deleting: only a **draft with `number IS NULL`** may be hard-deleted (`deleteDraftContract`). Everything else is cancelled.

"Active" is a derived label: `status = 'signed'` and `startDate <= today` and (`endDate IS NULL` or `endDate >= today`).

## 7.5 `validateContractForSend` (returns `Issue[]`, severity `error` blocks, `warning` doesn't)

`Issue = { severity: 'error'|'warning'; code: string; field?: string; messageKey: string; params?: Record<string,string|number> }`.

Errors:
1. Language completeness for `languageMode` (`ar` → only AR fields; `en` → only EN; `bilingual` → both): contract title; scope; every clause title+body; every pricing item description; client name (+ legal name if the template uses it); project name; company profile name.
2. `currency` in `CURRENCIES`. If `hasFees`: ≥ 1 pricing item and `total > 0`. If `!hasFees`: there must be **no** pricing items and **no** milestones, and discount/tax are ignored (stored as 0).
3. If `hasFees`: milestones valid per 7.3 and ≥ 1.
4. `startDate` present; if `endDate` then `endDate >= startDate`; if `signingDeadline` then `signingDeadline >= today`.
5. ≥ 1 clause.
6. Every `{{variable}}` found in any clause (and in `scope`/title) is in the allowed list (11.3) and resolves to a **non-empty** string for every required language. Report each missing variable once with the clause position.
7. Client signatory name AND client email are provided (entered in the Send dialog; defaults from client `repName*`/`email`). Email format valid.
8. Provider signer: a user with `canSignForCompany = true` is selected (default: current user if eligible).
9. Company profile has a name for each required language.
10. Template structure: across all clauses there is **exactly one** `{{block.signatures}}`; if `hasFees` there is at least one `{{block.payment_schedule}}`; the **ordered sequence of special blocks is identical** in the AR body and the EN body of every clause (needed for the bilingual side-by-side layout, 12.4).

Warnings:
- `taxRateBp > 0` but company `taxNumber` empty.
- `endDate` earlier than the last milestone `dueDate`.
- A clause has a different number of numbered paragraphs in AR vs EN (labels `N.k` would not align in bilingual mode).
- client `taxNumber` empty and `taxRateBp > 0`.
- bank details empty (invoices will lack payment instructions).

## 7.6 Snapshots, canonical JSON, content hash

When a contract is sent, `buildContractSnapshot(contractId): ContractSnapshotV1` reads the live rows and the company profile and returns:

```ts
type ContractSnapshotV1 = {
  schema: 'dossier.contract.v1';
  contract: {
    id: string; number: string; versionNo: number; languageMode: 'ar'|'en'|'bilingual';
    hasFees: boolean; issueDate: string;            // issueDate = send date 'YYYY-MM-DD' in business timezone
    titleAr: string|null; titleEn: string|null; scopeAr: string|null; scopeEn: string|null;
    currency: string; startDate: string|null; endDate: string|null; paymentTermsDays: number;
    governingLawAr: string|null; governingLawEn: string|null;
    jurisdictionAr: string|null; jurisdictionEn: string|null; signingDeadline: string|null;
    milestoneMode: 'percent'|'fixed';
  };
  provider: { nameAr: string|null; nameEn: string|null; legalNameAr: string|null; legalNameEn: string|null;
              crNumber: string|null; taxNumber: string|null; addressAr: string|null; addressEn: string|null;
              email: string|null; phone: string|null; website: string|null;
              logoSha256: string|null; stampSha256: string|null };
  client: { id: string; type: 'company'|'individual'; nameAr: string|null; nameEn: string|null;
            legalNameAr: string|null; legalNameEn: string|null; email: string|null; phone: string|null;
            country: string|null; city: string|null; addressAr: string|null; addressEn: string|null;
            taxNumber: string|null; crNumber: string|null;
            repNameAr: string|null; repNameEn: string|null; repTitleAr: string|null; repTitleEn: string|null };
  project: { id: string; code: string; nameAr: string|null; nameEn: string|null; description: string|null };
  items: { position: number; descriptionAr: string|null; descriptionEn: string|null; qtyMilli: number; unitPriceMinor: number; lineTotalMinor: number }[];
  totals: { subtotalMinor: number; discountType: 'none'|'percent'|'fixed'; discountValue: number; discountMinor: number;
            netMinor: number; taxRateBp: number; taxMinor: number; totalMinor: number };
  milestones: { position: number; titleAr: string; titleEn: string; percentBp: number|null; amountMinor: number; taxMinor: number; totalMinor: number; dueDate: string|null; triggerNoteAr: string|null; triggerNoteEn: string|null }[];
  clauses: { position: number; key: string|null; titleAr: string; titleEn: string; bodyAr: string; bodyEn: string }[];
  signatories: { role: 'provider'|'client'; name: string; title: string|null; email: string|null }[];
};
```
The logo/stamp **images** are not embedded in JSON; their SHA-256 are, and the PDF engine loads the image files by hash→file lookup (the current logo/stamp file with that hash must still exist; files are never deleted when referenced — see 15.3).

`canonicalize(value): string` (`src/lib/canonical-json.ts`):
- Objects: keys sorted ascending by UTF-16 code unit, recursively; `undefined` properties omitted; `null` kept.
- Arrays keep order. No whitespace.
- Strings: `normalize('NFC')`, JSON-escaped via `JSON.stringify`.
- Numbers: must be finite integers (`Number.isSafeInteger`), else throw.
- `contentHash = sha256Hex(canonicalize(snapshot))`.

Rendering rule: **any PDF/preview of a contract that has a version row is rendered from the stored `snapshotJson`, never from live tables.** Drafts are rendered from `buildContractSnapshot()` output (with `number` possibly `null`, watermark "DRAFT / مسودة").

## 7.7 Signing flow (detailed)

**Provider side (in-app)**
1. In the Send dialog the user confirms the provider signatory (name/title from user profile; editable) and draws/types a signature.
2. `sendContract` inserts the provider signatory with `status='signed'`, `signedAt=now`, evidence (`ip`, `userAgent`, `signatureMethod`, `signatureFileId` or `typedName`, `consentTextHash`). If the setting `requireProviderSignatureBeforeSend` is false, the row is `pending` and the provider signs later with `signAsProvider`.
3. Evidence `ip` comes from header `x-real-ip` (set by Nginx); fall back to `null`.

**Client side (public link `/s/[token]`)**
1. Resolve: `hmacToken(token)` → `contract_signatories.token_hash`. Valid only if: signatory `pending`; `tokenExpiresAt > now`; contract `status='sent'`; `signatory.versionId == contract.currentVersionId`. Otherwise show a generic "This link is invalid or has expired" page (HTTP 200, no details, `noindex`).
2. Token lifetime: `min(now + signing.link_ttl_days days, endOfDay(signingDeadline in business tz))`.
3. **OTP step** (if `signing.require_email_otp`, default true): button "Send me a code" → `requestSigningOtp(token)`: cooldown 60 s between sends, max 5 sends per hour per signatory; creates a 6-digit code valid 10 minutes, `otp_attempts = 0`, enqueues `contract_otp` email. `verifySigningOtp(token, code)`: max 5 attempts per code, then the code is invalidated; on success set `otp_verified_at = now` (valid for 60 minutes for this page).
4. **Review step**: show the contract (iframe `srcDoc` of the snapshot HTML in the chosen language; language toggle for bilingual contracts) and a link "Download PDF" (`/s/[token]/pdf`, same checks, draft watermark absent but "UNSIGNED / غير موقّع" footer).
5. First successful view sets `viewed_at` (audit `contract.viewed`, actor `signer`).
6. **Sign step**: required: consent checkbox (text from settings, AR/EN per UI language), full name field (prefilled, must be non-empty), signature (drawn via `signature_pad` — minimum 20 points — or typed name). `submitClientSignature(token, input)` runs the checks of step 1 again + OTP validity, stores the PNG (decode data URL, magic bytes `89 50 4E 47`, ≤ 200 KB, kind `signature`), updates the signatory row and writes audit `contract.signed` (actor `signer`).
7. **Decline**: `declineContract(token, reason?)` (reason ≤ 500 chars).
8. After a successful sign show a confirmation page (the sealed PDF link appears when ready; also emailed).

## 7.8 Finalization and sealed PDF

When the last required signatory signs:

*Inside the transaction*: re-read contract (status must still be `sent`); set `status='signed'`, `signedAt=now`; generate `verificationCode` if null; set `token_hash = NULL` for all rows of this contract; write audit. Assert `contentHash` equals `sha256(canonicalize(version.snapshotJson parsed))` (integrity check, else throw `INTERNAL` and abort the transaction).

*After the transaction* (`generateSealedPdf(contractId)`): render contract pages from the snapshot + signature blocks (images) + **certificate of completion** page (12.7) + QR; store as file kind `contract_pdf`; compute `pdfSha256`; set `finalPdfFileId`, `pdfSha256`; audit `contract.finalized`; enqueue emails with the PDF attached to: client signatory, provider signatory, and the contract creator.

*Failure handling*: any failure leaves `finalPdfFileId = NULL` and increments `pdfAttempts`. The worker retries every 5 minutes while `pdfAttempts < 10`. After 10 failures: audit `contract.pdf_failed`, and the contract page shows a red banner with a manual "Retry" button (`contracts.write`).

## 7.9 Invoices

**Creation**
- *From milestone* (`createInvoiceFromMilestone(milestoneId)`): contract status must be `signed` or `completed`; milestone must have no active invoice. Copies: client, project, contract, currency, language mode, tax rate. One line: description = milestone title (+ ` — ` + contract number), `qtyMilli=1000`, `unitPriceMinor = milestone.amountMinor`. Totals: `calcTotals({... fixedTaxMinor: milestone.taxMinor})` so invoice total equals `milestone.totalMinor` exactly. For milestone invoices **lines, discount and tax are read-only**; due date, issue date, notes, language mode remain editable while draft.
- *Standalone* (`createInvoice`): project required (client derived), lines editable, discount and tax editable.

**Issue** (`issueInvoice`) — guards: status `draft`; ≥ 1 line; `total > 0`; language completeness for `languageMode`; company profile name per language; `issueDate` (default today in business tz); `dueDate` (default `issueDate + paymentTermsDays`, where days = contract's `paymentTermsDays` if linked else `defaults.payment_terms_days`); `dueDate >= issueDate`. In one tx: allocate invoice number with `year = Number(issueDate.slice(0,4))`; generate `verificationCode`; freeze `sellerSnapshotJson` (company profile) and `buyerSnapshotJson` (client fields as in 7.6 `client`); copy payment instructions from Settings bank details per language if the invoice's own field is empty; `status='issued'`, `issuedAt=now`; audit `invoice.issued`.

**Payments** (`recordPayment`) — guards: invoice status `issued` or `partially_paid`; `amountMinor ≥ 1`; `amountMinor <= total - paid` (else `PAYMENT_EXCEEDS_BALANCE`); `paidOn` valid date not in the future (business tz). In one tx: insert payment; `paidMinor = Σ non-voided`; status = `paid` if `paidMinor == total` (set `paidAt`) else `partially_paid`.
`voidPayment(paymentId, reason)` (reason required, owner only): set `voidedAt/voidReason`; recompute `paidMinor`; status = `issued` if `paidMinor == 0`, else `partially_paid`; clear `paidAt`.
**Void invoice** (`voidInvoice(id, reason)`; owner only; reason required): allowed only when status `issued` and `paidMinor == 0` (void payments first). Sets `status='void'`, `voidedAt`, `voidReason`. Number is kept. A milestone becomes invoiceable again.

**Overdue** is **derived**, never stored: `isOverdue = status ∈ {issued, partially_paid} && dueDate < todayInTz`.

**Reminders** (worker, only when Settings `email.overdue_reminders_enabled` is true; default false): for each overdue invoice with client email, if `daysOverdue ∈ email.overdue_reminder_days` (default `[1, 7, 14]`) and `lastReminderAt` is NULL or earlier than the start of today (business tz): enqueue `invoice_overdue_reminder` email (PDF attached), set `lastReminderAt`, audit `invoice.reminder_sent`.

## 7.10 Public verification (`src/server/services/verification.ts`)

`lookupVerification(rawCode)` normalizes the code (5.1) and returns a **minimal public DTO**:
- Contract (`status ∈ signed, completed, terminated`): `{ kind:'contract', number, title (languages per mode), providerName, clientName, signedAt, state: 'valid' | 'terminated', contentHash }`.
- Invoice (`status ≠ draft`): `{ kind:'invoice', number, issuerName, issueDate, totalFormatted, state: 'valid' | 'void' }`.
- Not found: same generic response and similar timing.

Optional file check (contracts only): user uploads a PDF (≤ 15 MB) → server computes SHA-256 in memory, compares with `pdfSha256`; returns `match | mismatch`; the upload is **not stored**.
Rate limit: 30 requests/minute/IP for lookups; 10/minute/IP for file checks.

## 7.11 Project financial summary (grouped per currency)

For project `P` (only documents of `P`):
- `contracted = Σ contracts.totalMinor` where `status ∈ (signed, completed)`.
- `invoiced = Σ invoices.totalMinor` where `status ∈ (issued, partially_paid, paid)`.
- `paid = Σ invoices.paidMinor` (same set).
- `outstanding = invoiced − paid`.
- `overdue = Σ (totalMinor − paidMinor)` over derived-overdue invoices.
- `remainingToInvoice = Σ milestones.totalMinor` of signed/completed contracts that have no active invoice.

## 7.12 Dashboard metrics (`src/server/services/dashboard.ts`; all per currency where money)

1. Contracts awaiting signature (`status='sent'`): count + list (number, client, days waiting since `sentAt`).
2. Contracts signed in the last 30 days (count).
3. Draft contracts and draft invoices (counts).
4. Invoices: total outstanding; overdue count and amount; "due in the next 7 days" list.
5. Revenue received: current month and previous month from non-voided payments by `paidOn`.
6. Signed contracts with `endDate` within 30 days.
7. Recent activity: last 15 audit rows on contracts/invoices/payments.

---

# 8. Roles and permissions (`src/lib/permissions.ts`)

Permissions (string union): `clients.read clients.write projects.read projects.write templates.read templates.write contracts.read contracts.write contracts.send contracts.sign_provider contracts.cancel contracts.terminate invoices.read invoices.write invoices.issue invoices.void payments.write payments.void settings.read settings.write users.manage audit.read`.

| Permission | owner | member | viewer |
|---|---|---|---|
| clients.read / projects.read / templates.read / contracts.read / invoices.read | ✔ | ✔ | ✔ |
| clients.write / projects.write / templates.write | ✔ | ✔ | ✘ |
| contracts.write / contracts.send / contracts.cancel | ✔ | ✔ | ✘ |
| contracts.sign_provider | ✔ (**and** `canSignForCompany`) | ✔ (**and** `canSignForCompany`) | ✘ |
| contracts.terminate | ✔ | ✘ | ✘ |
| invoices.write / invoices.issue / payments.write | ✔ | ✔ | ✘ |
| invoices.void / payments.void | ✔ | ✘ | ✘ |
| settings.read | ✔ | ✔ | ✘ |
| settings.write / users.manage / audit.read | ✔ | ✘ | ✘ |

Extra rules:
- `can(user, perm)` is a pure function; `assertCan(user, perm)` throws `AppError('FORBIDDEN')`.
- A disabled user cannot authenticate and all their sessions are deleted.
- The last active `owner` can never be demoted, disabled or deleted.
- System templates (`isSystem`) are read-only; editing = "Duplicate" then edit the copy.
- Viewers can open document PDFs (they are `*.read`), but never see signing links/tokens.

---

# 9. Security requirements

1. **Passwords**: argon2id via `@node-rs/argon2` with library defaults (VERIFY they meet ≥ memory 19 MiB, t=2, p=1; else set explicitly). Min length 12, max 128; must differ from email. Always verify against a dummy hash when the user does not exist (uniform timing).
2. **Sessions**: cookie `dossier_session` = raw 256-bit token; flags `HttpOnly; SameSite=Lax; Path=/; Secure` (Secure when `NODE_ENV=production`); `Max-Age` 14 days. DB stores only `hmacToken(token)`. Sliding renewal: update `lastSeenAt` at most once/hour; if remaining life < 7 days extend to 14 days. Logout deletes the row. Changing password deletes all other sessions of that user. Cleanup of expired sessions in the worker hourly.
3. **Login rate limiting** (`src/server/auth/rate-limit.ts`, in-memory Map with cleanup — acceptable because of single-instance assumption A-05): 5 failures / 15 min per `(email, ip)`, 30 failures / 15 min per ip → `RATE_LIMITED`. Successful login clears the email counter.
4. **CSRF**: mutations only through Server Actions (built-in Origin check; VERIFY behavior and configure allowed origins only if needed behind the proxy) or POST route handlers that call `assertSameOrigin(request)` (compare `Origin` host with `new URL(APP_URL).host`). No state-changing GET.
5. **Security headers** (`next.config` `headers()`): all routes `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`. Routes `/s/*`, `/v/*`, `/verify`: `Referrer-Policy: no-referrer`, `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow`. HSTS set at Nginx. (A strict CSP is Phase 5 — Next inline scripts need nonces; do not add a half-working CSP.)
6. **Uploads** (`files` service): allowlist by **magic bytes** (PNG `89504E47`, JPEG `FFD8FF`, WebP `RIFF....WEBP`, PDF `%PDF-`), ignore client-declared MIME; limits: logo/stamp ≤ 2 MB (png/jpeg/webp), signature ≤ 200 KB (png), attachment ≤ 10 MB (png/jpeg/webp/pdf). **No SVG.** Stored at `DATA_DIR/files/YYYY/MM/<id>` (id from `newId`; the original name is only metadata). Served through an authorized route with `Content-Type` from DB, `X-Content-Type-Options: nosniff`, and `Content-Disposition: attachment` unless `?inline=1` for PDFs/images the user may read.
7. **Public endpoints**: tokens are 256-bit random; verification codes 60-bit with rate limiting; `/s/*` 60 req/min/IP; OTP rules in 7.7; generic failure pages; never reveal whether a contract exists.
8. **PDF renderer isolation**: Chromium context with `javaScriptEnabled: false`; all network requests aborted (`page.route('**/*', r => r.abort())` — data URLs are unaffected); all dynamic text HTML-escaped; fonts/images embedded as data URIs.
9. **Data protection**: DB and `files/` directory permissions `0700`/`0600` (container user only); no PII or secrets in logs; audit `metaJson` never contains tokens/OTPs/passwords/signature data; outbox `payloadJson` signing URLs are **redacted after send** (replace with `"[redacted]"`).
10. **Client IP**: trust only `x-real-ip` set by Nginx (the app is never exposed directly in production).
11. **Dependencies**: commit `package-lock.json`; CI uses `npm ci`; run `npm audit --omit=dev` in CI as a non-blocking report.
12. **Authorization test**: a table-driven test enumerates every server action and asserts: unauthenticated → `UNAUTHENTICATED`; `viewer` calling a write action → `FORBIDDEN`.
13. **Secrets**: `APP_SECRET` must be ≥ 64 hex chars (enforced in `env.ts`); never logged; never sent to the client; only `NEXT_PUBLIC_*` vars are client-visible and none are used.
14. **Error pages**: production never shows stack traces or SQL; unknown errors → `INTERNAL` + server log with a short error id shown to the user.
15. **Legal text**: seed templates are starting points. The template editor shows a persistent notice: "Have a qualified lawyer review contract text before use." (i18n key `templates.legalNotice`).

---
# 10. i18n, RTL, theme

## 10.1 Locale resolution
- UI locales: `ar`, `en`. Resolution order: cookie `dossier_locale` → logged-in user's `locale` → `DEFAULT_LOCALE`.
- `<html lang="ar" dir="rtl">` or `<html lang="en" dir="ltr">` set in the root layout from the resolved locale.
- Locale switch = server action `setLocale('ar'|'en')`: sets the cookie (1 year, `SameSite=Lax`, not HttpOnly is fine but keep HttpOnly), and if logged in updates `users.locale`.
- Use `next-intl` **without** URL locale prefixes (VERIFY the `getRequestConfig` API of the installed major version: it reads the cookie and returns `{ locale, messages }`).
- Public pages (`/s/[token]`, `/v/[code]`, `/verify`): locale from `?lang=ar|en` → cookie → client preferred language (for signing pages the signatory's contract language: `ar` if the contract is `ar` or `bilingual`, `en` if `en`) → default.

## 10.2 Message files
- `messages/en.json` and `messages/ar.json`: nested objects by area (`common`, `nav`, `auth`, `clients`, `projects`, `templates`, `contracts`, `invoices`, `payments`, `settings`, `users`, `audit`, `dashboard`, `signing`, `verify`, `errors`, `emails`, `pdf`). Skeleton in 21.2.
- Placeholders use ICU `{name}`. Both languages must use the **same placeholders**.
- A test (`messages.test.ts`) asserts: identical flattened key sets; no empty strings; identical placeholder sets per key.
- Arabic style: Modern Standard Arabic, formal, consistent terminology from the glossary (1.6). Do not machine-transliterate English words when an established Arabic term exists.

## 10.3 RTL rules
- Only logical Tailwind utilities (R7). Directional icons (chevrons, arrows) get `rtl:rotate-180` (or `rtl:-scale-x-100`).
- Inputs that always hold LTR data get `dir="ltr"` and `text-start`: email, URL, phone, IBAN, SWIFT, tax number, CR number, verification code, numbers, dates (ISO), currency amounts.
- Bilingual content fields (the `*Ar` / `*En` pairs) use a `BilingualField` component: two labeled inputs/textareas side by side (stacked on mobile); the Arabic one has `dir="rtl"`, the English one `dir="ltr"`, **regardless of UI locale**.
- Mixed content (e.g. an English client name inside Arabic text) is wrapped in `<bdi>`.
- Tables: header alignment follows `text-start`; numeric columns use `text-end` and `tabular-nums` with `dir="ltr"` on the cell content.

## 10.4 Formatting in the UI
- Digits: Western (0-9) in both locales. `fmtMoney(minor, currency)` → `1,234.50 SAR` (5.2). `fmtDate(dateStr, locale)` → `formatDateLong`. `fmtDateTime(ms, tz, locale)`.
- Dates in forms are `<input type="date">` (value `YYYY-MM-DD`).

## 10.5 Fonts and theme
- UI font: **Cairo** (Arabic + Latin) loaded with `next/font/local` from `assets/fonts/` (self-hosted, OFL license; keep `assets/fonts/OFL.txt`).
- Theme: dark default, light optional, switch stored in cookie `dossier_theme` (`dark|light|system`), applied via class on `<html>` before paint (inline script is NOT allowed → apply server-side from cookie; `system` falls back to dark SSR then CSS `prefers-color-scheme`).
- Tokens in 5.8. Radius 10px for cards, 8px for inputs/buttons. Focus ring 2px primary.

---

# 11. Template engine, variables, seed templates

## 11.1 Clause body syntax (plain text, no HTML, no Markdown library)

A clause has `titleAr/titleEn` (plain text, **no variables allowed**) and `bodyAr/bodyEn`.

Body = blocks separated by **one or more blank lines**:

| Block form | Meaning |
|---|---|
| Normal paragraph | **Auto-numbered** `N.k` (N = clause position, k = index among numbered paragraphs in this clause, starting at 1). Single newlines inside the paragraph become `<br>`. |
| Every line starts with `- ` | Bulleted list (items = lines without the prefix). Not numbered. |
| Starts with `> ` | Unnumbered paragraph (indented). The `> ` is removed. |
| A line that is exactly `{{block.xxx}}` | Special block (11.4). Not numbered. |

Inline syntax (inside paragraphs, bullets, `>` blocks):
- `{{var.name}}` → variable (whitelist 11.3). Whitespace inside braces is ignored.
- `**text**` → bold (only in literal text, never inside substituted values).
- Everything else is literal text.

**Escaping order (security-critical)**: tokenise the text into segments `literal | variable`. Literal segments are HTML-escaped (`& < > " '`) and then `**…**` is converted to `<strong>`. Variable values are HTML-escaped, newlines converted to `<br>`, and wrapped in `<bdi>…</bdi>`. Never insert unescaped user text. User-entered fields (`contract.title`, `contract.scope`, etc.) are **values**, so any `{{…}}` inside them is NOT expanded (no recursion).

Heading format per language:
- EN: `Article {N} — {titleEn}`
- AR: `المادة ({N}): {titleAr}`

## 11.2 Parser contract (`src/server/templating/render-body.ts`)

```ts
export type Block =
  | { type: 'paragraph'; numbered: true;  text: string }       // text = raw (unescaped) source
  | { type: 'paragraph'; numbered: false; text: string }       // from "> "
  | { type: 'bullets'; items: string[] }
  | { type: 'special'; name: 'parties' | 'pricing_table' | 'payment_schedule' | 'signatures' };

export function parseBody(src: string): Block[];                         // pure
export function extractVariables(src: string): string[];                 // unique var names, in order of appearance
export function renderInline(raw: string, vars: Record<string,string>, onMissing: (k:string)=>void): string; // returns HTML
```
- Normalize `\r\n` and `\r` to `\n`; trim; collapse 3+ newlines to a blank line.
- A block whose trimmed text matches `^\{\{\s*block\.(parties|pricing_table|payment_schedule|signatures)\s*\}\}$` is special. A `{{block.*}}` token in any other position is a validation error `templates.blockMisplaced`.
- Unknown `{{x}}` (not in whitelist) → validation error at save time (template editor and contract send).
- In **previews**, a missing/empty variable renders as `⟦missing: key⟧` (visible, red in UI). In **send/sign/final PDFs** this can never happen because send validation blocks it (7.5).

## 11.3 Variable whitelist (exact keys)

Resolved **per language** `L ∈ {ar, en}` by `buildVariableMap(snapshot, L)`. For each pair of `…Ar/…En` fields pick the one matching `L`. **No cross-language fallback** (an empty value stays empty and triggers a validation error when required).

| Key | Source | Format |
|---|---|---|
| `provider.name` | `provider.nameAr/En` | text |
| `provider.legal_name` | `provider.legalNameAr/En` (falls back to `name` of same language) | text |
| `provider.cr_number` / `provider.tax_number` | `provider.*` | text |
| `provider.address` | `provider.addressAr/En` | text |
| `provider.email` / `provider.phone` / `provider.website` | `provider.*` | text |
| `provider.signatory_name` / `provider.signatory_title` | `signatories` where role=provider | text |
| `client.name` | `client.nameAr/En` | text |
| `client.legal_name` | `client.legalNameAr/En` (falls back to `name`) | text |
| `client.cr_number` / `client.tax_number` | `client.*` | text |
| `client.address` | `client.addressAr/En` | text |
| `client.country` / `client.email` / `client.phone` | `client.*` | text |
| `client.rep_name` / `client.rep_title` | `client.repNameAr/En`, `repTitleAr/En` | text |
| `project.name` | `project.nameAr/En` | text |
| `project.code` | `project.code` | text |
| `project.description` | `project.description` | text |
| `contract.number` | `contract.number` | e.g. `DOS-C-2026-0001` |
| `contract.title` | `contract.titleAr/En` | text |
| `contract.scope` | `contract.scopeAr/En` | multi-line text |
| `contract.date` | `contract.issueDate` | `formatDateLong` |
| `contract.start_date` / `contract.end_date` | `contract.startDate/endDate` | `formatDateLong` (empty if null) |
| `contract.currency` | `contract.currency` | ISO code |
| `contract.subtotal` / `contract.discount` / `contract.net` / `contract.tax` / `contract.total` | `totals.*` | `formatMoney` e.g. `11,500.00 SAR` |
| `contract.tax_rate` | `totals.taxRateBp` | `15%` (bp/100, trailing zeros trimmed, e.g. 1250 → `12.5%`) |
| `contract.payment_terms_days` | `contract.paymentTermsDays` | integer |
| `contract.governing_law` | `contract.governingLawAr/En` | text |
| `contract.jurisdiction` | `contract.jurisdictionAr/En` | text |
| `contract.version` | `contract.versionNo` | integer |

Fee-related keys (`contract.subtotal/discount/net/tax/tax_rate/total`) and blocks `pricing_table`, `payment_schedule` are only valid when `contract.hasFees = true`; using them in a no-fee contract is a validation error.

## 11.4 Special blocks (HTML renderers in `src/server/pdf/html/shared.ts`)

- `parties`: two party cards. Provider = "First Party (Provider) / الطرف الأول (المزوّد)"; Client = "Second Party (Client) / الطرف الثاني (العميل)". Each card prints (skipping empty lines): legal name or name, CR number, tax number, address, email, phone, and "Represented by: {rep name}, {rep title}" (client rep from `client.rep*` falling back to the client signatory name; provider rep from the provider signatory).
- `pricing_table`: columns `# | Description | Qty | Unit price | Total`; below: Subtotal, Discount (if > 0), Net, Tax (`x%`), **Total**. Quantity printed as `qtyMilli/1000` trimmed (1500 → `1.5`).
- `payment_schedule`: columns `# | Milestone | % (only in percent mode) | Net | Tax | Total | Due / Trigger`. "Due / Trigger" prints the date if set, else the trigger note, else `—`.
- `signatures`: two signature boxes (provider left/right per language direction, client opposite). Each shows: label, signatory name, title, signature image (if signed) or an empty line (if unsigned), date signed (if signed). In bilingual mode the labels are bilingual.

## 11.5 Template defaults schema (`src/lib/validation/template.ts`)

```ts
export const templateDefaultsSchema = z.object({
  hasFees: z.boolean().default(true),
  titleAr: z.string().max(200).optional(),
  titleEn: z.string().max(200).optional(),
  paymentTermsDays: z.number().int().min(0).max(365).optional(),
  milestonePreset: z.object({
    mode: z.enum(['percent', 'fixed']),
    rows: z.array(z.object({
      titleAr: z.string().min(1).max(120), titleEn: z.string().min(1).max(120),
      percentBp: z.number().int().min(1).max(10000).optional(),
      triggerNoteAr: z.string().max(200).optional(), triggerNoteEn: z.string().max(200).optional(),
    })).min(1).max(24),
  }).optional(),
});
```
(Preset rows in percent mode must sum to 10000; checked by `.superRefine`.) When creating a contract from a template: copy clauses, pre-fill title, `hasFees`, payment terms, milestone preset, and jurisdiction/governing law from Settings defaults.

## 11.6 Template editor rules
- System templates (`isSystem=true`) are read-only; "Duplicate" creates an editable copy (`isSystem=false`, `key=NULL`).
- Editor lets you: edit names/descriptions/default language mode/defaults; add, delete, reorder (up/down buttons) clauses; edit AR/EN title and body with a live preview rendered with sample data.
- Save-time validation: each clause has all four fields non-empty; titles contain no `{{`; all variables are whitelisted; block placement valid; clause count ≥ 1.
- Show the legal notice (`templates.legalNotice`).

## 11.7 Seed templates (exact content)

Implement in `src/server/templating/seed-templates.ts` as a `CLAUSES` map (key → four strings) and a `TEMPLATES` array (key, names, type, defaults, ordered clause keys). Bodies use the syntax of 11.1. **These are starter texts — they must be reviewed by a qualified lawyer before real use.** Numbers like "5 business days", "30 days", "14 days", "3 years" are defaults inside the text and can be edited in the contract's clauses.

### 11.7.1 Clause library (YAML shown for readability; convert to TS template literals; keep text byte-for-byte)

```yaml
- key: parties
  titleEn: Parties
  titleAr: الأطراف
  bodyEn: |
    {{block.parties}}
  bodyAr: |
    {{block.parties}}

- key: purpose
  titleEn: Purpose of the Agreement
  titleAr: الغرض من العقد
  bodyEn: |
    This Agreement governs the engagement of the Provider by the Client for the project **{{project.name}}** (Ref. {{project.code}}) under Agreement No. {{contract.number}} dated {{contract.date}}.

    By signing this Agreement, each Party confirms that it has the legal capacity and authority to enter into it.
  bodyAr: |
    ينظّم هذا العقد تعاقد العميل مع المزوّد لتنفيذ مشروع **{{project.name}}** (مرجع {{project.code}}) بموجب العقد رقم {{contract.number}} المؤرخ في {{contract.date}}.

    بتوقيع هذا العقد يُقرّ كل طرف بأن لديه الأهلية والصلاحية القانونية للتعاقد.

- key: scope
  titleEn: Scope of Work
  titleAr: نطاق العمل
  bodyEn: |
    The Provider shall perform the following services (the **Services**):

    > {{contract.scope}}

    Any work not expressly described above is outside the scope of this Agreement and is subject to the Change Requests clause.
  bodyAr: |
    يلتزم المزوّد بتنفيذ الخدمات التالية («الخدمات»):

    > {{contract.scope}}

    يُعدّ أي عمل غير منصوص عليه صراحةً أعلاه خارج نطاق هذا العقد، ويخضع لبند طلبات التغيير.

- key: fees
  titleEn: Fees and Payment
  titleAr: الأتعاب والدفع
  bodyEn: |
    The total fee for the Services is **{{contract.total}}**, comprising a net amount of {{contract.net}} and tax of {{contract.tax}} ({{contract.tax_rate}}), as detailed below.

    {{block.pricing_table}}

    The fee shall be paid according to the following payment schedule.

    {{block.payment_schedule}}

    Each invoice is payable within **{{contract.payment_terms_days}}** days from its issue date, by bank transfer to the account stated on the invoice.

    Amounts already paid for work performed are non-refundable unless otherwise agreed in writing.
  bodyAr: |
    إجمالي أتعاب الخدمات **{{contract.total}}**، ويشمل مبلغاً صافياً قدره {{contract.net}} وضريبة قدرها {{contract.tax}} ({{contract.tax_rate}})، وفق التفصيل الآتي.

    {{block.pricing_table}}

    تُسدَّد الأتعاب وفق جدول الدفعات الآتي.

    {{block.payment_schedule}}

    تُستحق كل فاتورة خلال **{{contract.payment_terms_days}}** يوماً من تاريخ إصدارها، ويتم السداد بالتحويل البنكي إلى الحساب المبيّن في الفاتورة.

    لا تُسترد المبالغ المدفوعة عن أعمال تم تنفيذها ما لم يُتفق كتابةً على خلاف ذلك.

- key: timeline
  titleEn: Term and Timeline
  titleAr: المدة والجدول الزمني
  bodyEn: |
    This Agreement takes effect on **{{contract.start_date}}** and, unless terminated earlier in accordance with its terms, remains in force until **{{contract.end_date}}**.

    Delivery dates depend on the Client providing content, approvals and access on time. Delays caused by the Client extend the timeline accordingly.
  bodyAr: |
    يسري هذا العقد اعتباراً من **{{contract.start_date}}** ويظل نافذاً حتى **{{contract.end_date}}** ما لم يُنهَ قبل ذلك وفق أحكامه.

    تعتمد مواعيد التسليم على تزويد العميل بالمحتوى والموافقات والصلاحيات في الوقت المناسب، وأي تأخير ناتج عن العميل يمدّد الجدول الزمني بمقداره.

- key: client_obligations
  titleEn: Client Obligations
  titleAr: التزامات العميل
  bodyEn: |
    The Client shall:

    - provide all content, materials, credentials and information reasonably required, in a timely manner;
    - appoint a representative authorized to give approvals and feedback;
    - review deliverables and respond within 5 business days of submission;
    - pay all amounts when due.
  bodyAr: |
    يلتزم العميل بما يلي:

    - تزويد المزوّد في الوقت المناسب بالمحتوى والمواد وبيانات الدخول والمعلومات اللازمة؛
    - تعيين ممثل مفوّض بإبداء الموافقات والملاحظات؛
    - مراجعة المخرجات والرد خلال 5 أيام عمل من تسليمها؛
    - سداد المبالغ المستحقة في مواعيدها.

- key: provider_obligations
  titleEn: Provider Obligations
  titleAr: التزامات المزوّد
  bodyEn: |
    The Provider shall perform the Services with reasonable skill and care in line with generally accepted professional standards, assign suitably qualified personnel, and keep the Client reasonably informed of progress.
  bodyAr: |
    يلتزم المزوّد بتنفيذ الخدمات بالعناية والمهارة المعقولتين وفق المعايير المهنية المتعارف عليها، وتكليف كوادر مؤهلة، وإطلاع العميل على سير العمل بصورة معقولة.

- key: change_requests
  titleEn: Change Requests
  titleAr: طلبات التغيير
  bodyEn: |
    Either Party may request changes to the Services. No change takes effect until agreed in writing (email is sufficient), stating its effect on fees and timeline.

    Approved changes are invoiced as additional work.
  bodyAr: |
    لأي من الطرفين طلب تعديل الخدمات، ولا يسري أي تعديل إلا بعد الاتفاق عليه كتابةً (ويكفي البريد الإلكتروني) مع بيان أثره على الأتعاب والجدول الزمني.

    تُفوتَر التعديلات المعتمدة كأعمال إضافية.

- key: acceptance
  titleEn: Delivery and Acceptance
  titleAr: التسليم والقبول
  bodyEn: |
    Upon delivery of each deliverable the Client shall test it and either accept it or give written, reasonable grounds for rejection within 5 business days.

    A deliverable is deemed accepted if the Client does not respond within that period or uses it in production.

    The Provider shall correct, free of charge, material non-conformities with the agreed scope.
  bodyAr: |
    عند تسليم كل مخرَج، يفحصه العميل ويقبله أو يبدي كتابةً أسباباً معقولة للرفض خلال 5 أيام عمل.

    يُعدّ المخرَج مقبولاً إذا لم يرد العميل خلال هذه المدة أو استخدمه فعلياً في بيئة التشغيل.

    يصحّح المزوّد دون مقابل العيوب الجوهرية المخالفة للنطاق المتفق عليه.

- key: third_party_hosting
  titleEn: Third-Party Services and Hosting
  titleAr: خدمات الأطراف الثالثة والاستضافة
  bodyEn: |
    Domains, hosting, software subscriptions, API usage and other third-party services are not included in the fees unless stated in the Scope of Work.

    Where the Provider procures them on the Client's behalf, they are billed at cost and the related accounts remain the Client's property.
  bodyAr: |
    لا تشمل الأتعاب النطاقات والاستضافة واشتراكات البرمجيات واستهلاك واجهات البرمجة وسائر خدمات الأطراف الثالثة ما لم يرد ذلك في نطاق العمل.

    وإذا اشترى المزوّد شيئاً منها نيابةً عن العميل فيُفوتَر بالتكلفة الفعلية وتظل الحسابات المرتبطة به مملوكة للعميل.

- key: platform_terms
  titleEn: Third-Party Platforms
  titleAr: المنصات الخارجية
  bodyEn: |
    The deliverables may interact with third-party platforms and APIs. The Client is responsible for complying with those platforms' terms of use.

    The Provider is not responsible for changes, restrictions or suspensions imposed by third-party platforms that affect operation. Adapting the deliverables to such changes is subject to the Change Requests clause.
  bodyAr: |
    قد تتعامل المخرجات مع منصات وواجهات برمجة تابعة لأطراف ثالثة، ويلتزم العميل بشروط استخدام تلك المنصات.

    لا يتحمل المزوّد مسؤولية التغييرات أو القيود أو الإيقاف الذي تفرضه المنصات الخارجية وتتأثر به عملية التشغيل، ويخضع تكييف المخرجات مع هذه التغييرات لبند طلبات التغيير.

- key: lawful_use
  titleEn: Lawful Use
  titleAr: الاستخدام المشروع
  bodyEn: |
    The Client shall use the deliverables only for lawful purposes and shall not use them to infringe the rights of others, to send unsolicited messages in breach of law or platform rules, or to access any system without authorization.
  bodyAr: |
    يلتزم العميل باستخدام المخرجات في أغراض مشروعة فقط، وعدم استخدامها للتعدي على حقوق الغير أو إرسال رسائل غير مرغوب فيها بالمخالفة للقانون أو لقواعد المنصات أو الدخول إلى أي نظام دون تصريح.

- key: ip
  titleEn: Intellectual Property
  titleAr: الملكية الفكرية
  bodyEn: |
    Upon receipt of full payment, the Provider assigns to the Client ownership of the custom deliverables created specifically for the Client under this Agreement.

    The Provider retains ownership of its pre-existing tools, libraries, know-how and general methodologies, and grants the Client a non-exclusive, perpetual license to use them as embedded in the deliverables.

    Third-party and open-source components remain subject to their own licenses.

    The Provider may reference the project in its portfolio unless the Client objects in writing.
  bodyAr: |
    بعد سداد كامل الأتعاب، يتنازل المزوّد للعميل عن ملكية المخرجات المُنجزة خصيصاً له بموجب هذا العقد.

    يحتفظ المزوّد بملكية أدواته ومكتباته وخبراته ومنهجياته السابقة على العقد، ويمنح العميل ترخيصاً غير حصري ودائماً باستخدامها بالصورة المضمّنة في المخرجات.

    تظل المكوّنات الخاصة بأطراف ثالثة والمفتوحة المصدر خاضعة لتراخيصها.

    يجوز للمزوّد الإشارة إلى المشروع ضمن أعماله ما لم يعترض العميل كتابةً.

- key: confidentiality
  titleEn: Confidentiality
  titleAr: السرية
  bodyEn: |
    Each Party shall keep confidential all non-public information received from the other Party in connection with this Agreement, use it only to perform this Agreement, and disclose it only to personnel and advisers who need it and are bound by equivalent duties.

    This obligation does not apply to information that is public through no fault of the recipient, was already lawfully known to it, or must be disclosed by law or court order.

    It survives for 3 years after termination or expiry of this Agreement.
  bodyAr: |
    يلتزم كل طرف بالمحافظة على سرية المعلومات غير المعلنة التي يتلقاها من الطرف الآخر بشأن هذا العقد، وعدم استخدامها إلا لتنفيذه، وعدم الإفصاح عنها إلا لمن يحتاجها من العاملين والمستشارين الملزمين بواجبات مماثلة.

    لا ينطبق هذا الالتزام على المعلومات التي أصبحت عامة دون تقصير من المتلقي، أو كانت معلومة له بصورة مشروعة، أو وجب الإفصاح عنها بموجب القانون أو أمر قضائي.

    ويستمر هذا الالتزام 3 سنوات بعد انتهاء هذا العقد أو انقضائه.

- key: warranty_support
  titleEn: Warranty and Support
  titleAr: الضمان والدعم
  bodyEn: |
    For 30 days after final acceptance (the **Warranty Period**) the Provider shall fix, free of charge, defects that cause a deliverable to deviate materially from the agreed scope.

    The warranty excludes issues caused by modifications made by third parties, misuse, third-party services, or hosting changes.

    Support beyond the Warranty Period is available under a separate agreement.
  bodyAr: |
    خلال 30 يوماً من القبول النهائي («مدة الضمان») يصلح المزوّد مجاناً العيوب التي تجعل المخرَج مخالفاً بصورة جوهرية للنطاق المتفق عليه.

    يُستثنى من الضمان ما نتج عن تعديلات أجراها أطراف ثالثة، أو سوء الاستخدام، أو خدمات الأطراف الثالثة، أو تغيّر الاستضافة.

    يتاح الدعم بعد مدة الضمان بموجب اتفاق منفصل.

- key: liability
  titleEn: Limitation of Liability
  titleAr: حدود المسؤولية
  bodyEn: |
    To the maximum extent permitted by law, neither Party is liable for indirect or consequential loss, or for loss of profit, revenue or data.

    Each Party's total aggregate liability under this Agreement is limited to the fees paid or payable under it.

    Nothing in this clause limits liability that cannot be limited by law.
  bodyAr: |
    إلى أقصى حد يسمح به القانون، لا يتحمل أي من الطرفين مسؤولية عن الخسائر غير المباشرة أو التبعية، ولا عن فقدان الأرباح أو الإيرادات أو البيانات.

    يُحدّ إجمالي مسؤولية كل طرف بموجب هذا العقد بقيمة الأتعاب المدفوعة أو المستحقة بموجبه.

    لا يُحدّ هذا البند أي مسؤولية لا يجوز تحديدها قانوناً.

- key: termination
  titleEn: Termination
  titleAr: إنهاء العقد
  bodyEn: |
    Either Party may terminate this Agreement by written notice if the other Party materially breaches it and does not remedy the breach within 14 days of written notice.

    The Client may terminate without cause on 14 days' written notice, paying for all work performed up to the termination date and any non-cancellable costs.

    On termination the Provider shall deliver the work completed to date, subject to payment.
  bodyAr: |
    يجوز لأي طرف إنهاء هذا العقد بإشعار كتابي إذا أخلّ الطرف الآخر إخلالاً جوهرياً ولم يعالج الإخلال خلال 14 يوماً من إشعاره كتابةً.

    يجوز للعميل الإنهاء دون سبب بإشعار كتابي مدته 14 يوماً، مع سداد قيمة الأعمال المنفّذة حتى تاريخ الإنهاء وأي تكاليف غير قابلة للإلغاء.

    عند الإنهاء يسلّم المزوّد الأعمال المنجزة حتى ذلك التاريخ، مقابل سداد المستحقات.

- key: force_majeure
  titleEn: Force Majeure
  titleAr: القوة القاهرة
  bodyEn: |
    Neither Party is liable for delay or failure caused by events beyond its reasonable control, such as natural disasters, war, government action, or network and utility outages.

    The affected Party shall notify the other promptly and use reasonable efforts to resume performance. If the event lasts more than 60 days, either Party may terminate by written notice.
  bodyAr: |
    لا يُسأل أي طرف عن التأخر أو الإخفاق الناتج عن أحداث خارجة عن إرادته المعقولة، كالكوارث الطبيعية والحروب والقرارات الحكومية وانقطاع الشبكات أو المرافق.

    يُخطر الطرف المتأثر الآخر فوراً ويبذل جهداً معقولاً لاستئناف التنفيذ. وإذا استمر الحدث أكثر من 60 يوماً جاز لأي طرف الإنهاء بإشعار كتابي.

- key: governing_law
  titleEn: Governing Law and Disputes
  titleAr: القانون الواجب التطبيق وتسوية النزاعات
  bodyEn: |
    This Agreement is governed by the laws of **{{contract.governing_law}}**.

    The Parties shall first try to resolve any dispute amicably; failing that, the competent courts of **{{contract.jurisdiction}}** have jurisdiction.
  bodyAr: |
    يخضع هذا العقد لأحكام **{{contract.governing_law}}**.

    يسعى الطرفان أولاً إلى تسوية أي نزاع وديّاً، وإن تعذّر ذلك فيكون الاختصاص للمحاكم المختصة في **{{contract.jurisdiction}}**.

- key: notices
  titleEn: Notices
  titleAr: الإشعارات
  bodyEn: |
    Notices under this Agreement must be in writing and sent to the email addresses stated in this Agreement ({{provider.email}} for the Provider and {{client.email}} for the Client), or to any other address notified in writing.

    Notices sent by email are deemed received on the next business day.
  bodyAr: |
    تكون الإشعارات المتعلقة بهذا العقد كتابية وتُرسل إلى البريد الإلكتروني المبيّن في هذا العقد ({{provider.email}} للمزوّد و{{client.email}} للعميل) أو إلى أي عنوان آخر يُخطر به كتابةً.

    تُعدّ الإشعارات المرسلة بالبريد الإلكتروني مستلمة في يوم العمل التالي.

- key: entire_agreement
  titleEn: Entire Agreement and Amendments
  titleAr: الاتفاق الكامل والتعديل
  bodyEn: |
    This Agreement is the entire agreement between the Parties on its subject and supersedes all prior discussions.

    It may be amended only in writing signed by both Parties.

    If any provision is held invalid, the remaining provisions stay in force. Neither Party may assign this Agreement without the other's written consent.
  bodyAr: |
    يمثّل هذا العقد الاتفاق الكامل بين الطرفين بشأن موضوعه ويحلّ محل كل ما سبقه من مناقشات.

    لا يجوز تعديله إلا كتابةً بتوقيع الطرفين.

    إذا ثبت بطلان أي حكم منه بقيت سائر الأحكام نافذة، ولا يجوز لأي طرف التنازل عن هذا العقد دون موافقة كتابية من الطرف الآخر.

- key: electronic_signature
  titleEn: Electronic Signature and Counterparts
  titleAr: التوقيع الإلكتروني وتعدد النسخ
  bodyEn: |
    The Parties agree that this Agreement may be executed electronically, and that electronic signatures together with the signing evidence recorded by the platform (timestamps, IP address and email verification) have the same effect as handwritten signatures to the extent permitted by applicable law.

    This Agreement may be signed in counterparts.
  bodyAr: |
    يتفق الطرفان على جواز إبرام هذا العقد إلكترونياً، وعلى أن التوقيعات الإلكترونية مع أدلة التوقيع التي تسجّلها المنصة (الأوقات وعنوان IP والتحقق عبر البريد الإلكتروني) لها ذات أثر التوقيع بخط اليد بالقدر الذي يسمح به القانون المعمول به.

    يجوز توقيع هذا العقد على نسخ متعددة.

- key: signatures
  titleEn: Signatures
  titleAr: التوقيعات
  bodyEn: |
    {{block.signatures}}
  bodyAr: |
    {{block.signatures}}

# ── maintenance-specific ──
- key: maint_services
  titleEn: Maintenance and Support Services
  titleAr: خدمات الصيانة والدعم
  bodyEn: |
    The Provider shall provide ongoing maintenance and support for the following systems (the **Systems**):

    > {{contract.scope}}

    The Services include bug fixes, security updates, minor adjustments, and technical support through the channels agreed by the Parties.

    New features and major changes are outside the fixed fees and are quoted separately under the Change Requests clause.
  bodyAr: |
    يقدّم المزوّد خدمات الصيانة والدعم المستمرة للأنظمة التالية («الأنظمة»):

    > {{contract.scope}}

    تشمل الخدمات إصلاح الأخطاء والتحديثات الأمنية والتعديلات الطفيفة والدعم الفني عبر القنوات المتفق عليها بين الطرفين.

    تُعدّ الميزات الجديدة والتغييرات الكبيرة خارج الأتعاب الثابتة وتُسعَّر منفصلةً وفق بند طلبات التغيير.

- key: sla
  titleEn: Service Levels
  titleAr: مستويات الخدمة
  bodyEn: |
    Support requests are acknowledged within 1 business day. For critical issues (a system being unavailable) the target first response time is 4 business hours.

    Business hours are those notified by the Provider to the Client. Response targets are commitments of effort and do not guarantee resolution times.
  bodyAr: |
    يُقرّ المزوّد باستلام طلبات الدعم خلال يوم عمل واحد، ويكون زمن الاستجابة الأولى المستهدف للحالات الحرجة (تعطّل النظام) 4 ساعات عمل.

    ساعات العمل هي التي يُبلغ بها المزوّد العميل. وتمثّل أهداف الاستجابة التزاماً ببذل العناية ولا تضمن مدد الحل.

# ── NDA-specific ──
- key: nda_purpose
  titleEn: Purpose
  titleAr: الغرض
  bodyEn: |
    The Parties wish to discuss and evaluate **{{project.name}}** (the **Purpose**) and, for that purpose, may disclose Confidential Information to each other.
  bodyAr: |
    يرغب الطرفان في بحث وتقييم **{{project.name}}** («الغرض») وقد يفصح كل منهما للآخر عن معلومات سرية لهذا الغرض.

- key: nda_definition
  titleEn: Confidential Information
  titleAr: المعلومات السرية
  bodyEn: |
    **Confidential Information** means all non-public information, in any form, disclosed by or on behalf of a Party (the **Disclosing Party**) to the other Party (the **Receiving Party**) in connection with the Purpose, including business plans, source code, designs, data, pricing, customer information and technical know-how, whether or not marked confidential.
  bodyAr: |
    «المعلومات السرية» هي جميع المعلومات غير المعلنة، بأي شكل، التي يفصح عنها طرف («الطرف المُفصح») أو من ينوب عنه للطرف الآخر («الطرف المتلقي») بشأن الغرض، بما في ذلك الخطط التجارية والشيفرة المصدرية والتصاميم والبيانات والأسعار ومعلومات العملاء والخبرات التقنية، سواء وُسمت بالسرية أم لا.

- key: nda_obligations
  titleEn: Obligations of the Receiving Party
  titleAr: التزامات الطرف المتلقي
  bodyEn: |
    The Receiving Party shall:

    - use the Confidential Information solely for the Purpose;
    - not disclose it to any third party except to its employees and advisers who need to know it and are bound by equivalent confidentiality duties;
    - protect it with at least the care it uses for its own confidential information, and never less than reasonable care.
  bodyAr: |
    يلتزم الطرف المتلقي بما يلي:

    - استخدام المعلومات السرية للغرض وحده؛
    - عدم الإفصاح عنها لأي طرف ثالث إلا للعاملين والمستشارين الذين يحتاجون إلى معرفتها والملزمين بواجبات سرية مماثلة؛
    - حمايتها بعناية لا تقل عن عنايته بمعلوماته السرية الخاصة، ولا تقل بأي حال عن العناية المعقولة.

- key: nda_exclusions
  titleEn: Exclusions
  titleAr: الاستثناءات
  bodyEn: |
    These obligations do not apply to information that:

    - is or becomes public through no breach by the Receiving Party;
    - was lawfully known to the Receiving Party before disclosure;
    - is lawfully received from a third party without restriction;
    - is independently developed without use of the Confidential Information.

    The Receiving Party may disclose Confidential Information if required by law or court order, after giving the Disclosing Party prompt notice where lawful.
  bodyAr: |
    لا تنطبق هذه الالتزامات على المعلومات التي:

    - أصبحت عامة دون إخلال من الطرف المتلقي؛
    - كانت معلومة للطرف المتلقي بصورة مشروعة قبل الإفصاح؛
    - تلقاها من طرف ثالث بصورة مشروعة ودون قيود؛
    - طوّرها بصورة مستقلة دون استخدام المعلومات السرية.

    يجوز للطرف المتلقي الإفصاح عن المعلومات السرية إذا اقتضى القانون أو أمر قضائي ذلك، بعد إخطار الطرف المُفصح فوراً متى كان ذلك جائزاً قانوناً.

- key: nda_term
  titleEn: Term
  titleAr: المدة
  bodyEn: |
    This Agreement applies to disclosures made from **{{contract.start_date}}** until **{{contract.end_date}}**.

    The confidentiality obligations continue for 3 years after that end date and, for trade secrets, for as long as they remain trade secrets.
  bodyAr: |
    ينطبق هذا العقد على الإفصاحات التي تتم اعتباراً من **{{contract.start_date}}** حتى **{{contract.end_date}}**.

    تستمر التزامات السرية 3 سنوات بعد تاريخ الانتهاء المذكور، وبالنسبة للأسرار التجارية طوال مدة بقائها أسراراً تجارية.

- key: nda_return
  titleEn: Return or Destruction
  titleAr: الإعادة أو الإتلاف
  bodyEn: |
    On written request, and in any event when the Purpose ends, the Receiving Party shall promptly return or securely destroy all Confidential Information and confirm in writing that it has done so.

    Copies that must be kept by law or that sit in routine backups remain subject to this Agreement.
  bodyAr: |
    بناءً على طلب كتابي، وفي جميع الأحوال عند انتهاء الغرض، يعيد الطرف المتلقي جميع المعلومات السرية أو يتلفها بصورة آمنة فوراً ويؤكد ذلك كتابةً.

    تظل النسخ التي يجب الاحتفاظ بها بموجب القانون أو الموجودة في النسخ الاحتياطية الاعتيادية خاضعة لهذا العقد.

- key: nda_remedies
  titleEn: Remedies
  titleAr: سبل الانتصاف
  bodyEn: |
    Each Party acknowledges that a breach of this Agreement may cause irreparable harm for which damages alone may be inadequate, and that the Disclosing Party may seek injunctive relief in addition to any other remedy available by law.
  bodyAr: |
    يُقرّ كل طرف بأن الإخلال بهذا العقد قد يسبب ضرراً جسيماً لا يكفي التعويض وحده لجبره، وبأن للطرف المُفصح طلب التدابير التحفظية أو الوقتية إضافةً إلى سائر سبل الانتصاف المتاحة قانوناً.
```

### 11.7.2 Template definitions

| key | type | nameEn / nameAr | defaults | clause order (keys) |
|---|---|---|---|---|
| `web-development` | contract | Website / Web Application Development Agreement / عقد تطوير موقع أو تطبيق ويب | `hasFees:true`, `paymentTermsDays:14`, preset percent: 4000 "Advance upon signing / دفعة مقدّمة عند التوقيع" (trigger: "Upon signing / عند التوقيع"), 3000 "On delivery of the staging version / عند تسليم النسخة التجريبية", 3000 "On final delivery and acceptance / عند التسليم النهائي والقبول" | parties, purpose, scope, fees, timeline, client_obligations, provider_obligations, change_requests, acceptance, third_party_hosting, ip, confidentiality, warranty_support, liability, termination, force_majeure, governing_law, notices, entire_agreement, electronic_signature, signatures |
| `automation-bot-development` | contract | Bot & Automation Development Agreement / عقد تطوير بوت وأتمتة | `hasFees:true`, `paymentTermsDays:14`, preset percent: 5000 "Advance upon signing / دفعة مقدّمة عند التوقيع", 5000 "On delivery and acceptance / عند التسليم والقبول" | parties, purpose, scope, fees, timeline, client_obligations, provider_obligations, change_requests, acceptance, platform_terms, lawful_use, ip, confidentiality, warranty_support, liability, termination, force_majeure, governing_law, notices, entire_agreement, electronic_signature, signatures |
| `maintenance-support` | contract | Maintenance & Support Agreement / عقد صيانة ودعم فني | `hasFees:true`, `paymentTermsDays:7`, preset percent: 4 rows × 2500 "Quarter 1 fee / رسوم الربع الأول" … "Quarter 4 fee / رسوم الربع الرابع" | parties, purpose, maint_services, sla, fees, timeline, client_obligations, provider_obligations, change_requests, ip, confidentiality, liability, termination, force_majeure, governing_law, notices, entire_agreement, electronic_signature, signatures |
| `nda` | nda | Mutual Non-Disclosure Agreement / اتفاقية عدم إفصاح متبادلة | `hasFees:false` | parties, nda_purpose, nda_definition, nda_obligations, nda_exclusions, nda_term, nda_return, nda_remedies, governing_law, notices, entire_agreement, electronic_signature, signatures |

All four: `defaultLanguageMode: 'bilingual'`, `isSystem: true`. Default contract titles: web → EN "Website / Web Application Development Agreement", AR "عقد تطوير موقع أو تطبيق ويب"; the other three analogously from their names.

Notes for the implementer:
- Maintenance uses a fixed term (the contract `endDate`) with quarterly milestones because recurring invoices are out of scope (1.5).
- The `{{contract.governing_law}}` / `{{contract.jurisdiction}}` variables are intentionally left **empty by default** unless the Settings defaults provide them, so a contract cannot be sent without the team consciously choosing them (send validation, 7.5 rule 6).
- The provider's signatory name/title is a single string per person (no AR/EN split). In bilingual documents the same string prints in both columns; users may type "Name / الاسم" if they want both. Splitting is a Phase 5 improvement.

---
# 12. PDF engine

## 12.1 Architecture

```
snapshot (contract) | invoice row + snapshots
        │  pure TS functions, no I/O except image/font lookups passed in
        ▼
renderContractHtml(input, opts): string      renderInvoiceHtml(input, opts): string
        │
        ▼
renderPdf(html, footerMeta): Promise<Buffer>   // Playwright/Chromium
        │
        ├── draft/preview → returned to the browser (inline)
        └── sealed contract → saved via files service (kind 'contract_pdf')
```
Files: `src/server/pdf/{fonts.ts,browser.ts,render.ts,qr.ts}` and `src/server/pdf/html/{shared.ts,contract.ts,invoice.ts,certificate.ts}`.

HTML builders are **pure string functions** (no JSX, no `react-dom/server`). Every dynamic string passes through `esc()`:

```ts
export const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
```

Builders take **already-resolved data** (images as data URIs, QR as data URI, font CSS string) so they stay deterministic and unit-testable (snapshot tests with a fixed fixture).

## 12.2 Browser and rendering (`browser.ts`, `render.ts`)

```ts
import { chromium, type Browser } from 'playwright';

let browserPromise: Promise<Browser> | null = null;
async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
    const b = await browserPromise;
    b.on('disconnected', () => { browserPromise = null; });
    return b;
  }
  return browserPromise;
}
```
- A tiny semaphore limits concurrent renders to `PDF_CONCURRENCY` (default 2). Waiting longer than `PDF_TIMEOUT_MS` → `AppError('PDF_FAILED')`.
- Per render: `const ctx = await browser.newContext({ javaScriptEnabled: false })`, `const page = await ctx.newPage()`, `await page.route('**/*', r => r.abort())` (data URLs are not intercepted — **VERIFY** with a test that an `<img src="data:...">` still renders), `await page.setContent(html, { waitUntil: 'load', timeout })`, then:

```ts
const pdf = await page.pdf({
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: '<span></span>',
  footerTemplate: buildFooterTemplate(meta),
  margin: { top: '18mm', bottom: '20mm', left: '16mm', right: '16mm' },
});
await ctx.close();   // in finally
```
- **VERIFY**: page numbers (`pageNumber`/`totalPages` spans) render with `javaScriptEnabled:false`. If they do not, set `javaScriptEnabled: true` — this is acceptable only because (a) our HTML never contains `<script>`, (b) all text is escaped, (c) all network is blocked. Record the outcome in `PROGRESS.md`.
- Footer template (Latin characters and digits only, because footer templates do not inherit page fonts):

```ts
const buildFooterTemplate = (m: { docNumber: string; code: string | null }) => `
<div style="font-size:8px;width:100%;padding:0 16mm;display:flex;justify-content:space-between;direction:ltr;color:#666;font-family:Arial,sans-serif;">
  <span>${esc(m.docNumber)}</span>
  <span>${m.code ? esc(formatCode(m.code)) : ''}</span>
  <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
</div>`;
```
- Graceful shutdown: on `SIGTERM` close the browser.

## 12.3 Fonts (`fonts.ts`)

- Put **Cairo** (SIL OFL 1.1) in `assets/fonts/`: preferred a variable TTF named `Cairo.ttf` (weights 200–1000) from https://fonts.google.com/specimen/Cairo ("Get font" → download family → `Cairo-VariableFont_wght.ttf`, renamed), plus `OFL.txt`. If only static files are available use `Cairo-Regular.ttf` (400), `Cairo-SemiBold.ttf` (600), `Cairo-Bold.ttf` (700) and three `@font-face` rules.
- `getFontCss()` reads the file(s) **once**, base64-encodes, caches in a module variable and returns:
```css
@font-face { font-family: 'DossierSans'; src: url(data:font/ttf;base64,AAAA…) format('truetype'); font-weight: 200 1000; font-style: normal; }
```
- All document CSS uses `font-family: 'DossierSans', 'Noto Naskh Arabic', 'Noto Sans', Arial, sans-serif;`.
- The Docker image also installs system fonts (`fonts-noto-core`) as a last-resort fallback.

## 12.4 Layout rules

Base CSS (inline in a `<style>`, normative values):
```css
@page { size: A4; }
html { font-family: 'DossierSans', Arial, sans-serif; font-size: 10.5pt; color: #111; }
body { margin: 0; line-height: 1.6; }
[lang="ar"], .ar { line-height: 1.85; }
h1 { font-size: 18pt; margin: 0 0 4mm; } h2.clause { font-size: 11.5pt; margin: 6mm 0 2mm; break-after: avoid; color: #7f1d1d; }
p { margin: 0 0 2.2mm; orphans: 3; widows: 3; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 0.3mm solid #d9d9de; padding: 1.6mm 2mm; vertical-align: top; }
thead { display: table-header-group; } tr { break-inside: avoid; }
.num { font-variant-numeric: tabular-nums; direction: ltr; unicode-bidi: isolate; text-align: end; }
.watermark { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 110px; font-weight: 800; color: rgba(0,0,0,.07); transform: rotate(-30deg); pointer-events: none; }
```
Colors: text `#111`, muted `#555`, accent `#B91C1C`, borders `#D9D9DE`. PDFs are always light.

**Language modes**
- `ar`: `<html lang="ar" dir="rtl">`; everything RTL.
- `en`: `<html lang="en" dir="ltr">`.
- `bilingual`: `<html dir="ltr">`; header two columns (EN left, AR right). Each clause is rendered as **rows**: a heading row (EN heading cell `dir=ltr` | AR heading cell `dir=rtl`), then for each *segment* (the body split at special blocks) a two-cell row (EN segment | AR segment); each special block is rendered **once, full width**, with bilingual headers (e.g. `Description / الوصف`). Column widths 50/50 with a thin vertical divider. Table rows are allowed to split across pages (`tr { break-inside: auto }` for the clause rows; keep `break-inside: avoid` for table rows inside special blocks).
- Numbers inside tables: `<span class="num">` with Western digits.

**Page 1 header**: logo (max height 14mm) + company name(s) on one side; contract title (h1) and a meta table: Number, Date (`contract.issueDate`), Version (only if > 1), Project (name + code), on the other. Draft: show watermark `DRAFT / مسودة` and no number if null.

**Signatures block**: table with two cells (Provider / Client). Unsigned: blank line 20mm tall. Signed: signature image (`max-height: 18mm`), typed signatures render the typed name in italic. Under it: name, title, and `Signed electronically on {date} {HH:mm} UTC`.

## 12.5 Contract HTML builder contract

```ts
export type ContractHtmlInput = {
  snapshot: ContractSnapshotV1;
  lang: 'ar' | 'en' | 'bilingual';            // must be allowed by snapshot.contract.languageMode (bilingual contracts may also export ar-only or en-only views)
  mode: 'draft' | 'preview' | 'unsigned' | 'sealed';
  fonts: string; logoDataUri: string | null; stampDataUri: string | null;
  signatures: { role: 'provider'|'client'; name: string; title: string|null; signedAtMs: number|null; method: 'drawn'|'typed'|null; imageDataUri: string|null; typedName: string|null }[];
  verification: { code: string; url: string; qrDataUri: string } | null;   // sealed only
  certificate: CertificateData | null;                                   // sealed only
};
export function renderContractHtml(i: ContractHtmlInput): string;
```
- `draft`: watermark "DRAFT / مسودة". `preview`: same as draft but used in the builder. `unsigned`: sent version shown to the client before signing (footer note "UNSIGNED / غير موقّع", no watermark). `sealed`: includes signatures, verification block (QR + code + hash) at the end of the signature page and the certificate page.
- The stamp image (company stamp) is placed near the provider signature when present.
- The `contentHash` is printed (monospace, small) on the certificate page and in the verification block as `SHA-256: <hex>`.

## 12.6 Invoice HTML builder contract

```ts
export type InvoiceHtmlInput = {
  invoice: InvoiceRowWithLines; seller: SellerSnapshot; buyer: BuyerSnapshot;
  lang: 'ar'|'en'|'bilingual'; status: InvoiceStatus; isOverdue: boolean;
  payments: { paidOn: string; amountMinor: number; method: string; reference: string|null; voided: boolean }[];
  fonts: string; logoDataUri: string|null; verification: { code: string; url: string; qrDataUri: string } | null;
};
```
Layout (top to bottom): seller header (logo, names, CR no., tax no., address, email, phone) · title `Invoice / فاتورة` + number · meta (issue date, due date, project name+code, contract number if linked) · "Bill to" card (buyer) · lines table (`# | Description | Qty | Unit price | Total`; description cell shows EN line then AR line in bilingual mode) · totals (Subtotal, Discount if > 0, Net, Tax `x%` if tax > 0, **Total**, then Paid (sum of non-voided payments) and **Balance due** if any paid) · payment instructions (bank details) · notes · QR + verification code + line "Invoice generated by Dossier" (never "tax invoice").
Watermarks: draft → `DRAFT / مسودة`; void → `VOID / ملغاة`; paid → green stamp `PAID / مدفوعة` (not a watermark; a bordered stamp near totals). Overdue shows a red "OVERDUE / متأخرة" tag next to the due date (UI/PDF generated after the fact; the stored snapshot is unchanged).
Currency amounts print as `1,234.50 SAR` (Western digits, `<span class="num">`).

## 12.7 Certificate of completion (`certificate.ts`)

Appended to the sealed contract (`break-before: page`). Content (bilingual per contract mode):
1. Title "Certificate of Completion / شهادة إتمام التوقيع".
2. Contract number, title, version, project code.
3. Verification: code (grouped), verification URL, QR, `SHA-256 (content)` hash.
4. Table of signatories: role, name, title, email, method (drawn/typed), signed at (UTC `YYYY-MM-DD HH:mm:ss` and business-timezone time), IP address, email-OTP verified (Yes/No), user agent (truncated to 120 chars).
5. Statement: "This certificate summarizes the evidence recorded by Dossier when this document was signed electronically. The document hash above covers the exact content that was signed."
6. Generated-at timestamp (UTC).

## 12.8 QR and images
- QR: `QRCode.toString(url, { type: 'svg', margin: 0, errorCorrectionLevel: 'M' })` → base64 data URI (`data:image/svg+xml;base64,…`). URL = `${APP_URL}/v/${code}` (the code without dashes).
- `loadImageDataUri(fileId)` reads from the files service and returns `data:<mime>;base64,<…>`; missing file → `null` (and a logged warning), never a crash.

## 12.9 HTTP endpoints for PDFs
- `GET /api/contracts/[id]/pdf?lang=ar|en|bilingual&inline=1` — auth + `contracts.read`. If a sealed file exists and `lang` is the contract's own mode → stream the sealed file. Otherwise render from the snapshot (`unsigned`) or live data (`draft`). `lang` must be compatible with `languageMode` (`ar`-only contracts cannot export `en`).
- `GET /api/invoices/[id]/pdf?lang=…&inline=1` — auth + `invoices.read`.
- `GET /s/[token]/pdf` — public, token-validated, `mode: 'unsigned'`.
- Response headers: `Content-Type: application/pdf`, `Content-Disposition: inline|attachment; filename="<safe>.pdf"` where safe = `[A-Za-z0-9._-]` only (number or `draft`, plus lang), `Cache-Control: private, no-store`, `X-Content-Type-Options: nosniff`.

## 12.10 Performance & robustness
- Target < 5 s per document. Do not render PDFs inside DB transactions (R12).
- If Chromium is missing/crashes: reset `browserPromise`, one automatic retry, then `PDF_FAILED`.
- Large clause text must not break layout: `overflow-wrap: anywhere` on table cells and paragraphs.

---

# 13. Pages and routes

Route groups: `(auth)` public auth pages; `(app)` authenticated app (layout calls `requireUser()` and renders the shell); public pages outside groups. **Every page file also calls `requireUser()` + `assertCan` itself** (R9).

| Path | Access | Purpose / content |
|---|---|---|
| `/login` | public | Email + password form; rate-limit message; redirects to `/` when already logged in |
| `/` | any user | Dashboard (7.12) |
| `/account` | any user | Own name, locale, theme, password change; if `canSignForCompany`: default signature title AR/EN |
| `/clients` | clients.read | List + filters (`q`, archived toggle) |
| `/clients/new`, `/clients/[id]/edit` | clients.write | Client form (bilingual fields) |
| `/clients/[id]` | clients.read | Details, projects list, contracts & invoices of the client |
| `/projects` | projects.read | List + filters (`q`, `status`, client) |
| `/projects/new`, `/projects/[id]/edit` | projects.write | Project form |
| `/projects/[id]` | projects.read | **The dossier**: tabs Overview (client, status, financial summary 7.11, milestones to invoice) · Contracts · Invoices · Files (upload/list attachments) · Activity (audit rows for the project and its documents) |
| `/contracts` | contracts.read | List + filters (`q`, `status`, project) |
| `/contracts/new` | contracts.write | Choose project + template → creates draft and redirects to builder |
| `/contracts/[id]` | contracts.read | Detail: status header, actions per status, tabs Summary · Document (preview iframe + PDF download per language) · Signatures · History (versions + audit) |
| `/contracts/[id]/edit` | contracts.write | **Builder** (draft only): steps Basics → Pricing → Payment schedule → Clauses → Review & Send |
| `/invoices` | invoices.read | List + filters (`q`, `status` incl. derived `overdue`, project, date range) |
| `/invoices/new` | invoices.write | Standalone (`?projectId=`) or from milestone (`?milestoneId=`) |
| `/invoices/[id]` | invoices.read | Detail: lines, totals, payments list, actions (issue, send, record payment, void), PDF preview |
| `/invoices/[id]/edit` | invoices.write | Draft editor |
| `/templates`, `/templates/[id]` | templates.read | List / read-only view with preview |
| `/templates/new`, `/templates/[id]/edit` | templates.write | Editor (11.6) |
| `/settings` → `/settings/company` | settings.read/write | Company profile (AR/EN), logo & stamp upload, bank details |
| `/settings/defaults` | settings.* | currency, timezone, tax rate, payment terms, governing law/jurisdiction (AR/EN), default language mode |
| `/settings/numbering` | settings.* | prefix (shows next numbers preview) |
| `/settings/signing` | settings.* | link TTL days, require OTP, require provider signature before send, consent texts AR/EN |
| `/settings/email` | settings.* | from name, overdue reminders toggle & day offsets, "Send test email", worker heartbeat status |
| `/users`, `/users/new`, `/users/[id]` | users.manage | Manage users/roles/status/`canSignForCompany` |
| `/audit` | audit.read | Filterable audit log (entity type, entity id, action, date range) |
| `/s/[token]` | public (token) | Signing experience (7.7) |
| `/s/[token]/pdf` | public (token) | Unsigned PDF |
| `/v/[code]` | public | Verification result (7.10) |
| `/verify` | public | Code input + optional PDF upload check |
| `/api/health` | public | `{"ok":true}` after `SELECT 1` |
| `/api/contracts/[id]/pdf`, `/api/invoices/[id]/pdf`, `/api/files/[id]` | auth | Downloads (12.9, 15.3) |

**Builder behavior**
1. *Basics*: project (locked after creation), template (read-only after creation), language mode, `hasFees` switch, titles (AR/EN), scope (AR/EN textareas), start/end dates, signing deadline, payment terms days, governing law & jurisdiction (AR/EN), internal notes.
2. *Pricing* (only if `hasFees`): items table (description AR/EN, qty, unit price, line total computed), discount (none/percent/fixed), tax rate %, live totals via the same `calcTotals` (imported from the server module through a **server action** `previewTotals`, never duplicated client-side).
3. *Payment schedule* (only if `hasFees`): mode switch, rows (title AR/EN, percent or amount, due date, trigger note), live sums, "Reset to template preset".
4. *Clauses*: list with up/down/delete/add-blank/duplicate; edit AR/EN title+body; "Preview with data" modal.
5. *Review & Send*: validation issues (7.5) grouped error/warning with jump links; PDF preview iframe with language tabs; **Send dialog**: provider signer (select among eligible users, default self) + signature pad/typed + consent checkbox; client signatory name/title/email; submit → `sendContract`.
Each step saves through its own server action; navigating steps never loses data.

**Contract detail actions by status**: draft → Edit, Delete (if never numbered), Cancel; sent → Preview unsigned, Resend link (regenerates token), Copy fresh link (dialog showing URL once), Sign as company (if pending), Revise, Cancel; declined/expired → Revise, Cancel; signed → Download sealed PDF, Retry PDF (if missing), Create invoice per milestone, Complete, Terminate (owner); completed/terminated/cancelled → read-only.

---

# 14. Services and server actions (exact contracts)

## 14.1 Server action wrapper (`src/server/actions/_run.ts`)

```ts
export async function runAction<T>(fn: () => Promise<T> | T): Promise<ActionResult<T>> {
  try { return { ok: true, data: await fn() }; }
  catch (e) {
    if (e instanceof AppError) return { ok: false, error: { code: e.code, message: e.message, fieldErrors: e.fieldErrors } };
    if (e instanceof ZodError) return { ok: false, error: { code: 'VALIDATION_FAILED', message: 'Invalid input', fieldErrors: zodToFieldErrors(e) } };
    logger.error('action_failed', { err: safeErr(e) });          // no secrets
    return { ok: false, error: { code: 'INTERNAL', message: 'Unexpected error' } };
  }
}
```
Zod schemas use **i18n keys as messages** (`z.string().min(1, 'errors.required')`). `zodToFieldErrors` maps `issue.path.join('.')` → `issue.message`.

Action file template (every action follows it):
```ts
'use server';
export async function createClientAction(raw: unknown): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const user = await requireUser();
    assertCan(user, 'clients.write');
    const input = createClientSchema.parse(raw);
    const meta = await getRequestMeta();                 // { ip, userAgent }
    const id = clientsService.create(user, input, meta);
    revalidatePath('/clients');
    return { id };
  });
}
```

## 14.2 Cross-cutting services
- `audit(tx, { actorType, actorId, action, entityType, entityId, meta?, ip?, userAgent? })` — called **inside** the same transaction as the change.
- `getRequestMeta()` — `ip` from `x-real-ip`, `userAgent` from `user-agent` truncated to 300 chars.
- `requireUser()` — reads cookie, validates session (9.2), returns `{ id, email, name, role, locale, canSignForCompany, ... }` or throws `UNAUTHENTICATED` (pages redirect to `/login`).

## 14.3 Operations catalogue

Legend: **P** = permission, **A** = audit action, **E** = notable errors. Inputs are Zod schemas in `src/lib/validation/<domain>.ts`.

**auth / account**
| Fn | P | Notes |
|---|---|---|
| `login(email, password)` | public | rate-limited (9.3); creates session; `A: auth.login` / `auth.login_failed` |
| `logout()` | user | deletes session |
| `changePassword(current, next)` | user | verifies current; deletes other sessions; `A: auth.password_changed` |
| `updateAccount({name, locale, signerTitleAr, signerTitleEn})` | user | |
| `setLocale(locale)`, `setTheme(theme)` | user/public | cookies |

**users** — `createUser`, `updateUser`, `setUserStatus`, `setUserPassword` (owner sets a new password directly) · P `users.manage` · guard: last active owner (8) · A `user.created|updated|status_changed|password_reset`.

**clients** — `createClient`, `updateClient`, `archiveClient`, `unarchiveClient`, `listClients`, `getClient` · P `clients.read/write` · rule: at least one of `nameAr/nameEn`; email format; `country` ISO-2 uppercase · A `client.created|updated|archived`. Archiving a client with non-archived projects → allowed (projects keep working) but the client disappears from pickers.

**projects** — `createProject` (allocates `P-NNNN`), `updateProject`, `setProjectStatus`, `archiveProject`, `listProjects`, `getProjectDossier` · rule: currency ∈ CURRENCIES; at least one name; dates valid, `endDate >= startDate` · A `project.created|updated|status_changed|archived`.

**templates** — `listTemplates`, `getTemplate`, `createTemplate`, `updateTemplate`, `saveTemplateClauses(templateId, clauses[])` (replace-all in one tx, validated per 11.6), `duplicateTemplate`, `archiveTemplate` · P `templates.read/write` · E: editing system template → `FORBIDDEN` · A `template.created|updated|duplicated|archived`.

**contracts** (all draft-mutations require status `draft`, else `INVALID_STATE`)
| Fn | P | Behavior |
|---|---|---|
| `createContractFromTemplate({projectId, templateId})` | contracts.write | Copies clauses, defaults (11.5) and settings defaults; client = project's client; `languageMode` = template default; currency = project's currency; returns id. `A: contract.created` |
| `updateContractBasics(id, input)` | contracts.write | fields in builder step 1 |
| `saveContractItems(id, {items, discount, taxRateBp})` | contracts.write | recomputes totals with `calcTotals`, then **re-plans milestones** (7.3) preserving row titles/modes where possible |
| `saveMilestones(id, {mode, rows})` | contracts.write | validates (7.3) and rewrites rows |
| `saveClauses(id, clauses[])` | contracts.write | replace-all (positions 1..n) validated like 11.6 |
| `previewTotals(input)` | contracts.write | pure, no DB write |
| `validateContract(id)` | contracts.read | returns `Issue[]` (7.5) |
| `getContractPreviewHtml(id, lang)` | contracts.read | HTML string for `<iframe sandbox srcDoc>` |
| `sendContract(input)` | contracts.send (+ `contracts.sign_provider` when provider signs now) | 7.4 |
| `signAsProvider(contractId, signature)` | contracts.sign_provider | 7.4 |
| `regenerateSigningLink(contractId)` | contracts.send | new token for the client signatory (old invalid), returns URL once, optionally emails it; `A: contract.link_regenerated` |
| `reviseContract(id)` | contracts.write | 7.4 |
| `cancelContract(id, reason?)` | contracts.cancel | |
| `completeContract(id)` | contracts.write | |
| `terminateContract(id, reason)` | contracts.terminate | |
| `retryFinalize(id)` | contracts.write | re-runs `generateSealedPdf` |
| `deleteDraftContract(id)` | contracts.write | only never-numbered drafts |
| `listContracts`, `getContract` | contracts.read | |

**signing (public, token-based; no session)** — `getSigningContext(token)`, `requestSigningOtp(token)`, `verifySigningOtp(token, code)`, `submitClientSignature(token, input)`, `declineContract(token, reason?)` · E: `TOKEN_INVALID`, `TOKEN_EXPIRED`, `OTP_INVALID`, `OTP_EXPIRED`, `RATE_LIMITED` · A (`actorType:'signer'`) `contract.viewed|otp_sent|otp_verified|signed|declined`.

**invoices**
| Fn | P | Behavior |
|---|---|---|
| `createInvoice({projectId, ...})` | invoices.write | standalone draft |
| `createInvoiceFromMilestone(milestoneId)` | invoices.write | 7.9 |
| `updateInvoiceDraft(id, input)` / `saveInvoiceLines(id, {lines, discount, taxRateBp})` | invoices.write | draft only; milestone invoices restrict fields (7.9) |
| `issueInvoice(id)` | invoices.issue | 7.9 |
| `sendInvoiceEmail(id, {toEmail?})` | invoices.issue | enqueues `invoice_issued` email with PDF attached (rendered by the worker at send time); status unchanged |
| `voidInvoice(id, reason)` | invoices.void | 7.9 |
| `deleteDraftInvoice(id)` | invoices.write | only never-numbered drafts |
| `listInvoices`, `getInvoice` | invoices.read | list supports derived `overdue` filter: `status IN ('issued','partially_paid') AND due_date < :today` |

**payments** — `recordPayment(invoiceId, input)` (P `payments.write`), `voidPayment(paymentId, reason)` (P `payments.void`) · E: `PAYMENT_EXCEEDS_BALANCE`, `INVALID_STATE` · A `invoice.payment_recorded|payment_voided`.

**settings** — `getSettings(section)`, `updateSettings(section, value)` (Zod per section, 21.1; P `settings.write`), `uploadCompanyAsset(kind: 'logo'|'stamp', formData)` · A `settings.updated` (meta lists changed keys only, never values of secrets).

**files** — `uploadAttachment(projectId, formData)` (P `projects.write`), `deleteAttachment(fileId)` (attachments only) · A `file.uploaded|deleted`.

**dashboard / audit / verification** — `getDashboard()`; `listAudit(filters)` (P `audit.read`); `lookupVerification(code)`, `checkPdfAgainstContract(code, file)` (public, rate-limited).

---

# 15. Email, worker, files, backups

## 15.1 Email (`src/server/services/email.ts`)
- Transport: `nodemailer.createTransport({ host, port, secure, auth })` from env; if SMTP env is missing in development, log emails to console instead (never in production: fail fast at worker start).
- `enqueueEmail(tx, { toEmail, toName?, locale, templateKey, payload, entityType?, entityId?, scheduledAt? })` inserts into `email_outbox` inside the caller's transaction.
- Worker loop every 5 s: select up to 10 `pending` rows with `scheduledAt <= now` ordered by `id`; claim each with `UPDATE … SET status='sending' WHERE id=? AND status='pending'` (skip if 0 rows changed); render subject/html/text from the templates below; send; on success `status='sent'`, `sentAt`, and redact `payloadJson` URL/OTP fields (`"[redacted]"`); on failure `attempts += 1`, `lastError` (truncated 300 chars, no secrets), reschedule `now + min(60s * 2^attempts, 1h)`; after 5 attempts `status='failed'` + audit `email.failed`.
- HTML emails: simple table layout with inline styles, `dir="rtl"` for Arabic, a single primary button, plain-text alternative, footer "Sent by {company name}". No remote images/trackers.
- Locale for each email: OTP and signing link → contract language (`ar`→ar, `en`→en, `bilingual`→ client's `preferredLanguage`); internal notices → recipient user's locale; invoices → contract/invoice language rule, bilingual → client's preference.

| templateKey | Recipient | Subject EN / AR | Body essentials | Attachment |
|---|---|---|---|---|
| `contract_signing_link` | client signatory | `Please review and sign: {title} ({number})` / `يرجى مراجعة العقد وتوقيعه: {title} ({number})` | Greeting, "{provider} has sent you a contract", button "Review and sign" → link, "valid until {expiry}", "ignore if unexpected" | — |
| `contract_otp` | signatory | `Your verification code: {otp}` / `رمز التحقق: {otp}` | Code, "expires in 10 minutes", "do not share" | — |
| `contract_signed_copy` | client + provider signer + creator | `Signed contract {number}` / `العقد الموقّع {number}` | "All parties have signed", verification code + URL | sealed PDF |
| `contract_declined_notice` | contract creator | `Contract {number} was declined` / `تم رفض العقد {number}` | who + reason | — |
| `invoice_issued` | client email | `Invoice {number} from {provider}` / `فاتورة {number} من {provider}` | amount, due date, bank details line | invoice PDF |
| `invoice_overdue_reminder` | client email | `Reminder: invoice {number} is overdue` / `تذكير: الفاتورة {number} متأخرة السداد` | balance, due date | invoice PDF |
| `test_email` | current user | `Dossier test email` / `رسالة اختبار من Dossier` | confirms SMTP works | — |

## 15.2 Worker (`scripts/worker.ts`) — separate process, exactly ONE instance
Loops (all idempotent):
- every 5 s: `processOutbox()`.
- every 5 min: `retryPendingFinalizations()` — contracts `status='signed' AND final_pdf_file_id IS NULL AND pdf_attempts < 10`.
- every hour: `expireContracts()` (7.4), `cleanupSessions()`.
- every 15 min: `runDailyJobs()` — reads `settings.worker_state` (`{lastReminderDate, lastBackupDate}`); at business-tz hour 08 runs overdue reminders once per date (if enabled); at hour 03 runs backup once per date.
- every 60 s: write `settings.worker_heartbeat = {ts}`. Settings page shows a warning if older than 5 min.
- `SIGTERM`/`SIGINT`: stop timers, await in-flight job, close DB, exit 0.
Errors inside a job are logged and never crash the loop.

## 15.3 Files (`src/server/services/files.ts`)
- `saveFile({ kind, buffer, ownerType?, ownerId?, createdBy? })`: validate size and magic bytes per kind (9.6) → compute `sha256` → write to `DATA_DIR/files/YYYY/MM/<id>.tmp` mode `0600` → `rename` to `<id>` → insert row. Never trust file names.
- `readFile(id)` → `{ buffer, mime, sizeBytes, sha256 }`; missing file on disk → `NOT_FOUND` + logged error.
- `findFileBySha256(sha)` (used to resolve logo/stamp images referenced by snapshots).
- Deletion: only `kind='attachment'` rows may be deleted. `logo`, `stamp`, `signature`, `contract_pdf` are **never** deleted (snapshots/evidence reference them). Replacing a logo creates a new row and updates the setting.
- `GET /api/files/[id]`: authenticate; authorize by kind (`signature`/`contract_pdf` → `contracts.read`; `logo`/`stamp` → `settings.read`; `attachment` → `projects.read`); headers per 9.6.

## 15.4 Backups
- Daily at 03:00 business time (worker): `await sqlite.backup(path)` (better-sqlite3 online backup API; VERIFY signature) to `${DATA_DIR}/backups/dossier-YYYYMMDD-HHmm.sqlite`; weekly (Sunday) also `tar -czf files-YYYYMMDD.tar.gz -C DATA_DIR files` via `execFile('tar', [...])` with constant arguments only.
- Retention: delete backups older than `BACKUP_RETENTION_DAYS` (default 30), always keeping the 3 newest.
- Audit `backup.completed` / `backup.failed`.
- **Restore** (document in README): stop app + worker → copy chosen `.sqlite` to `DATA_DIR/dossier.sqlite` (delete `-wal`/`-shm`) → restore `files/` from tar → start → run `npm run db:migrate` (no-op if current) → open the app and verify a sample contract/PDF.
- Off-site copy and encryption are host responsibilities (README documents `rsync`/`rclone` + an encrypted volume or `age`). Not implemented inside the app.

## 15.5 Logging and health
- `src/lib/logger.ts`: `logger.info|warn|error(event: string, fields?: object)` → one JSON line to stdout: `{ts, level, event, ...fields}`; fields pass through a redactor that drops keys matching `/token|secret|password|otp|signature|authorization|cookie/i`.
- `GET /api/health`: runs `SELECT 1`; returns `{"ok":true}` (200) or `{"ok":false}` (503). No versions, no internals.

---
# 16. Testing strategy

## 16.0 Setup
- Vitest, `environment: 'node'`. A test helper `createTestDb()` opens `:memory:` better-sqlite3, applies **all migrations** from `drizzle/` (so triggers are tested), and returns `{ db, sqlite }`. Services accept the db/tx as a parameter (or the module exposes a `setDbForTests()`), so tests never touch `data/`.
- `nowMs()` is mockable (`vi.setSystemTime` or an injected clock). Business timezone in tests: `Asia/Riyadh`.
- Test files colocated: `money.test.ts`, `dates.test.ts`, `canonical-json.test.ts`, `numbering.test.ts`, `contract-calc.test.ts`, `milestones.test.ts`, `render-body.test.ts`, `variables.test.ts`, `contracts.test.ts`, `signing.test.ts`, `invoices.test.ts`, `payments.test.ts`, `permissions.test.ts`, `triggers.test.ts`, `messages.test.ts`, `pdf-html.test.ts`, `verification.test.ts`, `auth.test.ts`.
- Rule: every service function has at least one success test and one failure test (wrong state / forbidden / invalid input).

## 16.1 Numeric test vectors (normative — implement exactly)

**mulDivRound / percentOfBp** (half-up)
| call | expected |
|---|---|
| `mulDivRound(1005, 1500, 10000)` | `151` (150.75 → 151) |
| `mulDivRound(10, 1500, 10000)` | `2` (1.5 → 2) |
| `mulDivRound(1, 1, 2)` | `1` (0.5 → 1) |
| `mulDivRound(0, 9999, 10000)` | `0` |
| `percentOfBp(1_000_000, 1500)` | `150_000` |
| `percentOfBp(1_000_001, 1500)` | `150_000` (150000.15 → 150000) |
| `mulDivRound(MAX_MINOR, 10000, 10000)` | `MAX_MINOR` (no overflow) |
| `mulDivRound(9_007_199_254_740_991, 2, 1)` | throws (product not a safe integer) |
| `mulDivRound(1, 1, 0)` | throws (`d <= 0`) |

**parseMajorToMinor**
| input, currency | expected |
|---|---|
| `'1234.5','SAR'` | `123450` |
| `'1,234.50','SAR'` | `123450` |
| `'١٢٣٤٫٥٠','SAR'` | `123450` |
| `'0.001','KWD'` | `1` |
| `'12.345','SAR'` | throws (too many decimals) |
| `'-5','SAR'`, `'abc'`, `''`, `'1e3'`, `'1.2.3'` | throw |

**formatMinor / formatMoney**
| call | expected |
|---|---|
| `formatMoney(123450,'SAR','en')` | `1,234.50 SAR` |
| `formatMoney(123450,'SAR','ar')` | `1,234.50 SAR` |
| `formatMoney(5,'SAR','en')` | `0.05 SAR` |
| `formatMoney(1,'KWD','en')` | `0.001 KWD` |
| `formatMoney(1_000_000_000,'USD','en')` | `10,000,000.00 USD` |

**allocateProportional / allocateByBp**
| call | expected |
|---|---|
| `allocateByBp(1_000_001, [3000,4000,3000])` | `[300000, 400001, 300000]` (sum 1,000,001) |
| `allocateByBp(100, [3333,3333,3334])` | `[33, 34, 33]` (cum: 33, 67, 100) |
| `allocateByBp(1, [5000,5000])` | `[1, 0]` (cum: round(0.5)=1; last = 1-1 = 0) |
| `allocateByBp(0, [10000])` | `[0]` |
| `allocateByBp(10, [5000,4000])` | throws (bps ≠ 10000) |
| `allocateProportional(150000, [300000,400001,300000])` | `[45000, 60000, 45000]` |
| `allocateProportional(5, [1,1,1,1,1])` | `[1,1,1,1,1]` (no negatives) |
| `allocateProportional(7, [0,0])` | `[0,0]` |
Property test: for random totals/weights, parts are all ≥ 0 and sum to `total`.

**calcTotals**
| scenario | expected |
|---|---|
| items `[{unit:1_000_000, qty:1000}]`, no discount, tax 1500 | subtotal 1,000,000 · discount 0 · net 1,000,000 · tax 150,000 · total 1,150,000 |
| same + percent discount 1000 (10%) | discount 100,000 · net 900,000 · tax 135,000 · total 1,035,000 |
| same + fixed discount 50,000 | net 950,000 · tax 142,500 · total 1,092,500 |
| items `[{unit:3333, qty:333}]` | lineTotal `1110` (1109.889 → 1110) |
| items `[{unit:25000, qty:1500}]` | lineTotal `37500` |
| fixed discount > subtotal | throws `VALIDATION_FAILED` (`discountValue`) |
| `fixedTaxMinor: 45000` with net 300000 | tax 45000, total 345000 |

**planMilestones** (net 1,000,001; contract tax 150,000 = `percentOfBp(1_000_001,1500)`; mode percent 3000/4000/3000)
- amounts `[300000, 400001, 300000]`; taxes `[45000, 60000, 45000]`; totals `[345000, 460001, 345000]`.
- Invariants: Σamount = net, Σtax = tax, Σtotal = contract total (1,150,001).
- Fixed mode with amounts `[600000, 400001]` → accepted; `[600000, 400000]` → throws `milestonesSumMismatch`.
- Percent rows summing to 9999 → throws.

**Numbering**
- First contract in 2026 with prefix `DOS` → `DOS-C-2026-0001`; second → `…-0002`; first of 2027 → `DOS-C-2027-0001`.
- Invoice issued with `issueDate = '2026-12-31'` while now is 2027-01-02 → year 2026 counter.
- Counter 10000 → `DOS-I-2026-10000`.
- Rolled-back transaction does not consume a number (run allocate inside `withTx`, throw, assert next allocation returns the same value).
- Project code `P-0001`.
- Concurrency: two sequential `withTx` allocations never return the same number.

**Dates**
- `addDays('2026-01-31', 1)` → `2026-02-01`; `addDays('2026-12-31', 1)` → `2027-01-01`; `addDays('2028-02-28', 1)` → `2028-02-29`.
- `todayInTz('Asia/Riyadh')` with system time `2026-10-07T21:30:00Z` → `2026-10-08` (UTC+3).
- `isValidDateStr('2026-02-30')` → false.
- `formatDateLong('2026-10-07','en')` → `7 October 2026`; `formatDateLong('2026-10-07','ar')` → string containing `7` and `2026` and the Arabic month name `أكتوبر` (assert with `toContain`, since ICU data may differ slightly).

**Canonical JSON / hash**
- `canonicalize({b:1,a:{d:2,c:3}})` → `{"a":{"c":3,"d":2},"b":1}`.
- Key order of input does not change the hash.
- `canonicalize({a:undefined,b:null})` → `{"b":null}`.
- `canonicalize({a:1.5})` and `canonicalize({a:NaN})` throw.
- Strings are NFC-normalized: `'e\u0301'` (e + combining acute) and `'\u00e9'` hash equally.

**Verification codes**
- 12 chars, only Crockford alphabet; `normalizeCode('abcd-ef0o-1ilL')` → `ABCDEF001111`; display grouping `XXXX-XXXX-XXXX`.

**Template rendering** (`render-body.test.ts`)
- Input `"First.\n\nSecond line A\nsecond line B\n\n- a\n- b\n\n> note\n\n{{block.signatures}}"` → blocks: numbered paragraph, numbered paragraph (with `<br>`), bullets `[a,b]`, unnumbered paragraph, special `signatures`; numbering labels `N.1`, `N.2`.
- XSS: variable value `<img src=x onerror=alert(1)>` renders as `&lt;img …&gt;` inside `<bdi>`.
- `{{contract.scope}}` whose value contains `{{client.name}}` is NOT expanded.
- `**bold**` inside a value is NOT converted (only literal text).
- Unknown variable `{{foo.bar}}` → reported by validation; `{{block.signatures}}` inside a sentence → error `templates.blockMisplaced`.
- Empty required variable in `send` validation → issue listing the key and clause position.

**Contract lifecycle** (`contracts.test.ts`, `signing.test.ts`)
- Draft → send without client email → issues contain `client.email` error; contract stays draft.
- Send success: number assigned, version row exists with hash equal to `sha256(canonicalize(snapshot))`, provider signatory `signed`, client signatory `pending` with `tokenHash` set (and raw token not stored anywhere in DB), outbox row `contract_signing_link` exists.
- Editing clauses after send → DB trigger error (and service returns `INVALID_STATE` before reaching it).
- Client signs with valid token + OTP → contract `signed`, `verificationCode` set, tokens nulled; second submit with same token → `TOKEN_INVALID`.
- Expired token (advance clock past TTL) → `TOKEN_EXPIRED`/generic invalid.
- OTP: 5 wrong attempts invalidate the code; 6th correct attempt still fails until a new code is requested; resend within 60 s → `RATE_LIMITED`.
- Revise from `sent` → `draft`, `versionNo` incremented, old tokens invalid; re-send creates version 2 with a different hash and keeps the same contract number.
- Decline → status `declined`, tokens invalid, outbox `contract_declined_notice`.
- `UPDATE contract_versions …` and `DELETE FROM audit_log` → throw (trigger).
- Signed contract: attempt to update `total_minor` → throws (trigger).

**Invoices & payments** (`invoices.test.ts`, `payments.test.ts`)
- From milestone 2 of the vectors above: invoice lines `[{unit:400001,qty:1000}]`, tax `60000`, total `460001`; creating a second active invoice for the same milestone → error (partial unique index); voiding the first allows a new one.
- Issue: number `DOS-I-2026-0001`, `dueDate = issueDate + 14 days` by default, snapshots non-null, verification code set; editing money columns afterwards → trigger error.
- Payments: total 460001: pay 100000 → `partially_paid`, `paidMinor 100000`; pay 360001 → `paid` with `paidAt`; pay 1 more → `PAYMENT_EXCEEDS_BALANCE`; void the second payment → back to `partially_paid`, `paidAt` null; void the first too → `issued`.
- Void invoice with active payment → `INVALID_STATE`; after voiding payments → ok.
- `isOverdue`: issued, due `2026-10-01`, today `2026-10-02` → true; due == today → false; `paid` → false; `void` → false.
- Viewer role calling any write → `FORBIDDEN`; member calling `voidInvoice` → `FORBIDDEN`.

**Permissions** (`permissions.test.ts`): table-driven over the matrix of section 8 for every permission × role.

**Messages** (`messages.test.ts`): identical keys, no empty values, identical `{placeholders}`.

**PDF HTML** (`pdf-html.test.ts`): snapshot of `renderContractHtml` for a fixed fixture in `ar`, `en`, `bilingual` (assert `dir`, presence of both column headings in bilingual, watermark in draft, no raw `<script`). Escape test with hostile strings.

**PDF smoke** (`pdf-render.test.ts`, skipped when Chromium is unavailable via `describe.skipIf`): render each mode; assert buffer starts with `%PDF-`, size > 10 KB, and for the Arabic sample that the page count ≥ 1.

**Authorization table test** (`actions-auth.test.ts`): import every exported action; call with no session → `UNAUTHENTICATED`; with `viewer` for each write action → `FORBIDDEN`.

## 16.2 E2E (Playwright test, `tests/e2e/`) — minimum set
1. Login → create client → create project → create contract from template → fill pricing → send (SMTP stubbed: read the outbox row to get the link via test helper) → open `/s/<token>` → OTP (read code from outbox helper) → sign → contract shows `signed` and sealed PDF downloads.
2. From the signed contract create invoice from milestone → issue → record payment → status `paid`.
3. Verify page: `/v/<code>` shows valid; wrong code shows not-found.
4. Switch UI to Arabic → `dir="rtl"` on `<html>`; sidebar on the right.
Run against a built app with a temp `DATA_DIR`.

---

# 17. Deployment

## 17.1 Dockerfile (multi-stage) — adapt to task-board's if it already has one
```dockerfile
# The Playwright image tag MUST equal the installed `playwright` npm version (check package.json).
ARG PLAYWRIGHT_VERSION=1.XX.X
FROM mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble AS base
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 TZ=UTC
RUN apt-get update && apt-get install -y --no-install-recommends fonts-noto-core tar \
 && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM deps AS build
COPY . .
RUN npm run build

FROM base AS runner
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/drizzle ./drizzle
COPY --from=build /app/assets ./assets
COPY --from=build /app/messages ./messages
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/src ./src
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
RUN mkdir -p /app/data && chown -R pwuser:pwuser /app
USER pwuser
EXPOSE 3000
CMD ["sh", "-c", "npm run db:migrate && node server.js"]
```
Notes: VERIFY the user name in the Playwright image (`pwuser`) and that `node server.js` is the standalone entry. The worker uses the same image with a different command. Do not copy `.env` into the image.

## 17.2 docker-compose.yml
```yaml
services:
  app:
    build: .
    restart: unless-stopped
    env_file: .env
    environment: [PORT=3000]
    volumes: ["./data:/app/data"]
    ipc: host                      # Chromium stability
    healthcheck:
      test: ["CMD", "node", "-e", "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]
      interval: 30s
      timeout: 5s
      retries: 3
    ports: ["127.0.0.1:3000:3000"]
  worker:
    build: .
    restart: unless-stopped
    env_file: .env
    command: ["npx", "tsx", "scripts/worker.ts"]
    volumes: ["./data:/app/data"]
    ipc: host
    depends_on: [app]
```
`./data` must be writable by the container user (`chown 1000:1000 data` or the pwuser UID). Exactly one `worker` replica.

## 17.3 Nginx (`nginx/dossier.conf`)
```nginx
limit_req_zone $binary_remote_addr zone=dossier_public:10m rate=30r/m;
server {
  listen 443 ssl http2;
  server_name dossier.example.com;
  # ssl_certificate / ssl_certificate_key: managed by your cert tooling
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  client_max_body_size 12m;
  location ~ ^/(s|v)/ {
    limit_req zone=dossier_public burst=20 nodelay;
    proxy_pass http://127.0.0.1:3000;
    include /etc/nginx/dossier-proxy.conf;
  }
  location / {
    proxy_pass http://127.0.0.1:3000;
    include /etc/nginx/dossier-proxy.conf;
  }
}
# dossier-proxy.conf:
#   proxy_set_header Host $host;
#   proxy_set_header X-Real-IP $remote_addr;
#   proxy_set_header X-Forwarded-Proto $scheme;
#   proxy_http_version 1.1;
```
HTTP→HTTPS redirect server block is required. The app must never be reachable directly from the internet (bind to 127.0.0.1).

## 17.4 First deployment checklist
1. `cp .env.example .env`, fill values (`APP_SECRET` via `openssl rand -hex 32` ×2 → 64 hex chars min; SMTP; `APP_URL`).
2. `docker compose build && docker compose up -d`.
3. `docker compose exec app npm run seed` (creates owner from `BOOTSTRAP_OWNER_*`, system templates, default settings).
4. Log in, change password, fill Settings → Company (names, tax no., address, logo, stamp, bank), Defaults, Signing; send the test email; create a test client/project/contract and complete the whole flow with a test email address.
5. Remove `BOOTSTRAP_OWNER_PASSWORD` from `.env`.
6. Confirm backups appear under `data/backups` after the first 03:00 run (or trigger manually).

---
# 18. Task cards (implementation order)

Every card: **Depends** (must be finished and green) · **Read first** (spec sections) · **Do** · **Accept** (all must be true) · **Manual** (what a human checks). Always finish with `npm run check` green and a `PROGRESS.md` entry (0.3). Tests listed are **minimum**; add more if useful.

Triggers (6.3) are split by table: audit/versions/etc. in the task that creates the table.

## PHASE 0 — Foundation

### T-001 — Repository bootstrap
**Depends:** — · **Read first:** 3, 4
**Do:** (1) Read the task-board repo and mirror toolchain versions (3.1). (2) Create the repo `dossier` with the layout of 4.1 (empty folders get `.gitkeep`). (3) Install only dependencies of 3.3 at the versions task-board uses (or latest stable if absent). (4) `next.config.ts`: `output: 'standalone'`, `serverExternalPackages` for better-sqlite3/playwright/@node-rs/argon2. (5) Tailwind configured like task-board. (6) `.gitignore`, `.dockerignore`, `.env.example` (all vars of 4.3), `README.md` (project description, how to run), `PROGRESS.md`, `OPEN_QUESTIONS.md`. (7) Download Cairo into `assets/fonts/` (12.3) with `OFL.txt`.
**Accept:** `npm ci && npm run build` succeeds; `npm run dev` serves a placeholder page; no extra dependencies.
**Manual:** open `/` in the browser.

### T-002 — Tooling and CI
**Depends:** T-001 · **Read first:** 0.2, 4.2
**Do:** `tsconfig` strict + `paths: {"@/*": ["./src/*"]}`; ESLint (next config) with `no-explicit-any`, `ban-ts-comment`, `no-non-null-assertion` as errors; Prettier; `vitest.config.ts` (alias `@`); all scripts of 4.2; `scripts/check-rtl.sh` + a test (`scripts/check-rtl.test.ts`) that runs the script against a temp fixture containing `ml-2` (expects exit 1) and a clean one (exit 0); `.github/workflows/ci.yml` (`npm ci`, `npm run check`).
**Accept:** `npm run check` passes; deliberately adding `className="ml-2"` fails `check:rtl` (verify then revert).

### T-003 — Environment and logger
**Depends:** T-002 · **Read first:** 4.3, 9.13, 15.5
**Do:** `src/lib/env.ts` (Zod, fails fast, exports typed `env`); `src/lib/logger.ts` with redactor.
**Accept:** tests: missing `APP_URL` throws; `APP_SECRET` shorter than 64 hex chars throws; redactor removes keys `token`, `password`, `otp`, `signatureData`, `Authorization`.

### T-004 — Database layer
**Depends:** T-003 · **Read first:** 5.5, 6.1
**Do:** `src/db/index.ts` (create `DATA_DIR` with mode 0700, open better-sqlite3, pragmas, export `sqlite`, `db`, `withTx`, types `DbTx`); `src/db/migrate.ts`; `drizzle.config.ts`; `src/lib/constants.ts` (6.1 + `CURRENCIES`); test helper `src/db/test-db.ts` (`createTestDb()`).
**Accept:** tests: pragmas applied; `withTx` rolls back when callback throws; `createTestDb` runs migrations (none yet → no error).

### T-005 — Schema: identity and infrastructure
**Depends:** T-004 · **Read first:** 6.2 (users…numberSequences), 6.3 (audit trigger lines only)
**Do:** add `users, sessions, settings, files, auditLog, numberSequences` to `src/db/schema.ts`; `npm run db:generate`; then `npx drizzle-kit generate --custom --name=integrity_audit` containing only the two `audit_log_*` triggers.
**Accept:** tests: unique email index; `UPDATE audit_log` and `DELETE FROM audit_log` throw; sequence unique (`seqKey`,`year`).

### T-006 — Core pure utilities
**Depends:** T-004 · **Read first:** 5.1, 5.2, 5.3, 7.6 (canonical JSON), 16.1
**Do:** `ids.ts`, `crypto.ts`, `money.ts`, `dates.ts`, `canonical-json.ts`, `errors.ts`, `result.ts`, verification-code helpers (`generateCode`, `normalizeCode`, `formatCode`). Pure, no DB.
**Accept:** every vector in 16.1 (mulDivRound, parseMajorToMinor, formatMinor, allocate*, dates, canonical JSON, codes) passes; property test for `allocateProportional`.

### T-007 — i18n, fonts, theme, root layout
**Depends:** T-006 · **Read first:** 10, 5.8
**Do:** `next-intl` request config (cookie-based); `messages/en.json` + `ar.json` with groups `common, nav, auth, errors` (+ every `errors.<CODE>` of 21.4 and `errors.required|invalid|tooLong`); `messages.test.ts`; root layout sets `lang/dir`; `next/font/local` Cairo; CSS variables for light/dark; actions `setLocale`, `setTheme`; a tiny `LocaleSwitch` and `ThemeSwitch` component.
**Accept:** message-parity test passes; switching locale flips `dir` on `<html>` (manual).

### T-008 — Authentication
**Depends:** T-005, T-007 · **Read first:** 9.1–9.4, 14.2
**Do:** `password.ts` (hash/verify, dummy hash), `session.ts` (create/validate/renew/delete using `hmacToken`), `rate-limit.ts`, `require-user.ts`, `/login` page + `login`/`logout` actions, `scripts/create-user.ts`, `scripts/seed.ts` bootstrap-owner part only. Uniform failure message `errors.invalidCredentials`.
**Accept:** tests: hash/verify; wrong password and unknown email produce the same error; 6th failure within 15 min → `RATE_LIMITED`; expired session rejected; renewal extends expiry; disabled user cannot log in; cookie flags.
**Manual:** login/logout in browser; cookie is HttpOnly.

### T-009 — App shell and UI primitives
**Depends:** T-008 · **Read first:** 5.8, 10.3, 13
**Do:** `(app)/layout.tsx` (calls `requireUser`), sidebar (items filtered by permission; icons from lucide with `rtl:` flips), top bar, user menu, `/account` page (name, locale, password change, signer titles), placeholder dashboard; components in `src/components/ui`: Button, Input, Select, Textarea, Field (label+error), BilingualField, Dialog, ConfirmDialog, Table, Badge, Toast, Tabs, Card, Pagination, EmptyState.
**Accept:** `npm run check` green; no physical Tailwind classes; keyboard-accessible dialogs.
**Manual:** compare Arabic vs English layout; dark/light.

### T-010 — Permissions, audit service, action wrapper, audit page
**Depends:** T-009 · **Read first:** 8, 14.1, 14.2, 21.5
**Do:** `permissions.ts` (`can`, `assertCan`, matrix), `audit.ts` (+ `getRequestMeta`), `actions/_run.ts` (`runAction`, `zodToFieldErrors`), `/audit` page (filters; owner only).
**Accept:** `permissions.test.ts` covers the whole matrix; audit write inside `withTx` rolls back with the transaction; `runAction` maps `AppError`/`ZodError`/unknown correctly.

## PHASE 1 — Clients, projects, templates, contracts, PDF

### T-011 — Settings and files services + settings pages
**Depends:** T-010 · **Read first:** 9.6, 15.3, 21.1, 13 (settings routes)
**Do:** Zod schemas for sections (21.1), `settings.ts` service (get with defaults, update, audit), `files.ts` service (15.3) with magic-byte validation, `/api/files/[id]`, pages `/settings/company|defaults|numbering|signing|email` (email page without worker status yet), logo/stamp upload.
**Accept:** tests: uploading a PNG renamed `.svg`/with wrong magic bytes is rejected (`FILE_REJECTED`); oversize rejected; `getSettings` returns defaults on a fresh DB; viewer cannot read settings.
**Manual:** upload logo and stamp; they render in the settings page.

### T-012 — Clients
**Depends:** T-011 · **Read first:** 6.2 (clients), 14.3 clients, 13
**Do:** schema + migration; service; actions; Zod; pages list/new/edit/detail; archive/unarchive; search.
**Accept:** tests: requires at least one name; LIKE-escaping (`%` in search doesn't match everything); archive hides from default list; viewer cannot write.

### T-013 — Projects and project codes
**Depends:** T-012 · **Read first:** 6.2 (projects), 7.1, 14.3 projects
**Do:** schema + migration; `numbering.ts` (`allocateNumber`, `formatProjectCode`, `formatDocNumber`) + tests of 16.1; project service/actions/pages (list/new/edit); project detail page shell with tabs (Overview placeholder, Contracts/Invoices placeholders).
**Accept:** first project `P-0001`, second `P-0002`; rolled-back creation doesn't consume a code; currency must be supported.

### T-014 — Contract schema and integrity triggers
**Depends:** T-013 · **Read first:** 6.2 (templates … contractSignatories), 6.3
**Do:** add `templates, templateClauses, contracts, contractItems, contractClauses, paymentMilestones, contractVersions, contractSignatories, emailOutbox` to the schema; generate migration; custom migration `integrity_contracts` with all contract-related triggers of 6.3 (versions, signatories, contracts, clauses/items/milestones draft-only); add CHECK constraints.
**Accept:** `triggers.test.ts` proves each trigger fires: edit clause of a `sent` contract → error; update `total_minor` of a `signed` contract → error; delete numbered contract → error; delete a draft never-sent contract → succeeds and cascades.

### T-015 — Template engine
**Depends:** T-006 · **Read first:** 11.1–11.4
**Do:** `render-body.ts` (`parseBody`, `extractVariables`, `renderInline`), `variables.ts` (`ALLOWED_VARIABLES`, `buildVariableMap(snapshot, lang)`), block-placement validators. Pure functions; fixtures from the worked example (21.6).
**Accept:** all `render-body` tests of 16.1; every key of 11.3 is resolvable from the worked-example snapshot in both languages; XSS tests.

### T-016 — Seed templates and read-only template pages
**Depends:** T-014, T-015 · **Read first:** 11.5, 11.7, 6.4
**Do:** `seed-templates.ts` with the exact text of 11.7.1 and definitions of 11.7.2; `scripts/seed.ts` (idempotent upsert by key; settings defaults); `/templates` list + `/templates/[id]` read-only view with preview rendering using sample data; i18n for templates area.
**Accept:** test: seeding twice yields the same rows; each template passes the save-time validation (11.6) in both languages; each template has exactly one `signatures` block; special-block sequences match between AR and EN of every clause.
**Manual:** open each template and read the Arabic text for typos.

### T-017 — Totals and milestone planning (pure)
**Depends:** T-006 · **Read first:** 7.2, 7.3, 16.1
**Do:** `contract-calc.ts` (`calcTotals`), `milestones.ts` (`planMilestones`, validators).
**Accept:** all vectors in 16.1 for calcTotals/planMilestones; invariants asserted.

### T-018 — Contract service (draft side)
**Depends:** T-014, T-016, T-017, T-011 · **Read first:** 7.4, 7.5, 7.6, 14.3 contracts
**Do:** `contracts.ts`: `createContractFromTemplate`, `updateContractBasics`, `saveContractItems`, `saveMilestones`, `saveClauses`, `previewTotals`, `validateContractForSend`, `buildContractSnapshot`, `deleteDraftContract`, `cancelContract` (draft only for now), `list/get`. Actions + Zod. All draft mutations guard `status='draft'`. Recompute totals and re-plan milestones when pricing changes.
**Accept:** tests: creating from each seed template copies clauses and defaults (preset milestones sum to net); changing the discount re-plans milestones with invariants; every validation rule of 7.5 has a failing and a passing test; snapshot is deterministic (same input → same canonical hash).

### T-019 — Contract builder UI (steps 1–4)
**Depends:** T-018, T-009 · **Read first:** 13 (builder behavior), 10.3
**Do:** `/contracts/new`, `/contracts/[id]/edit` with steps Basics, Pricing, Payment schedule, Clauses; each step saves via its action; live totals through `previewTotals`; up/down clause reorder; "Reset to template preset"; sticky step navigation; disable steps when `hasFees=false`.
**Accept:** reload after each step keeps data; validation errors appear under fields (i18n); RTL layout correct.
**Manual:** build a full contract from the web template with the worked example numbers; totals show `2,185,000` minor → `21,850.00 SAR`.

### T-020 — PDF infrastructure and contract HTML
**Depends:** T-018 · **Read first:** 12
**Do:** `fonts.ts`, `browser.ts`, `render.ts`, `qr.ts`, `html/shared.ts` (esc, CSS, block renderers), `html/contract.ts` (modes ar/en/bilingual; draft/preview/unsigned/sealed), semaphore; footer template. Resolve the two **VERIFY** items (data-URI images with blocked network; page numbers with JS disabled) and record outcomes in `PROGRESS.md`.
**Accept:** `pdf-html.test.ts` (snapshot + escaping + modes) and `pdf-render.test.ts` smoke pass; a sample PDF is generated to `tmp/qa/` for each mode.
**Manual:** open the three PDFs: Arabic letters connected, RTL correct, numbers LTR, page numbers present, table headers repeat, bilingual columns aligned.

### T-021 — PDF endpoints, preview, Review step
**Depends:** T-020, T-019 · **Read first:** 12.9, 13 (Review step)
**Do:** `/api/contracts/[id]/pdf`, `getContractPreviewHtml` action, Review step page (issues list + iframe preview with language tabs; Send button disabled — implemented in T-029).
**Accept:** unauthenticated → 401/redirect; viewer can download but not edit; `lang` incompatible with `languageMode` → 400/`VALIDATION_FAILED`; filename sanitized.

### T-022 — Contracts list and detail
**Depends:** T-021 · **Read first:** 13
**Do:** `/contracts` (filters/pagination), `/contracts/[id]` (header, status badge, Summary/Document/Signatures(placeholder)/History tabs, draft-state actions: Edit, Delete, Cancel), project detail Contracts tab.
**Accept:** tests for list filters/sort whitelist; delete of never-numbered draft works; cancel sets status and audit.

## PHASE 2 — Invoices and payments

### T-023 — Invoice schema and triggers
**Depends:** T-022 · **Read first:** 6.2 (invoices, invoiceLines, payments), 6.3
**Do:** add the three tables; migration; custom migration `integrity_invoices` (invoice/payment triggers); partial unique index for active milestone invoices.
**Accept:** triggers test: edit total of an issued invoice → error; delete payment → error; insert second active invoice for a milestone → error; void first then insert → ok.

### T-024 — Invoice service
**Depends:** T-023, T-017, T-013 · **Read first:** 7.9, 14.3 invoices
**Do:** `invoices.ts`: `createInvoice`, `createInvoiceFromMilestone`, `updateInvoiceDraft`, `saveInvoiceLines`, `issueInvoice`, `voidInvoice`, `deleteDraftInvoice`, `list/get`, `isOverdue`; actions + Zod. Milestone invoices lock lines/tax.
**Accept:** invoice tests of 16.1 (milestone 2: total 460001; issue numbering; due-date default; snapshots; locked columns); contract must be `signed|completed` (test with a fixture contract inserted directly).

### T-025 — Payments
**Depends:** T-024 · **Read first:** 7.9 (payments), 14.3 payments
**Do:** `payments.ts`: `recordPayment`, `voidPayment`; status/paidMinor recomputation in the same transaction.
**Accept:** all payment tests of 16.1.

### T-026 — Invoice pages
**Depends:** T-025, T-009 · **Read first:** 13
**Do:** `/invoices` (filters incl. derived overdue), `/invoices/new` (standalone & from milestone), `/invoices/[id]` (actions: issue, record payment, void payment/invoice, delete draft), `/invoices/[id]/edit` (lines editor with live totals via a server action).
**Accept:** forms validate; money inputs parse Arabic-Indic digits; overdue badge appears for past-due unpaid invoices.
**Manual:** full invoice flow with worked-example milestone 2.

### T-027 — Invoice PDF
**Depends:** T-020, T-026 · **Read first:** 12.6, 12.9
**Do:** `html/invoice.ts`, `/api/invoices/[id]/pdf`, PDF buttons and preview in invoice detail.
**Accept:** HTML tests (draft watermark, void watermark, paid stamp, bilingual lines, escaping); smoke render; text never claims "tax invoice".
**Manual:** inspect AR/EN/bilingual PDFs.

### T-028 — Project dossier: financial summary, milestones to invoice, activity
**Depends:** T-027, T-022 · **Read first:** 7.11, 13
**Do:** summary service (grouped by currency), Overview tab cards, "Milestones to invoice" table with "Create invoice" button, Invoices tab, Files tab (upload/list/delete attachments), Activity tab (audit).
**Accept:** summary numbers match the worked example after fixture data; attachments obey type/size rules; activity lists project/contract/invoice events.

## PHASE 3 — Sending, signing, sealing, verification

### T-029 — Send flow
**Depends:** T-028, T-014 · **Read first:** 7.4, 7.5, 7.6, 7.7 (provider side), 13 (Send dialog)
**Do:** `sendContract` (single transaction: validate, number, version+hash, signatories, provider signature evidence, client token hmac, outbox rows), `signAsProvider`, Send dialog UI with `signature_pad`, signature storage via files service, `emailOutbox` enqueue helper (sending comes in T-030).
**Accept:** tests of 16.1 "Send success"; raw token never persisted; failure at any step rolls back everything (inject a failing audit insert).

### T-030 — Email service and worker skeleton
**Depends:** T-029 · **Read first:** 15.1, 15.2
**Do:** nodemailer transport, template renderer (AR/EN HTML + text) for the keys of 15.1 implemented so far (`contract_signing_link`, `contract_otp`, `test_email`), `processOutbox`, `scripts/worker.ts` (loops, heartbeat, graceful shutdown), settings email page: test-email button + heartbeat status.
**Accept:** tests with a stub transport: success redacts payload; failure reschedules with backoff; 5th failure → `failed`; claim is race-safe (second claim of same row changes 0 rows); RTL attribute present in Arabic emails.
**Manual:** send a test email to a real inbox.

### T-031 — Public signing experience
**Depends:** T-030 · **Read first:** 7.7 (client side), 9.7, 12.9 (`/s/[token]/pdf`)
**Do:** `/s/[token]` page and actions: `getSigningContext`, `requestSigningOtp`, `verifySigningOtp`, `submitClientSignature`, `declineContract`; signature pad (drawn) + typed option; consent; iframe preview; unsigned PDF route; rate limits; headers (`no-store`, `noindex`).
**Accept:** all signing tests of 16.1; generic invalid-link page; OTP lockout; page works on mobile widths and RTL.
**Manual:** complete a signing from a phone-size window.

### T-032 — Finalization, sealed PDF, certificate
**Depends:** T-031, T-020 · **Read first:** 7.8, 12.5, 12.7
**Do:** finalize transaction inside `submitClientSignature`/`signAsProvider`; `generateSealedPdf` (snapshot + signatures + certificate + QR + verification block); file storage; `pdfSha256`; `contract_signed_copy` email with attachment; `retryPendingFinalizations` in the worker + `retryFinalize` action + UI banner.
**Accept:** after both signatures: status `signed`, code set, tokens nulled, sealed PDF stored with matching sha256; simulated render failure leaves `finalPdfFileId` null and `pdfAttempts=1`, worker retry succeeds; integrity check (hash of version snapshot) enforced.
**Manual:** open the sealed PDF and read the certificate page.

### T-033 — Verification
**Depends:** T-032, T-027 · **Read first:** 7.10, 12.8
**Do:** `verification.ts`, pages `/v/[code]` and `/verify` (code input + PDF upload check), QR + code in invoices (issued) and sealed contracts, rate limiting.
**Accept:** `verification.test.ts`: valid contract, valid invoice, void invoice, unknown code (same response shape), normalized code input (`o`→`0`), uploaded identical PDF → match, modified PDF → mismatch; public DTO contains no client email/phone/amounts of contracts.

### T-034 — Revise, regenerate link, expire, complete, terminate
**Depends:** T-033 · **Read first:** 7.4 (full table)
**Do:** `reviseContract`, `regenerateSigningLink` (shows URL once + optional email), `expireContracts` (worker hourly), `completeContract`, `terminateContract` (owner), `cancelContract` for sent/declined/expired; detail page Signatures tab (statuses, viewed/OTP/signed times) and History tab (versions + audit).
**Accept:** all lifecycle tests of 16.1; every invalid transition returns `INVALID_STATE`; tokens revoked on recall/cancel/expire.

### T-035 — Template editor
**Depends:** T-016 · **Read first:** 11.6
**Do:** `/templates/new`, `/templates/[id]/edit`, duplicate/archive actions, clause editor (add/delete/reorder/edit AR/EN) with live preview and validation messages, legal notice.
**Accept:** system templates cannot be edited (duplicate works); invalid variable or misplaced block is rejected with a clear message; contracts created before an edit are unaffected (clauses were copied).

## PHASE 4 — Dashboard, notifications, operations

### T-036 — Dashboard
**Depends:** T-034, T-028 · **Read first:** 7.12
**Do:** `dashboard.ts` queries + cards/lists; per-currency grouping; worker-stale warning for owners.
**Accept:** tests with fixture data matching 7.12 definitions (month boundaries in business tz; voided payments excluded).

### T-037 — Invoice emails, reminders, daily jobs
**Depends:** T-036, T-030 · **Read first:** 7.9 (reminders), 15.1, 15.2
**Do:** `sendInvoiceEmail`, templates `invoice_issued` / `invoice_overdue_reminder` / `contract_declined_notice`, `runDailyJobs` with `worker_state`.
**Accept:** reminders only when enabled and only on configured offsets; at most once per day per invoice; PDFs rendered at send time (not inside transactions).

### T-038 — Backups and health
**Depends:** T-037 · **Read first:** 15.4, 15.5
**Do:** backup job (DB + weekly files tar), retention, `/api/health`, README restore section, backup audit entries.
**Accept:** test creates a backup of a temp DB and opens it successfully; retention keeps the 3 newest; health returns 503 if DB closed.

### T-039 — Users management
**Depends:** T-010 · **Read first:** 8, 14.3 users
**Do:** `/users`, `/users/new`, `/users/[id]`; last-owner guard; disable → sessions deleted; `canSignForCompany` toggle; owner sets password.
**Accept:** tests: cannot demote/disable last owner; disabled user session invalid immediately.

### T-040 — task-board link (minimal, optional)
**Depends:** T-013 · **Read first:** 3.1
**Do:** inspect task-board for an existing API. Implement ONLY: editable `taskboardRef` on projects and a link display (`TASKBOARD_API_URL` optional). Do NOT implement automatic task creation unless the owner answers a question you raised in `OPEN_QUESTIONS.md`.
**Accept:** field saved/validated; no network calls to task-board in this task.

### T-041 — Docker, compose, Nginx, README
**Depends:** T-038 · **Read first:** 17
**Do:** Dockerfile (version ARG from package.json), compose (app + worker), `nginx/dossier.conf`, README deployment + restore + first-run checklist.
**Accept:** `docker compose build` succeeds; app and worker start; `/api/health` healthy; a PDF renders inside the container (Arabic text correct); the worker heartbeat appears.

### T-042 — End-to-end tests
**Depends:** T-041 · **Read first:** 16.2
**Do:** Playwright tests listed in 16.2 with test helpers reading outbox rows.
**Accept:** `npm run test:e2e` green locally and in CI (headless).

### T-043 — Security and QA pass
**Depends:** T-042 · **Read first:** 9, 20
**Do:** run every checklist in section 20; fix findings (each fix = its own small commit); record results in `PROGRESS.md`; run `npm audit --omit=dev` and note findings.
**Accept:** all checklist items ticked or explicitly deferred in `OPEN_QUESTIONS.md` with a reason.

---

# 19. Phase 5 backlog (NOT in scope now — do not implement)

Client accounts and portal · contract amendments and credit notes · clause snippet library · Hijri dates · amount-in-words (AR/EN; use a vetted library such as `n2words` plus currency wording, mandatory native-speaker review) · multiple signers per party and signing order · stacked (non side-by-side) bilingual layout · per-language signatory names/titles · strict CSP with nonces · recurring invoices · certified e-invoicing integrations (e.g. ZATCA/Fatoora) · contract annexes/attachments inside the sealed PDF · PKI/qualified e-signature provider · 2FA for team users and email-based password reset · webhooks/public API · PostgreSQL migration · WhatsApp/SMS delivery · stored invoice PDFs.

---

# 20. QA checklists

## 20.1 Functional
- [ ] Owner can set up company profile; defaults apply to new contracts.
- [ ] Contract from each of the 4 templates → complete → send → sign → sealed PDF → emails received.
- [ ] Worked example (21.6) produces exactly the documented numbers in UI and PDFs.
- [ ] Invoice from each milestone: totals equal milestone totals; issue; pay partially; pay fully; void payment; void invoice.
- [ ] Decline, expire (set past deadline), revise → new version → sign again.
- [ ] Verification page for contract and invoice; PDF upload check match/mismatch.
- [ ] Viewer can read but never write; member cannot void/terminate.

## 20.2 Arabic / RTL
- [ ] Every page in Arabic: no clipped or mirrored icons incorrectly; sidebar on the right; numbers/emails/IBAN stay LTR.
- [ ] Mixed text (English name inside Arabic sentence) displays correctly in UI and PDF.
- [ ] Forms: Arabic fields RTL, English fields LTR regardless of UI language.
- [ ] No hard-coded English strings (grep for text literals in `src/app` and `src/components`).

## 20.3 PDF
- [ ] Arabic letters are joined correctly (not isolated forms); diacritics and punctuation sit correctly.
- [ ] Fonts embedded (`pdffonts file.pdf` lists DossierSans/Cairo subset, "emb yes").
- [ ] Footer shows number, code, page `n / N`; page numbers correct for multi-page docs.
- [ ] Tables: header repeats across pages; no row clipped; long clause splits across pages cleanly.
- [ ] Bilingual: EN left / AR right; headings aligned; special blocks full width.
- [ ] Watermarks: draft, void; paid stamp.
- [ ] Sealed PDF: signatures visible, QR scans to `/v/<code>`, certificate page complete.
- [ ] Hostile input (`<script>`, `&`, emoji, RLE/LRE bidi control characters) in names/clauses cannot break layout or execute.

## 20.4 Security
- [ ] Every action/route requires auth or valid token (authorization table test green).
- [ ] Session cookie flags; logout invalidates; password change kills other sessions.
- [ ] Login and OTP rate limits work; tokens not guessable; links die on recall/cancel/expire/sign.
- [ ] Uploads: wrong magic bytes, SVG, oversize rejected; files never served with user-provided names.
- [ ] Public pages have no-store/noindex/no-referrer; no stack traces on errors.
- [ ] No secrets/tokens/OTP in logs, audit meta, or outbox after send.
- [ ] Triggers block mutation of signed contracts, versions, audit log, issued invoices.
- [ ] App not reachable except via Nginx; DB/files permissions restrictive.

## 20.5 Data integrity
- [ ] Numbers gapless for invoices (issue 5, void 1 → numbers 1–5 all exist).
- [ ] `paid_minor` equals sum of non-voided payments for every invoice (query check).
- [ ] For every signed contract: `sha256(canonicalize(version.snapshot)) == contentHash` and `sha256(file) == pdfSha256`.
- [ ] Σ milestone totals == contract total for every contract.
- [ ] Backup restore on a clean machine works.

---
# 21. Appendices

## 21.1 Settings schemas and defaults (`src/lib/validation/settings.ts`)

Settings are stored as one JSON row per key (6.2). `getSettings(section)` returns `schema.parse(storedOrEmpty)` so missing fields get defaults.

```ts
const text = (max = 200) => z.string().trim().max(max, 'errors.tooLong').default('');
const optEmail = z.union([z.literal(''), z.string().trim().email('errors.invalidEmail')]).default('');

export const companySchema = z.object({
  nameAr: text(), nameEn: text(), legalNameAr: text(), legalNameEn: text(),
  crNumber: text(50), taxNumber: text(50),
  addressAr: text(400), addressEn: text(400),
  email: optEmail, phone: text(40), website: text(200),
  logoFileId: z.string().nullable().default(null),
  stampFileId: z.string().nullable().default(null),
  bank: z.object({
    bankNameAr: text(), bankNameEn: text(), accountHolder: text(), iban: text(40), swift: text(20),
  }).default({}),
});

export const defaultsSchema = z.object({
  country: z.string().length(2).default('SA'),
  timezone: z.string().default('Asia/Riyadh'),                     // validated via try { new Intl.DateTimeFormat('en', { timeZone }) }
  currency: z.enum(Object.keys(CURRENCIES) as [CurrencyCode, ...CurrencyCode[]]).default('SAR'),
  taxRateBp: z.number().int().min(0).max(10000).default(1500),
  paymentTermsDays: z.number().int().min(0).max(365).default(14),
  languageMode: z.enum(LANG_MODES).default('bilingual'),
  governingLawAr: text(200), governingLawEn: text(200),
  jurisdictionAr: text(200), jurisdictionEn: text(200),
});

export const numberingSchema = z.object({ prefix: z.string().regex(/^[A-Z0-9]{2,6}$/, 'errors.invalid').default('DOS') });

export const signingSchema = z.object({
  linkTtlDays: z.number().int().min(1).max(90).default(14),
  requireEmailOtp: z.boolean().default(true),
  requireProviderSignatureBeforeSend: z.boolean().default(true),
  consentTextEn: z.string().max(600).default('I have read this agreement and agree to be bound by its terms, and I consent to signing it electronically.'),
  consentTextAr: z.string().max(600).default('أقرّ بأنني قرأت هذا العقد وأوافق على الالتزام بجميع بنوده، وأوافق على التوقيع عليه إلكترونياً.'),
});

export const emailSchema = z.object({
  fromName: text(80).default('Dossier'),
  overdueRemindersEnabled: z.boolean().default(false),
  overdueReminderDays: z.array(z.number().int().min(1).max(365)).max(6).default([1, 7, 14]),
});
```
Internal keys (not user-editable): `worker_heartbeat` → `{ ts: number }`; `worker_state` → `{ lastReminderDate: string|null, lastBackupDate: string|null }`.

**Payment instructions text** (copied to invoices at issue when the invoice's own field is empty), per language:
- EN: `Bank: {bankNameEn} | Account holder: {accountHolder} | IBAN: {iban} | SWIFT: {swift}` (omit empty parts).
- AR: `البنك: {bankNameAr} | اسم صاحب الحساب: {accountHolder} | رقم الآيبان: {iban} | سويفت: {swift}` (omit empty parts).

## 21.2 i18n key skeleton (add keys as needed; both languages in the same commit)

```
common: save cancel delete edit create search filter reset back next previous close confirm yes no actions status date amount total subtotal currency notes loading noResults required optional download preview send copy
nav: dashboard clients projects contracts invoices templates settings users audit account logout
auth: loginTitle email password signIn signingIn invalidCredentials tooManyAttempts changePassword currentPassword newPassword passwordTooShort
clients: title new edit type.company type.individual nameAr nameEn legalNameAr legalNameEn email phone country city addressAr addressEn taxNumber crNumber repNameAr repNameEn repTitleAr repTitleEn preferredLanguage archive unarchive archived
projects: title new edit code status.lead|active|on_hold|completed|cancelled client description startDate endDate budget currency tabs.overview|contracts|invoices|files|activity summary.contracted|invoiced|paid|outstanding|overdue|remaining
templates: title legalNotice type.contract|nda|other system duplicate clauses addClause preview errors.invalidVariable errors.blockMisplaced errors.blocksMismatch
contracts: title new status.draft|sent|declined|expired|signed|completed|terminated|cancelled steps.basics|pricing|schedule|clauses|review fields.* items.* discount.* tax milestones.* validation.* send.* sign.* actions.* tabs.* banner.pdfFailed
invoices: title new status.draft|issued|partially_paid|paid|void overdue fields.* lines.* issue void payments.* actions.* pdf.*
signing: invalidLink otpTitle sendCode codeSent enterCode verify review consent fullName drawSignature typeSignature clear sign decline declineReason signedThanks downloadSigned
verify: title enterCode check valid terminated void notFound uploadPdf match mismatch
dashboard: awaitingSignature signedLast30 drafts outstanding overdue dueSoon revenueMonth expiringSoon recentActivity workerStale
settings: company defaults numbering signing email bank logo stamp testEmail workerStatus
users: title new role.owner|member|viewer canSignForCompany status.active|disabled lastOwner
audit: title entity action actor ip when
errors: UNAUTHENTICATED FORBIDDEN NOT_FOUND VALIDATION_FAILED CONFLICT INVALID_STATE RATE_LIMITED TOKEN_INVALID TOKEN_EXPIRED OTP_INVALID OTP_EXPIRED PAYMENT_EXCEEDS_BALANCE PDF_FAILED EMAIL_FAILED FILE_REJECTED INTERNAL required invalid invalidEmail tooLong tooShort discountExceedsSubtotal milestonesSumMismatch invalidCredentials
emails: (subjects/bodies for the keys of 15.1, both languages)
pdf: labels used inside documents are NOT in messages/*.json; they live in src/server/pdf/labels.ts as { en, ar } pairs (e.g. invoice: {en:'Invoice', ar:'فاتورة'}) so PDFs do not depend on the UI locale.
```

## 21.3 UI term glossary (use exactly these Arabic terms)

| EN | AR | EN | AR |
|---|---|---|---|
| Save | حفظ | Cancel | إلغاء |
| Delete | حذف | Edit | تعديل |
| Create | إنشاء | Search | بحث |
| Send | إرسال | Sign | توقيع |
| Preview | معاينة | Download | تنزيل |
| Dashboard | لوحة التحكم | Settings | الإعدادات |
| Clients | العملاء | Projects | المشاريع |
| Contracts | العقود | Invoices | الفواتير |
| Payments | المدفوعات | Templates | القوالب |
| Users | المستخدمون | Audit log | سجل النشاط |
| Draft | مسودة | Sent | مُرسَل |
| Declined | مرفوض | Expired | منتهي الصلاحية |
| Signed | موقَّع | Completed | مكتمل |
| Terminated | مُنهى | Cancelled | ملغى |
| Issued | صادرة | Partially paid | مدفوعة جزئياً |
| Paid | مدفوعة | Void | ملغاة |
| Overdue | متأخرة | Milestone | دفعة |
| Subtotal | المجموع الفرعي | Discount | الخصم |
| Net | الصافي | Tax / VAT | الضريبة / ضريبة القيمة المضافة |
| Total | الإجمالي | Balance due | المبلغ المتبقي |
| Verification code | رمز التحقق | Provider | المزوّد |
| Client (party) | العميل | Signatory | الموقّع |
| Archive | أرشفة | Owner / Member / Viewer | مالك / عضو / مشاهد |

## 21.4 Error codes (`ErrorCode`)

`UNAUTHENTICATED` · `FORBIDDEN` · `NOT_FOUND` · `VALIDATION_FAILED` · `CONFLICT` · `INVALID_STATE` · `RATE_LIMITED` · `TOKEN_INVALID` · `TOKEN_EXPIRED` · `OTP_INVALID` · `OTP_EXPIRED` · `PAYMENT_EXCEEDS_BALANCE` · `PDF_FAILED` · `EMAIL_FAILED` · `FILE_REJECTED` · `INTERNAL`.
Each has an i18n key `errors.<CODE>` with a user-safe sentence in both languages. For public token pages, `TOKEN_INVALID` and `TOKEN_EXPIRED` both show the same generic "link invalid or expired" message.

## 21.5 Audit actions (`audit_log.action`)

`auth.login` `auth.login_failed` `auth.logout` `auth.password_changed` ·
`user.created` `user.updated` `user.status_changed` `user.password_reset` ·
`client.created` `client.updated` `client.archived` ·
`project.created` `project.updated` `project.status_changed` `project.archived` ·
`template.created` `template.updated` `template.duplicated` `template.archived` ·
`contract.created` `contract.updated` `contract.sent` `contract.viewed` `contract.otp_sent` `contract.otp_verified` `contract.signed` `contract.declined` `contract.expired` `contract.recalled` `contract.cancelled` `contract.completed` `contract.terminated` `contract.link_regenerated` `contract.finalized` `contract.pdf_failed` ·
`invoice.created` `invoice.updated` `invoice.issued` `invoice.sent` `invoice.voided` `invoice.payment_recorded` `invoice.payment_voided` `invoice.reminder_sent` ·
`settings.updated` `file.uploaded` `file.deleted` · `email.failed` · `backup.completed` `backup.failed`.
`metaJson` contains only small non-secret facts (e.g. `{ "from": "draft", "to": "sent" }`, `{ "changedKeys": ["currency"] }`).

## 21.6 Worked example (use as the shared test fixture and as the manual QA reference)

**Parties**: Provider "RED SHADOWS | RS" / "ريد شادوز | RS". Client: nameEn "Al-Noor Trading Co.", nameAr "شركة النور للتجارة", email `contact@alnoor.example`, representative "Khalid Al-Noor" / "خالد النور", title "General Manager" / "المدير العام". Project: nameEn "Online Store", nameAr "متجر إلكتروني", code `P-0001`.

**Contract**: template `web-development`, language `bilingual`, currency `SAR`, tax 1500 bp, discount 5 % (500 bp), start `2026-11-01`, end `2027-01-31`, payment terms 14 days, governing law EN "the Kingdom of Saudi Arabia" / AR "المملكة العربية السعودية", jurisdiction EN "Riyadh" / AR "الرياض".

**Items**
| # | Description EN / AR | Qty | Unit (minor) | Line total (minor) |
|---|---|---|---|---|
| 1 | UI/UX design / تصميم واجهات المستخدم | 1 | 800,000 | 800,000 |
| 2 | Store development / تطوير المتجر | 1 | 1,200,000 | 1,200,000 |

**Totals (minor → display)**: subtotal 2,000,000 → `20,000.00 SAR` · discount 100,000 → `1,000.00` · net 1,900,000 → `19,000.00` · tax 285,000 → `2,850.00` · **total 2,185,000 → `21,850.00 SAR`**.

**Milestones** (percent mode 4000/3000/3000, via `allocateByBp(1_900_000, …)` and `allocateProportional(285_000, amounts)`):
| # | Title | % | Amount | Tax | Total |
|---|---|---|---|---|---|
| 1 | Advance upon signing | 40 | 760,000 | 114,000 | 874,000 |
| 2 | On delivery of the staging version | 30 | 570,000 | 85,500 | 655,500 |
| 3 | On final delivery and acceptance | 30 | 570,000 | 85,500 | 655,500 |
Σ amount 1,900,000 · Σ tax 285,000 · Σ total 2,185,000 ✔.

**Numbers**: contract `DOS-C-2026-0001` (sent on 2026-10-20); invoice for milestone 1 issued 2026-11-01 → `DOS-I-2026-0001`, due `2026-11-15`; partial payment 500,000 on 2026-11-10 → status `partially_paid`, balance 374,000; second payment 374,000 → `paid`.

---

# 22. Known limitations (state them in the README)

1. Simple electronic signatures only (evidence-based), not qualified/PKI; legal effect depends on jurisdiction.
2. Invoices are not certified e-invoices.
3. Single instance, SQLite; in-memory rate limiting resets on restart.
4. Seed legal text is a starting point and must be lawyer-reviewed.
5. Bilingual layout is side-by-side only; signatory name/title is one string per person.
6. No recurring invoices, no amendments/credit notes, no client accounts (see 19).

---

*End of specification. When in doubt: do the smaller thing, keep it immutable, keep it tested, and ask via `OPEN_QUESTIONS.md`.*
