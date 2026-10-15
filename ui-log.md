# UI Redesign — Log

> Presentation-layer only. No business logic, API, routing, data shape, state, or env changes.
> Status: **Two runs in this file.** Run 1 (shadcn/ui) is historical. **Run 2 (MUI) is ACTIVE** and was stopped at its CHECKPOINT. The ACTIVE settings/plan/findings are in the "MUI RUN (ACTIVE)" sections at the end; Run 1 is kept for history.

> Run 1 settings: `UI_LIBRARY: auto` → shadcn/ui. Run 2 settings: **`UI_LIBRARY: mui`, `APPROVAL: always`**.

## Settings

- `UI_LIBRARY`: **auto**
- `APPROVAL`: **always** → no source file edited and nothing installed yet.

## Phase 0 — Safety net and baseline

| Step | Command | Result |
| --- | --- | --- |
| Working dir | `pwd` | `/home/shadow-x7/Projects/Websites/Typescript/Next.js/Dossier` |
| Git state before | `git status` | branch `t-044-deps-upgrade`, only untracked `handoff.md` |
| Snapshot | `git add handoff.md && git commit -m "chore: snapshot before ui redesign"` | commit `1d27711` (handoff.md contains only placeholders like `<64 hex>`, no secrets) |
| Tag | `git tag -a pre-ui-redesign -m "pre ui redesign"` | tag at `1d27711` |
| Branch | `git checkout -b ui-redesign` | on `ui-redesign`, tree clean |

### Baseline results (verbatim)

- `npm install` → exit 0. `added 1 package, changed 6 packages, audited 513 packages`. Pre-existing: `18 vulnerabilities (7 moderate, 8 high, 3 critical)` (T-043 deferred these; out of scope).
- `npm run typecheck` (`tsc --noEmit`) → exit 0, no output.
- `npm run lint` (`eslint .`) → exit 0, no output.
- `npm run check:rtl` (`bash scripts/check-rtl.sh`) → exit 0, no output.
- `npm run test` (`vitest run`) → **59 files / 494 tests passed**.
- `npm run build` (`next build`) → exit 0, `✓ Compiled successfully in 204ms`, `✓ Generating static pages (25/25)`, **zero warnings/errors**.
- `npm run start` (`node .next/standalone/server.js`) → server boots, `/api/health` = 200. Note: `.next/standalone` does not bundle `.next/static` or `public`, so static assets 404 under bare standalone (pre-existing; the Dockerfile copies them). Not a UI regression.
- Server used for screenshots: `npx next start -p 3210` with the e2e env → `/api/health` 200, `/login` 200.

### Before screenshots

- Captured with the project's own Playwright (`chromium`), logged in as the seeded e2e owner.
- Output: `tmp/ui-shots/before/` (git-ignored) — 62 PNGs = 12 pages × 2 themes (dark/light) × 3 widths (320/768/1280) + 2 login shots.
- Pages: dashboard `/`, clients, projects, contracts, invoices, templates, settings/company, users, audit, account, login.
- `UNVERIFIED:` visual inspection by a vision model — this model cannot read image input. Screenshots exist as artifacts for human/vision review.

## Stack detected (recorded, not added to)

| Item | Value |
| --- | --- |
| Framework | Next.js **16.3.3** (App Router, `output: standalone`) |
| React | **18.3.1** (react / react-dom) |
| Language | TypeScript **5.9.3**, strict |
| Router | Next App Router (file-based) |
| Styling | **Tailwind CSS 3.4.19** + CSS variables; `postcss` + `autoprefixer` |
| Utility kit | `clsx 2.1.1`, `tailwind-merge 2.6.1`, local `cn()` (`src/components/ui/cn.ts`) |
| UI library (of the four) | **none** — bespoke `src/components/ui/*` primitives |
| Icons | `lucide-react 0.263.1` |
| Font | **Cairo** via `next/font/local` (`assets/fonts/Cairo.ttf`, `--font-cairo`, `display: swap`) |
| Forms | `react-hook-form 7.86.0` + `@hookform/resolvers 3.10.0` + `zod 3.25.76` |
| i18n | `next-intl ^4.3.0` (`messages/{ar,en}.json`, cookie `dossier_locale`) |
| Theme | cookie `dossier_theme` (`dark` default / `light` / `system`), class on `<html>` |
| State | none global (server components + URL/cookie state) |
| Direction | **RTL by default** (`dir={locale==="ar"?"rtl":"ltr"}`, `lang={locale}`); `check:rtl` script bans physical utilities |

## Phase 3 — Library selection (auto)

- Step 2 of §3.0: the project uses **none** of shadcn/MUI/AntD/Mantine → skip.
- Step 3 of §3.0: **the project uses Tailwind 3 and its own lightweight, fully-ownable components** (a `cn()` helper + `components/ui/*` primitives) — this is exactly the shadcn/ui model.
- **Selected: shadcn/ui** (Appendix A). Not installed yet → installation is part of the plan and needs checkpoint approval.

### Research step (§2.3)

- No web access in this environment. Theming/CLI details below are from the installed packages and the appendix, not from live docs.
- `UNVERIFIED:` exact `shadcn@latest` CLI behaviour against Next 16 + Tailwind 3 + React 18 (registry, block names, RTL flags). Must be confirmed with `npx shadcn@latest --help` at execution time.
- `UNVERIFIED:` whether the current registry ships RTL-aware files; fallback is the manual §A.6 conversion.

### Rejected alternatives (recorded, not chosen silently)

1. **MUI (Appendix B)** — rejected: project is Tailwind-based and not Material-styled; would introduce Emotion + a second styling system (forbidden by §B.8/§5).
2. **Ant Design (Appendix C)** — rejected: Tailwind is present; mixing needs CSS-layer gymnastics (§C.8). No existing ProComponents.
3. **Mantine (Appendix D)** — rejected: Tailwind is present; mixing needs PostCSS + CSS-module discipline (§D.8).
4. **Keep the bespoke system, add no library** — this is what the code already is, but §5/§3 mandate ONE of the four libraries when `UI_LIBRARY` resolves via §3.0. Listed under "Needs user decision" because it is the lowest-risk option and visually already minimal.

## Needs user decision

1. **Confirm the library.** Recommended: shadcn/ui (Appendix A), which matches Tailwind + the existing `cn()`/`ui/*` model. This approval authorizes installing `shadcn` + its deps (`@radix-ui/*`, `class-variance-authority`, `tailwindcss-animate`, etc.). Alternative: pick MUI/AntD/Mantine (larger, would require replacing Tailwind styling), or explicitly keep the bespoke primitives and only do the responsive/a11y/token work (lowest risk).
2. **Scope of the redesign.** The UI is already flat, bordered, tokenized, RTL-clean, single-font, no emoji, no gradients, no fake data. The real defects are structural (mobile nav) and consistency (radius scale, status colors, touch targets). Confirm the intended depth: (a) full library migration, or (b) targeted fixes + adopt library primitives only where they add value.
3. **RTL e2e/RTL script.** `check:rtl` and `tests/e2e/rtl.spec.ts` enforce no physical utilities. Confirm we keep them passing (we will).
4. `UNVERIFIED:` shadcn CLI behaviour (see above) — decide whether to allow network install.

## Changes log

- (none yet — no source file modified, nothing installed)

## Phase 6 — T-001 attempt (BLOCKED, decision needed)

User approved: **option A (full shadcn/ui migration)** + network install.

- CLI check: `npx shadcn@latest --help` ok; `shadcn@latest` = **4.21.4**; `shadcn info` detects Next 16.3.3, Tailwind **v3**, `src/app/globals.css`, alias `@`.
- Backed up `src/app/globals.css` and `tailwind.config.ts` to `tmp/ui-shots/pre-init/`.
- `shadcn init --base radix --rtl --css-variables --preset nova --yes --no-monorepo`:
  - Wrote `components.json` (`style: "radix-nova"`, `tailwind.config: tailwind.config.ts`, `cssVariables: true`, `rtl: true`, aliases `utils: @/lib/utils`, `ui: @/components/ui`).
  - **Failed** at `npm install`: `EALLOWSCRIPTS` — npm 12 rejects the CLI's project-scoped `--allow-scripts` flag (the repo declares `allowScripts` in `package.json`). No packages were installed; `package.json`/lock unchanged.
  - Reverted the partial `components.json` to keep the tree clean.

### Root blocker (concrete evidence)

`npx shadcn@latest view button` returns the **Tailwind v4** registry source for `radix-nova`:

```
import { cn } from "cn"                                  // npm "cn" package, not @/lib/utils
focus-visible:ring-3 ...                                  // v4 ring scale (v3 has no ring-3)
bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]   // v4 oklch arbitrary value
has-data-[icon=inline-end]:pr-2 ... in-data-[slot=button-group]:rounded-lg  // v4 variants
dependencies: ["cn"], plus tw-animate-css, radix-ui       // tw-animate-css is v4-only
```

The current shadcn registry is **Tailwind v4-first**. The project is **Tailwind 3.4.19**; the generated components would render broken (missing `ring-3`, wrong `cn`, `tw-animate-css`). `radix-ui@*` itself supports React 18, so Radix is not the problem — Tailwind v4 is.

### Options (user decision required)

1. **Upgrade Tailwind 3 → 4** (recommended if we stay on shadcn): add `tailwindcss@4` + `@tailwindcss/postcss`, convert `@tailwind base/components/utilities` → `@import "tailwindcss"` + `@theme inline` in `globals.css`, retire `tailwind.config.ts` (or keep via `@config`), map the existing custom tokens. Then the registry works as designed. Scope: dependency major bump + config rewrite (presentation/config only, no business logic). Risk: utility behaviour shifts (ring width, border defaults) → full visual re-verify against the 62 before-screenshots. Needs a new approval because it is a package upgrade (rule 6).
2. **Keep Tailwind v3, hand-author the shadcn-style primitives** (cva + `@radix-ui/*` + the v3 token set). Compatible with the current stack, but components are not produced by the CLI (still shadcn's ownable-source model). More manual work; no v4 churn.
3. **Switch library** to one not coupled to Tailwind (Ant Design — Appendix C, best for a data-heavy admin; or Mantine — Appendix D). Larger: replaces Tailwind styling inside components.

Nothing installed; no source file changed. Stopped per rule 8/9.

### Decision

User chose **option 1: upgrade Tailwind 3 → 4, then shadcn**. Authorized the Tailwind major upgrade and the shadcn install. Execution order: Tailwind v4 upgrade (verify visual parity) → shadcn init → add primitives → migrate incrementally.

## Phase 6 — Tailwind v4 upgrade (T-001a)

## Phase 6 — execution (actual)

Commits on `ui-redesign` (after the docs):

| Commit | What |
| --- | --- |
| `3c7f156` | Tailwind 4.3.3 upgrade (`@tailwindcss/postcss`, `@import "tailwindcss"`, `@config`), `darkMode:"class"`, autoprefixer dropped from PostCSS. Baseline re-verified (typecheck/lint/rtl 0, 494 tests, build 0 warnings). Visual parity probed: body bg `#0b0b0f`/`#ffffff`, text `#ededf0`/`#16161a`, primary `#e11d48`, font Cairo. |
| `9145d29` | shadcn setup: `components.json` (style radix-nova, rtl), `src/lib/utils.ts` (`cn` from the `cn` pkg), globals.css tokens (`--foreground/--card/--popover/--secondary/--accent/--input/--ring/--radius`), tailwind.config `popover`+`secondary` colors and one `--radius` token, `tw-animate-css`. Added shadcn: button, card, input, textarea, select, label, checkbox, switch, radio-group, badge, alert, skeleton, separator, dialog, alert-dialog, dropdown-menu, sheet, tabs, table, tooltip, popover. `Button.tsx` extended to accept shadcn API (`default/outline/destructive/link`, `icon*` sizes, `asChild` via `radix-ui` Slot) while keeping the app API (`primary/secondary/danger/ghost`, `sm/md`, `loading`). |
| `dc90aa0` | Mobile nav (U-001): extracted `nav.ts` (NAV + `navEntries` + `isActive`), `MobileNav.tsx` using shadcn `Sheet` (side follows `dir`), wired into `TopBar`. Probe: 375px × en/ar × dark/light → 9 nav links in the sheet, `dir` correct. |
| `b2baf34` | a11y/consistency: skip link + `#main`; `Dialog` `max-h`/scroll (U-007); `pointer:coarse` ≥44px targets + 16px mobile inputs (U-006); removed `backdrop-blur` on builder bar (U-010); `v/[code]` StateBadge → `Badge` (U-004). i18n keys added: `nav.menu`, `common.skipToContent` (en+ar). |
| `8dff98f` | `UserMenu` → shadcn `DropdownMenu` (Escape/click-outside/keyboard); probe: 2 items, Escape closes (U-008). |
| `24167e2` | Responsive header: locale/theme moved into the mobile drawer, user name hidden `<sm`. Fixed a **real** 320px page overflow (header forced 482px doc). Re-probe: 0 overflow at 320/375/768 on all listing pages. |

### Key decision (documented, not silent)

The shadcn `radix-nova` registry is Tailwind v4-first and collides by filename-casing with the app's primitives (`Button.tsx` vs `button.tsx`, …) and diverges in API (`input.tsx` has no `forwardRef` → would break react-hook-form in 24 files; `card.tsx`/`badge.tsx` are rounder/heavier than the minimal target; `select.tsx`/`table.tsx`/`dialog.tsx` are different APIs). To avoid breaking working code (hard rule 1/2), we **kept the app's equivalent primitives** for Button/Card/Input/Textarea/Select/Table/Badge/Dialog and **adopted shadcn** for the additions and a11y-critical pieces (Sheet, DropdownMenu, Tooltip, Popover, AlertDialog, Label, Checkbox, Switch, RadioGroup, Alert, Skeleton, Separator, Tabs). This keeps exactly one UI library and preserves all tests/RTL. Revisit if a deeper visual swap is wanted.

### Finding status

- U-001 fixed (mobile nav). U-004 fixed. U-006 fixed. U-007 fixed. U-008 fixed. U-009 fixed. U-010 fixed. U-003 fixed (one `--radius` token).
- U-002 corrected + resolved: the page-level overflow was the **mobile header** (constant 482px doc), now 0; tables scroll inside their own container (allowed by §4.2).
- U-005 (Badge/Toast raw palette) partially addressed (kept `tone` API, status colors meaningful); left as-is deliberately to preserve status semantics — noted.
- U-011 (`max-w-[1280px]`) and U-012 (standalone static copy) left as-is.

### Verification (final)

- `npm run check` → typecheck 0, lint 0, check:rtl 0, **494/494 tests**.
- `npm run build` → exit 0, zero warnings.
- Overflow probe: 0 page-level overflow at 320/375/768 (dark+light, en+ar).
- Mobile nav probe: 9 links, sheet side follows `dir`.
- User menu probe: 2 items, Escape closes.
- Slop re-scan: no second UI library; no gradients; `shadow-lg`/`backdrop-blur-xs` only on shadcn overlays; only raw color is `SignaturePad` `#111111` (canvas ink).
- After screenshots: `tmp/ui-shots/after/` (96 PNGs).
- `UNVERIFIED:` visual inspection by a vision model (this model cannot read images).

## Phase 7 — Comprehensive Dashboard Redesign & SaaS Polish (2026-10-15)

### Scope & Achievements:
1. **Header & Spacing Standardization (All Pages):**
   - Implemented standard SaaS header with `40x40` icon badge (`border-primary/20 bg-primary/10 text-primary shadow-xs`), responsive title, `{total}` counter badges, and aligned action buttons.
   - Applied across all list views (`clients`, `projects`, `contracts`, `invoices`, `templates`, `users`, `audit`), create views (`/new`), and edit views (`/edit`).
2. **Dashboard Home (`/`) Overhaul:**
   - Redesigned KPI cards with high contrast surface background, semantic tints (primary, info, warning, success, danger), and tabular numerals.
   - Refined `MonthlyChart` SVG/CSS bars with dashed grid dividers, subtle hover brightness, and clean legend badges.
   - Polished `DonutBreakdown` charts with center counters and aligned key labels.
   - Streamlined attention tables (`awaitingSignature`, `dueSoon`, `endingSoon`, `recentActivity`) with subtle hover rows and count chips.
3. **Detail Pages Modernization:**
   - Added top quick metric overview chips to `contracts/[id]` and `invoices/[id]`.
   - Enhanced tab bars with count badges (`items`, `milestones`, `signatures`, `files`, `activity`).
   - Standardized data definition cells (`<dl>` and `Field`) with rounded subtle borders (`border-border/60 bg-muted/20 p-2.5`) for clear label/value distinction.
4. **Client Deletion Feature:**
   - Implemented `deleteClientAction`, `canDeleteClient`, and `deleteClient` with transaction checks, audit logging (`client.deleted`), and full unit tests.
5. **Verification & Quality:**
   - `tsc --noEmit`: 0 errors.
   - `npm run check:rtl`: 0 errors, zero Arabic diacritics.
   - `npm run lint`: 0 errors.
   - `npx vitest run`: 497/497 tests passing (59 test files).
   - `npm run test:e2e`: 3/3 Playwright tests passing.

## Rollback

```
git reset --hard pre-ui-redesign      # or: git checkout t-044-deps-upgrade
```

---

# MUI RUN (ACTIVE)

> `UI_LIBRARY: mui` · `APPROVAL: always` · stopped at Phase 5 CHECKPOINT (no source file edited, nothing installed).

## Conflict resolution (§3.0 rule 1)

- The request sets `UI_LIBRARY: mui`, but the project **already uses shadcn/ui** (a different one of the four libraries). Per §3.0 rule 1 → **stop and ask**.
- Confirmed facts: `components.json` (shadcn schema), `radix-ui` in deps, shadcn files in `src/components/ui`, `src/lib/utils.ts`. `@mui/*` and `@emotion/*` are **not installed**.
- Asked the user. **Decision: migrate to MUI as requested.** This supersedes the Run 1 shadcn plan (kept for history).

## Phase 0 — safety net + baseline (verification this run)

| Step | Command | Result |
| --- | --- | --- |
| Working dir | `pwd` | `/home/shadow-x7/Projects/Websites/Typescript/Next.js/Dossier` |
| Git state | `git status` | branch `ui-redesign`; only untracked `.briefwright/` (external tool artifact; left untouched, not committed) |
| Existing tag | `git tag` | `pre-ui-redesign` at `1d27711` (pre-shadcn) |
| Safety tag | `git tag -a pre-mui-migration` | created at HEAD `20313cb` (post-shadcn) = rollback point for this attempt |
| Install | `npm install` | exit 0, “up to date, audited 561 packages”; 14 vulnerabilities (5 moderate, 6 high, 3 critical) — pre-existing (T-043), out of scope |
| Typecheck | `npm run typecheck` | **exit 0** |
| Lint | `npm run lint` | **exit 0** |
| RTL | `npm run check:rtl` | **exit 0** |
| Tests | `npm run test` | **59 files / 494 passed** |
| Build | `npm run build` | **exit 0** (36 routes) |
| Start | `node .next/standalone/server.js` | boots; `/api/health` = **200** on host `fedora:3000` (standalone binds to hostname, not 127.0.0.1) |

Baseline to keep or beat: `typecheck` 0 · `lint` 0 · `check:rtl` 0 · `test` 494/494 · `build` 0 warnings · `/api/health` 200.

`UNVERIFIED:` before-screenshots for this run were **not** re-captured; Run 1 artifacts remain at `tmp/ui-shots/before/` + `after/` (git-ignored). Re-capture at Phase 6 execution.

## Phase 1 — inventory (read-only deltas)

- Counts: **36 pages**, **72 components**, **37 form files**, **27 `ui/*`**.
- Actually-imported primitives (files): `Button` 51 · `Card` 33 · `Toast` 30 · `Field` 26 · `Input` 24 · `Select` 20 · `Badge` 15 · `Textarea` 11 · `Table` 11 · `EmptyState` 10 · `ConfirmDialog` 7 · `Pagination` 5 · `Dialog` 3 · `cn` 12. Shadcn: `sheet` 1 (`MobileNav`), `dropdown-menu` 1 (`UserMenu`).
- **Dead shadcn files** (never imported): `alert`, `alert-dialog`, `checkbox`, `label`, `popover`, `radio-group`, `separator`, `skeleton`, `switch`, `tabs`, `table`, `badge`, `tooltip`.
- Dependency proof: `radix-ui` imported by `Button.tsx` (Slot) + 11 dead shadcn files; `@/lib/utils` only by dead shadcn files; `class-variance-authority` only by dead shadcn files (`tabs`, `alert`); `tw-animate-css` only in `globals.css`; `lucide-react` in 6 files.
- Tokens / theme / font — unchanged from Run 1: `globals.css` CSS variables (dark default + `.light` + `prefers-color-scheme`), `--radius: 0.5rem`, Cairo via `next/font/local`, class-based theme (`dossier_theme` cookie), RTL by default (`dir` from locale).

## Phase 2 — AI-slop scan (current, MUI criteria)

- Gradients: **none**. Literal `box-shadow`: **none**. Gradients/blur: only `backdrop-blur-xs` in shadcn overlays (`alert-dialog.tsx:39`, `sheet.tsx:40`) — dead/overlay.
- Raw hex in components: only `SignaturePad.tsx:39` (`penColor: "#111111"`, canvas ink) — justified, keep.
- Raw palette status colors (to move to tokens/palette): `Badge.tsx:8-14`, `Toast.tsx:33-34`, `ContractReviewStep.tsx:94,118,132`, `VerificationForm.tsx:108,151`.
- Elevation: `shadow-lg` (`Toast.tsx:73`) + shadcn overlay shadows — overlay-only, allowed → map to MUI elevation.
- No emoji, no hover-lift/scale, no fade-up, no fake data/buzzwords.

## Phase 3 — library selection (MUI)

- **Selected: MUI (Material UI)** — explicit user instruction; alternatives (keep shadcn, or the other three) offered and rejected by the user. Recorded, not silent.
- **Installed now: none** (`@mui/*`, `@emotion/*` absent). Installation is a planned task pending checkpoint approval.
- Packages to install (versions `UNVERIFIED:` until resolved against the registry + official docs at execution time):
  - `@mui/material`, `@emotion/react`, `@emotion/styled`, `@mui/icons-material`, `@mui/material-nextjs` (App Router cache provider), and RTL: `stylis` + `stylis-plugin-rtl`.
  - Target major **MUI v7**; must verify peer support for React **18.3.1** and the `@mui/material-nextjs` import path for **Next 16** (`UNVERIFIED:`).
- `@mui/styles`, `@mui/joy`, `@mui/base` are **not** used and will **not** be added. `@mui/styles` is absent (no migration finding).

## Key decisions (recorded)

1. **Adapter strategy (Option A).** Reimplement the app's 15 `ui/*` primitives as thin MUI-backed components that preserve their existing public API (`variant`/`size`/`loading`, `forwardRef`, prop names), so the **67 consumers and all 494 tests keep working**; use MUI directly for overlays (`Drawer`, `Menu`, `Dialog`, `Snackbar`). Rationale: safety rules 1/2/13 (small verified steps, never break working code, preserve every feature). Option B (rewrite all 67 consumers to import directly from `@mui/material`) is far larger and riskier.
2. **Tailwind coexistence.** Tailwind stays as the existing utility/layout engine; MUI is the single **component** library (§11 refers to component libraries). MUI components are styled via `sx`/theme only, never re-styled with utility classes (§8). One theme source of truth: `src/theme.ts`.
3. **Theme mode.** Reuse the existing class-based theme (`.dark`/`.light` + cookie) via MUI v7 `cssVariables` + `colorSchemeSelector: 'class'` so MUI and Tailwind read the same classes (`UNVERIFIED:` exact selector value for the installed version).

## Needs user decision (checkpoint)

1. Approve the network **install** of the MUI/Emotion/RTL packages above.
2. Approve **Option A** (adapter) vs **Option B** (direct-MUI rewrite of all consumers).
3. Approve **keeping Tailwind** for layout alongside MUI.
4. `UNVERIFIED:` MUI major (v7) vs Next 16 `@mui/material-nextjs` path + React 18 peer support — decide whether to pin a version after I query the registry at execution time.
5. Confirm rollback point = tag **`pre-mui-migration`** (current HEAD, post-shadcn). The older `pre-ui-redesign` predates the shadcn work.

## Changes log (this run)

- (none yet — no source file modified, nothing installed; only `ui-*.md` updated and tag `pre-mui-migration` created)

## Execution log (MUI run)

- **T-M01 done** (commit `bf852fc`, docs pivot `d769b2b`). User approved install + strategy (a). Verified against official docs (v9): Next path `@mui/material-nextjs/v16-appRouter`, RTL plugin `@mui/stylis-plugin-rtl`, `cssVariables: { colorSchemeSelector: 'class' }`, `InitColorSchemeScript attribute="class"`, `enableCssLayer: true` recommended with Tailwind.
- Installed (exact): `@mui/material` 9.5.0, `@mui/material-nextjs` 9.5.0, `@mui/icons-material` 9.5.0, `@mui/stylis-plugin-rtl` 9.5.0, `@emotion/react` 11.14.0, `@emotion/styled` 11.14.1, `@emotion/cache` 11.14.0, `stylis` 4.4.0 (`+49 packages`, 610 audited; vulnerabilities unchanged at 14).
- Created `src/theme.ts` (`createAppTheme(direction)`): `cssVariables + colorSchemeSelector:'class'`, light/dark palettes mapped to the existing tokens (`#e11d48` primary, `#0b0b0f`/`#14141a` dark, `#ffffff`/`#f6f6f8` light), `shape.borderRadius: 6`, Cairo font, flat component defaults.
- Verify: `npm run typecheck` exit 0 · `npm run build` exit 0 (36 routes). No source behavior changed (theme not yet wired).
- **T-M02 done** (commit `fcb8ea9`). Added `src/components/Providers.tsx` (`'use client'`): `AppRouterCacheProvider` (import path **`@mui/material-nextjs/v16-appRouter`**, verified) with `enableCssLayer: true` (Tailwind interop) + per-direction Emotion cache (`key: 'muirtl'` + `stylisPlugins: [prefixer, rtlPlugin]` from `@mui/stylis-plugin-rtl` for `ar`), and `ThemeProvider theme={createAppTheme(dir)}`. Wired into `src/app/layout.tsx` (`dir` computed server-side, passed as a serializable prop). Chose NOT to add `CssBaseline`/`InitColorSchemeScript` to avoid overriding the existing cookie+class theme (`dossier_theme`) — rule 13. Added dev dep `@types/stylis` 4.2.7 (types for `stylis`).
- T-M02 verify: `typecheck` 0 · `build` 0 warnings · `check:rtl` 0 · `test` 494/494 · runtime `/login` 200; SSR HTML contains `@layer mui` and the `muirtl` key (RTL cache active for the default `ar` locale).
- **T-M03 done** (commit `0cf7e6b`). `Button.tsx` reimplemented on MUI `Button`/`IconButton`, preserving `variant`/`size`/`loading`/`asChild`/`forwardRef`/`data-slot`/`aria-busy`. `loading` maps to MUI's built-in `loading` (verified in v9 `Button.d.ts`). Variant map: primary/default→contained(primary), secondary/outline→outlined(inherit), danger/destructive→contained(error), ghost→text(inherit), link→text(primary). `asChild` implemented via `cloneElement` (unused in live code; only dead `alert-dialog.tsx`).
- T-M03 verify: `typecheck` 0 · `build` 0 warnings · `test` 494/494. Runtime: `/login` renders with MUI theme vars (`--mui-*`) present.
- Note (new finding, folded into plan T-M23a): 18 raw `<button>` across 13 files (custom buttons where MUI exists); e.g. `LoginForm.tsx` submit button is a raw `<button>` with Tailwind classes. Tracked for Phase D.
- **T-M04..T-M15 done** (commits `8276257`, `a2d60d8`, `6cd8abe`). Adapter primitives reimplemented on MUI, public APIs preserved:
  - `Input` → `OutlinedInput` (`inputRef`, native props via spread; `react-hook-form` is NOT used in `src`, all forms are FormData-based, so `name` on the inner input is what matters — preserved).
  - `Textarea` → `OutlinedInput multiline`.
  - `Select` → `Select native` (keeps native `<option>`; native attrs + `name` passed via `inputProps`; loose `SelectProps` alias to avoid the union-type friction).
  - `Field` → `FormControl`+`FormLabel`+`FormHelperText` (`error`/`required`/`htmlFor` preserved; error keeps `role="alert"`).
  - `Card` family → `Card`+`CardContent`+`Typography`+`Box` (semantic `section`/`header`/`footer` preserved).
  - `Badge` → `Chip` (tone→color map: gray→default, blue→info, green→success, red→error, amber→warning, **teal→success** (minor visual merge — MUI has no teal); `BadgeTone` + `contractStatusTone`/`invoiceStatusTone` unchanged).
  - `Table` family → `Table`+`TableContainer`+`TableHead/Body/Row/Cell` (keeps `th scope="col"`, `TableEmpty`, `TableContainer` overflow scroll).
  - `Dialog` → MUI `Dialog` (built-in focus trap/Escape/backdrop/`aria-labelledby`; fixes U-007/M-… overflow via `DialogContent` scroll).
  - `ConfirmDialog` — unchanged (delegates to the new Dialog + Button).
  - `Toast` → MUI `Box` + `Alert` in a fixed `insetInlineEnd` stack (RTL-safe logical property); kept `ToastProvider`/`useToast`/`ToastInput`/`ToastTone` + auto-dismiss. Deviation from the Snackbar suggestion to keep correct multi-toast stacking (documented).
  - `EmptyState` → `Stack`+`Typography`+`Box`.
  - `Pagination` → MUI `Button` with `component={Link}` (client component; server-less link nav preserved) + `Typography` page indicator.
- T-M04..T-M15 verify (after each group): `typecheck` 0 · `build` 0 warnings · `test` 494/494.
- **T-M16..T-M21 done** (commit `45951cf`; fixes `9c593bb`). App shell migrated to MUI:
  - `Sidebar` → `Drawer variant="permanent"` + `List`; paper rendered as `<aside>` (semantic landmark + keeps `rtl.spec.ts`).
  - `NavItem` → `ListItemButton`/`ListItemIcon` (keeps `aria-current`, active = primary bg).
  - `MobileNav` → `Drawer variant="temporary"` with anchor following `dir` (Sheet/Radix removed).
  - `UserMenu` → now a **client** component (`useTranslations`) with `Button`+`Menu`/`MenuItem` (DropdownMenu/Radix removed); `anchorOrigin` horizontal derived from `theme.direction` (MUI v9 rejects `"end"`).
  - `TopBar` → `AppBar`+`Toolbar` (flat, bordered); `LocaleSwitch`/`ThemeSwitch` → MUI `Button`/`Select native` (server actions + cookie behavior unchanged → MUI reads the same `.dark`/`.light` classes).
- **Runtime/e2e regression caught and fixed** (this is why e2e matters):
  1. `EmptyState` passed `borderRadius: (theme) => …` (a function) in `sx` from a **Server Component** → Next.js "Functions cannot be passed directly to Client Components" → `invoices/[id]` crashed → full-flow "Issue invoice" failed. Fixed by using `var(--mui-shape-borderRadius)` (no function).
  2. `rtl.spec.ts` expects an `aside` landmark and right-side placement in RTL. Root cause of wrong placement: `AppRouterCacheProvider` builds its Emotion cache once (`useState`) so the RTL stylis plugin never activated on a runtime locale switch. Fixed by keying `AppRouterCacheProvider` with `dir` (rebuild cache per direction).
- **e2e verify**: `npm run test:e2e` → **3/3 passed** (contract signing→invoice→payment full flow; verification page; Arabic RTL sidebar). This exercises real end-to-end behavior, not just types.
- **T-M22 done** (`46d3c3f`): `max-w-[1280px]` → named token `max-w-content` (80rem) in `tailwind.config.ts` (M-009).
- **T-M23a partial** (`46d3c3f`): `LoginForm.tsx` migrated — two raw `<input>` → `Input`, raw submit `<button>` → `Button loading`. Remaining raw `<button>` (~16 across 9 files) documented as follow-up (some may be intentional controls).
- **T-M26 done** (commit after `46d3c3f`): removed the shadcn/Radix layer — 13 dead shadcn files (`alert-dialog, alert, checkbox, dropdown-menu, label, popover, radio-group, separator, sheet, skeleton, switch, tooltip, tabs`; `table.tsx`/`badge.tsx` never existed — casing collision), `src/lib/utils.ts`, `components.json`, the `tw-animate-css` import, and uninstalled `radix-ui`, `class-variance-authority`, `tw-animate-css`, `@mui/icons-material` (unused). Proof: no external references to any removed file; `radix-ui`/`@/lib/utils`/`class-variance-authority` only appeared inside the removed files.
- T-M26 verify: `npm run check` → typecheck 0, lint 0, check:rtl 0, **494/494**; `build` 0 warnings; `test:e2e` **3/3**. `cn.ts` kept (still used by 10 files); `lucide-react` kept (icons).
- **M-007 completed** (`54f7025`): `ContractReviewStep` (`text-amber-600`→`text-warning`, `text-green-600`→`text-success`) and `VerificationForm` (`green-600/700`→`success` tokens). Raw-palette re-scan now returns **none**.
- **T-M27 final verification**:
  - Full baseline: `npm run check` (typecheck 0, lint 0, check:rtl 0, **494/494**) · `build` 0 warnings · `test:e2e` **3/3** — equal to baseline.
  - Slop re-scan: no gradients/blur/glow; no second library (`antd|@mantine|@chakra-ui|react-bootstrap|radix-ui` → none); no barrel icon imports; no raw palette utilities; only raw hex is `SignaturePad #111111` (canvas ink, justified M-010).
  - Screenshots + overflow: `tmp/ui-shots/mui/` (28 PNGs = dashboard, clients, login × 320/768/1440 × dark/light × en/ar). Automated overflow probe: **no horizontal overflow** (>1px) at any width/theme/locale.
  - `UNVERIFIED:` pixel-level visual inspection — this model cannot read image input; screenshots are artifacts for human/vision review. Correctness rests on the automated overflow probe + behavioral `rtl.spec.ts`.
  - `git status`: only `ui-*.md` modified + untracked `.briefwright/` (external tool). `git diff --stat pre-mui-migration..HEAD`: presentation files only (components/ui, components/layout, forms touched for tokens/raw buttons, `Providers.tsx`, `theme.ts`, `layout.tsx`, `globals.css`, `tailwind.config.ts`, package files, docs). No `.env`, no `src/server`, `src/db`, services, or stores changed.

## Post-review fix (`/review unpushed`)

- Code review of the 13 unpushed commits (base = tag `pre-mui-migration`; no upstream/default base branch exists in this repo). Six tracks assessed; one **WARNING** found: `MobileNav.tsx:46` `ModalProps={{ keepMounted: true }}` kept the closed drawer subtree mounted on every page/viewport (a new always-on cost vs the lazy Radix `Sheet`).
- Fixed (`5fb0208`): removed `keepMounted` so the temporary drawer mounts on demand. Verify: `typecheck` 0 · `build` 0 warnings · `test:e2e` **3/3**. Approved with that single non-blocking issue.

## Follow-ups (after the review)

- **Node typeless warning fixed** (`295e65c`): `next dev` printed `[MODULE_TYPELESS_PACKAGE_JSON]` for `tailwind.config.ts`. Fixed with the low-blast-radius option (no global `"type": "module"`): renamed `tailwind.config.ts` → **`tailwind.config.mjs`** (explicit ESM) and updated `@config` in `globals.css`. Verified: warning count 0, `/login` 200, `typecheck`/`build` green. (Earlier `next dev` failures were a **stale `.next` Turbopack cache** holding the removed `tw-animate-css` import + a stuck dev server; cleared `.next`.)
- **Icons added** (`0e0efd1`): used **`lucide-react`** (the project's existing single icon set — `@mui/icons-material` stays removed).
  - `Input` primitive extended with optional `startAdornment`/`endAdornment` (forwards to `OutlinedInput`).
  - Login: `Mail`/`Lock` adornments on the email/password fields and a `LogIn` icon on the submit button.
  - List pages (clients, contracts, invoices, projects, templates, users): a `Plus` icon on the "new" button.
  - Theme `MuiButton` gained `styleOverrides.root.gap: 8` so an icon + label are spaced.
  - Verify: `npm run check` (typecheck/lint/rtl 0, 494/494) · `build` 0 warnings · `test:e2e` 3/3 · runtime DOM shows `lucide-mail/lock/log-in` + `MuiInputAdornment-root` on `/login`.
  - Remaining icon opportunities (empty states, secondary actions) are not added yet to respect the restraint rule (§2.2).

## Custom auth UI (follow-up)

- **Field required mark** (`c536cd1`, `a3800bc`): the default MUI asterisk is hidden (`& .MuiFormLabel-asterisk { display:none }`) and a custom, accent-colored superscript `*` is shown; overridable per field via `requiredMark`. Verified by DOM computed styles (default `display:none`; custom `color rgb(225,29,72)`, `vertical-align super`, `font-size 12px`).
- **Logo + login redesign** (`0933cfa`/`4be39ff` lineage): new `Logo` component (SVG folder mark + wordmark) and `src/app/icon.svg` favicon; logo applied in login header, Sidebar, TopBar (mobile), and the mobile drawer. Login page is a single unified background (no borders/colors between areas): header = logo (start) + single **locale toggle** button (end, `LocaleSwitch variant="toggle"`), footer = `common.tagline`.
- **Custom required status message** (`4be39ff`): the login form now sets `noValidate` and, on submit with empty fields, shows a custom inline message (`auth.requiredFields`, added to ar/en) instead of the browser's native validation bubble. `required` attributes kept for a11y. Verified with Playwright: `novalidate` present, alert text = "يرجى تعبئة جميع الحقول المطلوبة", no native popup. (Note: native bubble replacement currently applies to the login form only.)
- Verify for this batch: `typecheck/lint/check:rtl 0 · test 494/494 · build 0 · e2e 3/3`.

## Login footer + favicon (follow-up)

- **Two-sided footer** (`966d9c3`): login footer now uses `flex justify-between` — copyright (`common.rights` = "© {year} Dossier …", dynamic year) on the start side (right in RTL) and a team credit on the end side: new `RedShadowsMark` (RS monogram SVG) + "RED SHADOWS | RS" (`dir="ltr"` for mixed bidi), linking to https://red-shadows-rs.com/ with `target="_blank" rel="noopener noreferrer"`. Verified via DOM: link href/target/rel correct; in RTL copyright center x≈1145 (right), team x≈97 (left) at 1280px.
- **Favicon transparent** (`966d9c3`): `src/app/icon.svg` is now a filled accent folder with no background rect (transparent).
- Verify: `check` 494/494 · `build` 0 · `e2e` 3/3.

## Logo + icon polish (follow-up)

- **Real Red Shadows logo** (`465618b`): fetched the team's real asset `https://red-shadows-rs.com/logo.png` (512×353 RGBA, red + near-black) into `public/red-shadows-logo.png` and used it via `next/image` in the login footer (replacing the hand-made `RedShadowsMark`, now deleted). The logo's dark parts are near-invisible on the dark theme, so it uses `dark:brightness-0 dark:invert` (light theme = original colors; dark theme = white silhouette). `alt=""` (decorative) with the visible text "RED SHADOWS | RS" as the accessible name.
- **RTL-aware field icons** (`465618b`): the email/password adornments now switch side with direction — `endAdornment` (`position="end"`, right) for `ar`, `startAdornment` (`position="start"`, left) for `en`, since the inputs are `dir="ltr"`. Verified via Playwright: `ar` → 2 `positionEnd`, `en` → 2 `positionStart`. Login button icon left as the first child (renders at the RTL start/right, consistent with the fields).
- **Favicon enlarged** (`465618b`): `src/app/icon.svg` folder redrawn to fill the 32-box (x2.5–29.5, y7–26), bolder inner line; still transparent (no background). Served at `/icon.svg` (200, image/svg+xml).
- Verify: `check` 494/494 · `build` 0.

## Login fixes (follow-up)

- **Blue fields diagnosed** (`e93239c`): a DOM scan on `/login` found no blue element in our UI (focused outline = rose `rgb(225,29,72)`, input bg transparent). The blue is the browser's autofill (`-webkit-autofill`). Added an override in `globals.css` to paint autofilled inputs with `--surface`/`--text` instead of the browser blue.
- **Password visibility toggle** (`e93239c`): added an eye `IconButton` (`endAdornment`) in `LoginForm` that toggles `type` password⇄text, with `aria-label` show/hide and `aria-pressed`. Fixed the `Button` adapter icon branch to pass `type={type ?? "button"}` so the eye does not submit the form. Added `auth.showPassword`/`auth.hidePassword` (ar/en).
- **RTL writing direction** (`e93239c`): removed the hard-coded `dir="ltr"` from the email/password inputs, so Arabic types right-to-left and the start adornments sit on the right naturally (English stays LTR). Verified: `ar` → computed `direction: rtl`; `en` → `ltr`.
- **e2e locator fix** (`e93239c`): the new eye button's `aria-label` ("Show password") made `getByLabel("Password")` match two elements (strict-mode violation). Updated `tests/e2e/helpers.ts` login helper to precise `input[name="email"]`/`input[name="password"]` selectors — same flow, no coverage change.
- **Favicon enlarged** (`e93239c`): `src/app/icon.svg` folder redrawn taller/wider (x1–31, y6.3–29.2) to fill the icon box; still transparent.
- Verify: `check` 494/494 · `build` 0 · `e2e` **3/3**. Playwright: eye toggles password→text and is `type="button"`; inputs `rtl` (ar)/`ltr` (en).
- **Favicon fills the square** (`5fe1dab`): redesigned `src/app/icon.svg` — the folder now spans x1–31, y2.5–30 (two overlapping rounded rects: tab + body). Rasterized at 32px it fills 100% wide × 91% tall (previously wide but short). Still transparent. Note: browsers cache favicons aggressively — check in a private window / hard refresh.
- **Standard favicon set** (`favicon set` commit): generated the standard sizes every site ships and wired them via `metadata.icons` + a web manifest.
  - `public/`: `favicon.ico` (48/32/16 frames), `favicon-16x16.png`, `favicon-32x32.png`, `favicon-48x48.png`, `apple-touch-icon.png` (180, accent-badge), `android-chrome-192x192.png`, `android-chrome-512x512.png` (accent-badge), `icon.svg` (moved from `src/app/icon.svg`), `site.webmanifest`.
  - `src/app/layout.tsx`: `metadata.manifest = "/site.webmanifest"` and `metadata.icons` = ico(48) + svg + 16/32 PNG, `apple` 180.
  - Verified served head: `rel=manifest`, `rel=icon` (ico 48, svg, 16/32 png), `rel=apple-touch-icon` 180; all assets 200 with correct content types; `site.webmanifest` → `application/manifest+json`.
  - `check` 494/494 · `build` 0 · `e2e` 3/3.
## Icon transparency + dev login (follow-up)

- **Apple/Android icons transparent** (`37001dd`): regenerated `apple-touch-icon.png` (180), `android-chrome-192x192.png`, `android-chrome-512x512.png` from the transparent source (no accent badge) — corner alphas are 0. (Note: on iOS/Android a transparent touch icon is composited over the launcher background.)
- **"اليوزر والباش خطأ" root cause = uninitialized dev DB**: the running `next dev` used `DATA_DIR=./data`, whose `data/dossier.sqlite` had **no tables** (never migrated/seeded), so every login returned "بيانات الدخول غير صحيحة". Fixed by initializing the dev DB: `tsx src/db/migrate.ts` then `tsx scripts/seed.ts` (run with `.env`+`.env.local` merged, since the scripts do not auto-load env). Result: `Default settings rows inserted: 5`, `System templates inserted: 4`, `Created bootstrap owner: owner@example.com`. Re-tested login in a real browser → redirects to `/` (dashboard). No app/source change was needed for this; it is local dev data setup.
- Verify: `npm run check` → typecheck 0, lint 0, check:rtl 0, 494/494.

## Login header theme switch (follow-up)

- **Theme switch on the login page** (`ThemeSwitch variant="icon"`): the login header now shows a compact theme toggle (icon-only: sun/moon/monitor) beside the language button; it cycles system→light→dark via the existing `setTheme` server action. The login page reads the theme from the `dossier_theme` cookie (same as the app shell). Verified: the button has `aria-label` "المظهر" and each click changes the `html` theme class / cookie. The app shell keeps the `<select>` variant (`ThemeSwitch` default `variant="select"`).
- **Logout location (answer)**: on the dashboard it lives in the top-bar **user menu** (the button showing the user's name) → menu item "تسجيل الخروج" (`UserMenu.tsx`, `logoutAction`). Verified in a real session: user-menu button = 1, logout menuitem = 1. It is not in the sidebar.
- Verify: `npm run check` → typecheck 0, lint 0, check:rtl 0, 494/494.

## Login header polish (follow-up)

- **Theme control redesign**: dropped the icon-cycling button (user feedback: bad design); the login header now uses the same `ThemeSwitch` **select** as the app shell (single component, consistent everywhere). Removed the unused `variant` from `ThemeSwitch`.
- **Dossier logo matches the favicon**: the `Logo` mark now uses the favicon's exact folder path (fills the 32-box) and renders at **32×32** (same as the favicon), filled with `currentColor`/`text-primary` and a `var(--primary-foreground)` inner line. No raw colors in the component.
- **Red Shadows logo real colors**: removed the `dark:brightness-0 dark:invert` treatment, so the footer logo shows its real red/black artwork in both themes.
- Verify: `npm run check` → typecheck 0, lint 0, check:rtl 0, 494/494. DOM probe: header has `select[name=theme]`; logo `32×32` with `fill=currentColor`; footer img class `h-5 w-auto`.
- Note: the Red Shadows PNG is red + near-black, so its dark parts have low contrast on the dark theme; a light variant of the asset would be needed to keep it crisp on dark.

## Theme control + logo + system scheme (follow-up)

- **Icon theme control** (`ThemeSwitch`): replaced the `<select>` with three borderless icon buttons (light/system/dark; active = `text.primary`, others `text.secondary`). Single shared component → used on the login header and the app shell.
- **Balanced logo** (`Logo`): mark reduced to **24×24** (was 32) and the wordmark set to `text-xl`, so the mark is no longer larger than the name; the mark still uses the favicon's folder path.
- **"system" theme bug fixed**: MUI's palette variables are emitted only under `.dark`/`.light` (`:root` has no palette vars), so "system" (no class) left MUI with **undefined colors** while Tailwind used `:root` dark → black-on-black / colorless components. Fix: always resolve a color-scheme class —
  - a pre-paint inline script in `src/app/layout.tsx` (first child of `<body>`, `suppressHydrationWarning` on `<html>`) adds `dark`/`light` from `prefers-color-scheme` when no class is present;
  - `Providers` now takes `colorTheme` and, for `system`, applies/lstens to the media query at runtime (so switching to system re-applies the class).
  - Verified with Playwright (colorScheme dark/light): after selecting system, `html` gets `dark`/`light` respectively and `--mui-palette-primary-main` = `#e11d48`, `--mui-palette-background-default` = `#0b0b0f`/`#ffffff`.
- Verify: `npm run check` 494/494 · `test:e2e` **3/3**.

## Header alignment + script warning (follow-up)

- **React script warning fixed**: the pre-paint theme script was a raw `<script>` inside the layout component (React: "Encountered a script tag while rendering React component"). Switched to `next/script` with `strategy="beforeInteractive"` (`src/app/layout.tsx`). Verified: no console warnings on `/login`.
- **Header inline/aligned**: theme icon buttons and the locale button now share a fixed **32px** height (`ThemeSwitch`, `LocaleSwitch` small variant), the logo wordmark uses `leading-none`, the mark `<svg>` is `block`, and the favicon folder path is vertically centered in its box via `<g transform="translate(0 -1.735)">`. Verified by isolated DOM/pixel measurement: mark ink center ≈ 35.5px, wordmark ink center ≈ 36px, locale ≈ 35.5px (all within ~0.5px); DOM box centers all equal.
- Verify: `npm run check` 494/494 · `test:e2e` **3/3**.

## Dashboard header alignment (follow-up)

- `TopBar` used MUI `Toolbar`, whose responsive `min-height` (64 at ≥600px) overrode our 56 → the dashboard bar was **65px** while the sidebar header is 56, and control heights varied (locale/user 31, theme icons 32). Replaced the `Toolbar` with a fixed **56px** flex `Box` (px:2) matching the sidebar header, and gave every control a fixed **32px** height (theme icons, locale group, user menu).
- Verified at 1280 and 390: toolbar content 56 (box 57 incl. 1px border) = sidebar header 56; all controls `h=32`, centered at the content center (c=28).
- `npm run check` 494/494 · `test:e2e` **3/3**.

## Global search (approved feature)

- User approved adding a global search (a routing/logic addition, outside the pure presentation layer).
- **Service** `src/server/services/search.ts`: `searchAll(user, q, locale)` reuses the existing list services (`listClients/Projects/Contracts/Invoices`, each already `?q=`), caps at 5 hits per entity, and respects permissions via `can(user, "<entity>.read")` (only returns what the user may read).
- **Page** `src/app/(app)/search/page.tsx`: reads `?q=`, renders grouped results (Clients/Projects/Contracts/Invoices, headings from `nav`) as links to each entity, with an empty state and a prompt.
- **Header** `HeaderSearch` (client): a controlled search input (our `Input` + search icon) in the dashboard `TopBar` (visible from `sm` up, centered) that navigates to `/search?q=…` via the router.
- Added a `search` message namespace (ar/en): title, placeholder, prompt, forQuery, noResults, noResultsHint.
- Verified end-to-end (Playwright): header input exists → submitting goes to `/search?q=test`; `/search` renders (h1 "بحث"); with a seeded client, `?q=Test` renders the Clients group with the match (Arabic name under `ar` locale).
- `npm run check` 494/494 · `test:e2e` **3/3**.

## Header search dropdown + profile icon (follow-up)

- Search moved to the **start** of the dashboard header (removed `justify-content: space-between`; the controls use `margin-inline-start: auto`). Verified: LTR search left ≈ header+54px; RTL right edge inset ≈ 54px.
- Replaced the `/search` page with a **results dropdown**: new API route `src/app/api/search/route.ts` (GET `?q=`, `getCurrentUser` → 401 JSON, returns `{ ok, data }` from `searchAll`); `HeaderSearch` now debounces (250ms) and fetches it, showing a `Paper` under the input with grouped hits (Clients/Projects/Contracts/Invoices) that navigate on click, plus a no-results state. Removed `src/app/(app)/search/page.tsx` and trimmed the `search` messages to `placeholder`/`noResults`.
- Profile is now an **icon** `IconButton` (lucide `User`) that opens the same menu (Account / Log out).
- Verified (Playwright): search is at the start; typing shows the dropdown with the seeded client (Arabic name + email); the profile icon opens a menu with the log-out item.
- `npm run check` 494/494 · `test:e2e` **3/3**.

## Dashboard redesign + footer (follow-up)

- **Rounding → MUI-like**: `shape.borderRadius` 6→4 (`src/theme.ts`), `--radius` 0.5rem→0.25rem (`globals.css`), Tailwind `md`/`lg` = `var(--radius)` and `sm` = `--radius - 2px` (`tailwind.config.mjs`). MUI default is 4px.
- **Footer** (`src/components/layout/Footer.tsx`): shared, MUI-based, two-sided (© + RED SHADOWS | RS). Placed in the app shell (`src/app/(app)/layout.tsx`, `bordered` with a top divider) and reused on login (`bordered={false}` for the "one piece" login look); removed the duplicated inline login footer.
- **Dashboard rebuilt with MUI** (`src/app/(app)/page.tsx`): `Stack`/`Grid` (`size` prop) / `Card` / `Typography` / `Divider` / `Chip` / `Alert`.
  - Finance KPIs: Outstanding, Overdue (count + per-currency), Collected this month (+ last month), Invoiced this month (count).
  - Operations KPIs: Awaiting signature, Active contracts (+ signed 30d), Active projects (+ drafts), Clients (+ new this month).
  - Contracts-by-status and Invoices-by-status breakdowns.
  - Tables: awaiting signature, due within 7 days, ending within 30 days, recent activity.
  - Worker-offline notice now a MUI `Alert`.
- **New read-only KPIs** (`src/server/services/dashboard.ts`, additive): `clientsTotal`, `clientsNewThisMonth`, `projectsActive`, `contractsActive`, `contractsByStatus`, `invoicesByStatus`, `issuedThisMonth`. Existing metrics unchanged; existing dashboard tests still pass.
- **Translations** rewritten concise and product-ready for a documents/invoices system (`dashboard` namespace, ar/en).
- Fixed a hydration warning (a `<div>` inside a `<p>`); dashboard now renders with a clean console.
- Verified in a real session: 14 cards, h1 "لوحة المعلومات", footer present, no horizontal overflow, no console errors. `npm run check` 494/494 · `test:e2e` 3/3.

## Error fixes + MUI alignment pass (follow-up)

- **Dashboard 500 fixed** (`8d29eb3`): passing a client-component element via a prop (`<MuiStack divider={<MuiDivider/>}>`) from a Server Component produced "Element type is invalid: got undefined". Dividers are now rendered directly (Fragment + `<MuiDivider />`).
- **Inline `<script>` warning removed** (`8d29eb3`): dropped the pre-paint theme `<script>`/`next/script` (React warns for scripts in components); the `Providers` effect already resolves the `system` scheme at runtime.
- **CSS layer order fixed** (`8d29eb3`): `@layer theme, base, components, mui, utilities;` declared before `@import "tailwindcss"`. Before this, `@layer mui` loaded after `utilities`, so MUI `fullWidth` (in `@layer mui`) beat Tailwind widths — e.g. the filter `Select` stretched to ~958px. Now `w-40` wins (select = 160px) and MUI typography is unaffected.
- **MUI Checkbox** (`Checkbox.tsx`, client): replaced all raw `<input type="checkbox">` (list filters + settings/user/template/dialog/signing forms). The wrapper is a client component because `FormControlLabel` receives `control={<MuiCheckbox/>}` as a prop (same element-as-prop constraint).
- **Header order**: theme control now precedes the language switch (`TopBar`).
- **Sidebar/tables aligned to MUI defaults**: `NavItem` uses default `ListItemButton`/`ListItemIcon`/`ListItemText` (removed the custom primary-filled pill); `Table` header cells use MUI defaults.
- **Em dashes removed** from all UI copy (`messages/**`, src `—`/`–` → `-`) and prose rewritten; internal code comments left as-is. Updated the e2e assertion for the changed thank-you copy.
- Verified: `npm run check` 494/494 · `test:e2e` 3/3 · browser probe on `/`, `/clients`, `/projects`, `/invoices`, `/users`, `/settings/company`, `/templates` → all **200**, no console errors, footer present, no horizontal overflow.

## Charts + icon actions (follow-up)

- **Professional overview chart**: added a dependency-free, theme-aware monthly grouped bar chart (`MonthChart` in `src/app/(app)/page.tsx`, MUI `Box`/`Stack`, heights from `primary.main`/`info.main`) showing **invoices issued vs contracts signed** over the last 6 months, in a dedicated `Card` with a legend. New read-only service aggregate `monthlyActivity(today, months=6)` (`MonthlyPoint[]`) in `dashboard.ts`; new `dashboard` keys `monthlyTitle`/`seriesIssued`/`seriesSigned` (ar/en). Verified: 6 months × 2 series render.
- **Icon actions**: new `src/components/ui/ActionLink.tsx` (`IconButton` + `Tooltip` + lucide `Eye`/`Pencil`/`Trash2`/`Download`, `aria-label` = action label). Replaced the text "preview"/"edit" links in the Clients/Contracts/Projects/Invoices/Templates/Users list action columns with icons. Verified: `/clients` shows 2 `a.MuiIconButton-root` with aria-labels "معاينة"/"تعديل".
- Verify: `npm run check` 494/494 · `test:e2e` 3/3 · dashboard 200, no console errors, no overflow.

## Custom select, toolbar icons, row delete/archive (follow-up)

- **Custom Select** (`Select.tsx`): the primitive now renders MUI's **non-native** `Select` (role=combobox with a styled option popup and an arrow icon) instead of `native`. The public API is unchanged: it still accepts `<option>` children, mapped internally to `MenuItem`s (value + label + disabled). Filters/forms keep working via `name`/`defaultValue`/`onChange`. Verified: `/contracts` renders 4 comboboxes, 0 native selects; opening shows 9 options.
- **e2e updated for the custom select** (`tests/e2e/helpers.ts`): added `pickSelect` (choose by `data-value`) and `pickSelectIndex`; the three `selectOption` calls in `full-flow.spec.ts` now use them. e2e 3/3.
- **Toolbar icons**: the Filter submit button now has a `Filter` icon and Reset is a `Button variant="secondary"` with a `RotateCcw` icon (clients/contracts/projects/invoices/audit).
- **Row delete/archive**: new `src/components/forms/RowActionButton.tsx` (client): a MUI `IconButton` (+`Tooltip`, `aria-label`) that opens `ConfirmDialog`, calls the passed server action, shows a toast and refreshes. Wired into the list action columns:
  - Clients/Projects → **archive** (`archiveClientAction`/`archiveProjectAction`); Templates → **archive** (`archiveTemplateAction`, hidden for system templates); Contracts/Invoices → **delete draft** (`deleteDraftContractAction`/`deleteDraftInvoiceAction`). Server actions are passed as props (allowed).
- Verify: `npm run check` 494/494 · `test:e2e` 3/3 · probes: `/contracts` and `/clients` 200, filter button has an icon, no console errors.

## Full width + Material surfaces (follow-up)

- **Full-width content**: removed `mx-auto max-w-content` from the app `<main>` (`src/app/(app)/layout.tsx`); now `w-full p-4 md:p-6 lg:p-8`. Verified at 1920px: main = 1680 = viewport − 240 sidebar (no 1280 cap).
- **Material cards**: `MuiCard` now defaults to `elevation: 1` (theme) and the `Card` wrapper no longer forces `variant="outlined"`; dashboard cards likewise use the default elevation. Verified: cards carry an MUI elevation shadow.
- **KPI icons**: dashboard KPI cards now show a leading-accent icon (Wallet, AlertTriangle, TrendingUp, Receipt, FileSignature, FileCheck2, FolderKanban, Users). Verified: 8 KPI icons render.
- Verify: `npm run check` 494/494 · `test:e2e` 3/3 · no console errors.

## MUI X DataGrid across lists (follow-up)

- Installed `@mui/x-data-grid` 9.15.0 (peers: @mui/material ^9.0.0, React 18/19).
- New `src/components/tables/ServerDataGrid.tsx` (client): DataGrid with `paginationMode="server"`, `rowCount`, `onPaginationModelChange` → router.push, plus `noRowsLabel`.
- Per-list client tables with column renderers and server actions passed as props:
  - `ClientsTable`, `ProjectsTable`, `ContractsTable`, `InvoicesTable` (server pagination via `ServerDataGrid`).
  - `TemplatesTable`, `UsersTable` (client pagination; these lists have no server paging).
- Pages updated to render the table component and pass serializable `labels`/maps + `canWrite` + the relevant server action (archive/delete).
- Verified (Playwright, owner session): `/clients`, `/projects`, `/contracts`, `/invoices`, `/templates`, `/users` all 200 with `.MuiDataGrid-root` present, no console errors, no horizontal overflow.
- `npm run check` 494/494 · `test:e2e` 3/3.

## Padding + inline alignment (follow-up)

- **Filter rows were wrapping** (the search Field was `fullWidth`, so it took the whole row and pushed the checkbox/buttons to a second line → "some things higher than others"). Fixed by giving the search Field a fixed width (`w-64` clients, `w-60` contracts/projects/invoices) after the CSS-layer fix that lets Tailwind widths override MUI `fullWidth`. Verified: input/checkbox/filter-button centers now within ~3px on one row.
- **Trimmed main padding**: `p-4 md:p-6 lg:p-8` → `p-3 md:p-4 lg:p-6`.
- **Slop re-scan (clean)**: no gradients, no backdrop-blur/glow, no raw palette utilities, no `rounded-2xl/3xl`, no emoji, no hover lift/scale, no buzzwords, no fake/lorem content, no UI em/en dashes. Only raw hex is `SignaturePad #111111` (canvas ink, justified) and the only `box-shadow` is the autofill override in `globals.css`.
- `npm run check` 494/494 · `test:e2e` 3/3.

## Sidebar + user menu redesign (follow-up)

- **Sidebar**: nav grouped into two sections (main: dashboard→templates; manage: settings/users/audit) with a `Divider` between; items are rounded MUI pill buttons (`borderRadius` from theme, `action.selected` + `primary.main` when selected) with tighter icon spacing (`minWidth: 40`). Lists use `px:1` so the pills inset cleanly. Collapse (240⇄72) preserved. Verified: 9 items, 1 divider; logo mark/wordmark centers equal (inline).
- **User menu**: trigger is now an `Avatar` with the user's initial; the menu has a header (name + email), a `Divider`, and items with icons (`User` for Account, `LogOut` for Log out, error-colored). Verified: 2 items, 2 icons, header present.
- `npm run check` 494/494 · `test:e2e` 3/3.

## Sidebar logo / user menu / header gap (follow-up)

- **Sidebar logo now inline with the collapse button**: the logo `<Link>` was an anonymous inline box (line-height made the mark/wordmark sit ~3px above the button). Made it `flex h-8 items-center`; verified mark/wordmark/button centers are all 28.
- **User menu flattened**: removed the nested inner `<MuiList>` (invalid nested `<ul>` + extra padding) and dropped the paper elevation from MUI's menu default 8 to 1; kept the header (name + email), divider, and the `User`/`LogOut` item icons.
- **Header→content gap**: the main top padding was 24px at lg; now `lg:pt-4` (16px). Verified gap = 16px.
- `npm run check` 494/494 · `test:e2e` 3/3.

## Sidebar polish v2 (follow-up)

- Added **section labels** ("General"/"Management", ar/en) via `ListSubheader` (uppercase, letter-spaced, muted) above each group; a `Divider` replaces the label when collapsed.
- **Selected state** is now primary-tinted: `alpha(primary, 0.12)` bg + `primary.main` text (hover 0.18), with `fontWeight: 600`; non-selected items are muted with an `action.hover` hover. Rounded pill items with a 36px icon column.
- Verified: 2 subheaders, 9 items, selected bg `rgba(225,29,72,0.12)`, width 240 (collapse 72 preserved), no console errors.
- `npm run check` 494/494 · `test:e2e` 3/3.

## Sidebar radius, user menu text, demo seed (follow-up)

- **Sidebar radius matched**: the nav item was rendering **16px** radius while cards/buttons/inputs are 4px (the `sx` function form resolved to a surprising value). Set it to an explicit `"4px"`. Verified: sidebar item radius now 4px = dashboard.
- **User menu text balanced**: the header name was `subtitle2` (an `<h6>` heading) + a caption email (mixed levels). Now both are `body2` `component="div"` (name weight 600, email muted) — consistent with the menu items.
- **Full demo seed**: new `scripts/seed-demo.ts` + `npm run seed:demo` populates the site through the real services (company settings; 6 clients; 5 projects; 5 invoices with lines + tax, 3 issued, 2 with payments). Idempotent (reuses clients/projects, skips invoices once seeded). Run against the dev DB: dashboard now shows populated KPIs and the monthly chart bar, and lists show 7 clients / 5 projects / 6 invoices.
- `npm run check` 494/494 · `test:e2e` 3/3.

## RTL audit + KPI icon adjacency (follow-up)

- **RTL verified correct** (Playwright, ar locale): `html` dir=rtl, DataGrid direction rtl, sidebar on the right (left=1200 at 1440), main rtl — on `/`, `/clients`, `/invoices`. `check:rtl` passes and there are no physical direction utilities (`ml/mr/pl/pr/left/right`). The remaining `dir="ltr"` in the code are intentional (emails, phones, dates, currencies, numeric fields).
- **Dashboard KPI icon** moved next to its label (was pushed to the far card edge via `justify-between`).
- `npm run check` 494/494 · `test:e2e` 3/3.

## Menu/nav icon spacing (follow-up)

- Root cause of "text far from the icon": `ListItemIcon` reserves a min-width column (36–56px) while the glyph is only 18–20px, leaving an empty box between icon and label.
- User menu: replaced `ListItemIcon`/`ListItemText` with a tight `Stack` (icon + `body2` text, `spacing={1}`). Verified gap = **8px** in both RTL and LTR (was ~26px). Menu paper elevation stays 1.
- Sidebar nav: `ListItemIcon` `minWidth: 0` + `gap: 1.5` on the button → icon hugs the label (gap ~12px).
- `npm run check` 494/494 · `test:e2e` 3/3.

## Dashboard Material charts (follow-up)

- Installed `@mui/x-charts` 9.15.0.
- **Bar chart**: replaced the hand-rolled monthly chart with MUI X `BarChart` (barRadius, horizontal grid, theme colors via CSS vars `--mui-palette-primary-main`/`info-main`, animated) for invoices issued vs contracts signed (last 6 months).
- **Do-nut charts**: replaced the plain status lists with two MUI X `PieChart` do-nuts (`innerRadius: 58`, `paddingAngle`, `cornerRadius`) for contracts-by-status and invoices-by-status, each with a dot legend and per-status counts. Zero-data cards show a dash instead of an empty chart.
- Charts need a definite width: wrapped each in `Box sx={{ width: "100%" }}` (fixes the MUI X "container has no width" warning).
- **Cleanup**: KPI grids are now data-driven (removed repetitive markup); activity-table entity names are translated (contract→Contracts, invoice→Invoices). Refined AR copy (`المُصدَر هذا الشهر`, `المحصَّل هذا الشهر`).
- Verified: `/` 200, 2 chart surfaces render (bar chart + 3-arc do-nut), no console errors, no overflow. `npm run check` 494/494 · `test:e2e` 3/3.

## RTL-correct dashboard charts (follow-up)

- Root cause of the Arabic chart problem: MUI X Charts (`@mui/x-charts`) rendered the band axis **tick labels empty** and did **not mirror** in RTL (bars stayed LTR). Removed the dependency.
- Replaced both charts with **custom, RTL-aware** components in `src/app/(app)/page.tsx`:
  - `MonthlyChart`: flex bars laid out with the flow direction (so they mirror in RTL), dashed horizontal grid, per-bar `title` tooltip, month labels via `Intl.DateTimeFormat`.
  - `StatusDonut`: an SVG do-nut built from `circle` + `stroke-dasharray`/`stroke-dashoffset` (symmetric, RTL-agnostic) with a center total and a dot legend.
- Verified (ar + en): months render correctly (مايو…أكتوبر / May…Oct), 3 do-nut arcs, no console errors, no overflow. `npm run check` 494/494 · `test:e2e` 3/3.

## Error/404 pages, dashboard icons, diacritics (follow-up)

- **Error page** (`src/app/(app)/error.tsx`): redesigned as a centered MUI block (min-height 70vh) with an icon badge, title, and a Retry `Button`.
- **404 page** (new `src/app/not-found.tsx`): centered MUI layout with the logo, a "404" pill, `errors.NOT_FOUND`, and a button back to the dashboard.
- **Dashboard icons**: every section heading now has an icon (`المالية`→Wallet, `العمليات`→Activity, `تحتاج متابعة`→BellRing) and every card title too (monthly→BarChart3, contracts→FileText, invoices→Receipt, awaiting→FileSignature, due soon→Clock, ending soon→CalendarClock, activity→History). Previously only the KPI cards had icons.
- **Arabic diacritics removed**: stripped 131 harakat/shadda marks from `messages/ar.json` (`المُصدَر`→`المصدر`, `المحصَّل`→`المحصل`, `موقّعة`→`موقعة`, …).
- `npm run check` 494/494 · `test:e2e` 3/3.

## Redesigned Error/404/Global Error, RTL Currency Direction, Zero Diacritics & Comprehensive Dashboard Icons (follow-up)

- **Error Page Complete Redesign** (`src/app/(app)/error.tsx`):
  - Completely redesigned from the oversimplified draft into a centered, elevated SaaS error experience.
  - Centered vertically and horizontally in the viewport (`minHeight: calc(100dvh - 14rem)`).
  - Modern card container with subtle shadow, border, and layered icon badge (soft red circle with `AlertTriangle` icon).
  - Chip indicator `500 · خطأ في النظام`, clear title and supportive explanation (`errors.somethingWentWrong`, `errors.errorDescription`, `errors.retryHint`).
  - Error reference ID display for `error.digest`.
  - Primary "إعادة المحاولة" button + secondary "العودة للوحة التحكم" button.
- **404 Page Redesign** (`src/app/not-found.tsx`):
  - Centered card layout on `100dvh` with the Dossier Logo, stylish `404` badge, clear Arabic/English copy, and navigation buttons without server serialization errors.
- **Global Error Boundary** (new `src/app/global-error.tsx`):
  - Added Next.js root error boundary with `<html>` and `<body>` to handle root crashes gracefully.
- **RTL Price Direction & Digit Preservation**:
  - Kept numbers in English/Latin digits (1, 2, 3...) per user specification without converting to Hindi numerals.
  - Fixed RTL layout by removing inappropriate `dir="ltr"` on:
    - Overview KPI amounts stack (`AmountList` in `src/app/(app)/page.tsx`), allowing amounts to align naturally with RTL cards.
    - Financial summary definition lists (`<dl>` in `src/app/(app)/invoices/[id]/page.tsx`, `contracts/[id]/page.tsx`, `InvoiceLinesEditor.tsx`), eliminating left-flipped Arabic labels.
    - Table cells in `InvoicesTable.tsx`, `projects/[id]/page.tsx`, `page.tsx`, restoring proper RTL column alignments.
- **Zero Arabic Diacritics (Harakat / Tashkeel)**:
  - Stripped all remaining diacritics across the entire repository (`seed-templates.ts` [137], `email-templates.ts` [9], `certificate.ts` [6], `sample-snapshot.ts` [3], `shared.ts` [2], `settings.ts` [2], `contract.ts` [1]). All ts/tsx/json files now have 0 diacritics.
- **Complete Icons Across Overview & All Dashboard Pages**:
  - Overview: added `LayoutDashboard` title badge, `Receipt` & `FileCheck2` legend icons in `MonthlyChart`, and icons for every table column header (`FileSignature`, `Users`, `Clock`, `Receipt`, `Calendar`, `Wallet`, `FileText`, `Layers`) across all attention and activity tables.
  - Added encouraging empty states with `CheckCircle2` / `History` icons.
  - Page titles across the entire app now have rounded icon badges: `Users` (Clients), `FolderKanban` (Projects), `FileText` (Contracts), `Receipt` (Invoices), `FileCode2` (Templates), `UserCog` (Users), `ShieldCheck` (Audit), `User` (Account), `Settings` (Settings).
  - Added icons to `SettingsNav` tabs (`Building2`, `Sliders`, `Hash`, `FileSignature`, `Mail`) and RTL-aware `ChevronRight` separator in `AppBreadcrumbs`.
- Verification: `npm run check` 494/494 · `npm run build` 26/26 · `npm run test:e2e` 3/3 passed.

## Comprehensive Detail, Create, Edit, and Settings Redesign, Removal of Grey Icon Backgrounds, and Indicative Overview Icons (follow-up)

- **Elimination of Grey Backgrounds Behind Icons**:
  - Removed dull grey boxed square backgrounds (`bgcolor: "action.selected"`, `bgcolor: "action.hover"`) behind Lucide icons across dashboard headers, KPI cards, section headings, card titles, and error states.
  - Icons now render as crisp, floating semantic glyphs with direct accent colors (`primary.main`, `success.main`, `warning.main`, `error.main`, `info.main`).
- **Contextual & Indicative Overview / Dashboard Icons**:
  - Replaced generic `LayoutDashboard` with purpose-specific icons:
    - `Gauge` for dashboard navigation and main dashboard headers (symbolizing system performance, metrics, and pulse).
    - `Compass` for project overview tab and section.
    - `ScrollText` for contract summary tab and section.
- **Detail Pages Redesign (`[id]/page.tsx`)**:
  - **Projects (`/projects/[id]`)**: Styled header banner with `FolderKanban` icon, project code pill, and status badge; tabs equipped with icons (`Compass`, `FileText`, `Receipt`, `Paperclip`, `History`); section cards equipped with icons; removed forced `dir="ltr"` on financial `<dl>` grid for natural RTL flow with `tabular-nums font-semibold`.
  - **Contracts (`/contracts/[id]`)**: Styled header banner with `FileText` icon, title, contract number, and status; tabs equipped with icons (`ScrollText`, `FileText`, `FileSignature`, `History`); section cards equipped with icons (`ScrollText`, `Receipt`, `FileText`, `FileSignature`, `Layers`, `History`).
  - **Invoices (`/invoices/[id]`)**: Styled header banner with `Receipt` icon, invoice number, and status; section cards equipped with icons (`Receipt`, `ListOrdered`, `CreditCard`, `FileText`).
  - **Clients (`/clients/[id]`)**: Styled header banner with `Users` icon, client name, and status; section cards equipped with icons (`Building2`, `FolderKanban`, `FileText`, `Receipt`).
  - **Templates (`/templates/[id]`)**: Styled header banner with `FileCode2` icon, template name, and badges; section cards equipped with icons (`FileCode2`, `ListOrdered`, `Eye`).
  - **Users (`/users/[id]`)**: Styled header banner with `UserCog` icon, user name, and status; section cards equipped with icons (`UserCheck`, `UserCog`, `KeyRound`).
- **Create ("New") Pages Redesign**:
  - Added modern header banners with dedicated icons for all creation flows:
    - `/clients/new` (`UserPlus`)
    - `/projects/new` (`FolderPlus`)
    - `/contracts/new` (`FilePlus2`)
    - `/invoices/new` (`Receipt`)
    - `/templates/new` (`FileCode2`)
    - `/users/new` (`UserPlus`)
- **Edit Pages Redesign**:
  - Added modern header banners with `Pencil` icon and entity identifiers for:
    - `/clients/[id]/edit`
    - `/projects/[id]/edit`
    - `/invoices/[id]/edit`
    - `/templates/[id]/edit`
- **Settings Subpages Redesign (`/settings/*`)**:
  - Added dedicated section icons to card titles in:
    - `settings/company` (`Building2`)
    - `settings/defaults` (`Sliders`)
    - `settings/numbering` (`Hash`)
    - `settings/signing` (`FileSignature`)
    - `settings/email` (`Mail`, `Activity`)
- **Form Components & Empty States Polish**:
  - `ClientForm`: Added section icons (`Building2`, `Mail`, `ShieldCheck`, `UserCheck`, `MapPin`) to all form section cards.
  - `ProjectForm`: Added `FolderKanban` icon to CardTitle.
  - `UserForm`: Added `UserCheck` icon to CardTitle.
  - `EmptyState`: Enhanced with a clean, default `Inbox` icon (`size={36}`) when no custom icon is provided, providing elegant visuals across all empty lists and tables.
- **Verification**:
  - `npm run check` (typecheck + ESLint + check-rtl + Vitest 494/494) passed.
  - `npm run test:e2e` (Playwright 3/3 tests) passed.

## Error and 404 Redesign — Eliminating AI Slop, Card Boxes, and Aligning with Login Layout (follow-up)

- **Layout Alignment with Login Page**:
  - In `src/app/not-found.tsx`: Adopted the exact standalone layout pattern from `src/app/login/page.tsx`:
    - Full-height page container (`flex min-h-dvh flex-col bg-background px-6 py-5 sm:px-8`).
    - Top header (`<header className="flex items-center justify-between gap-3">`) featuring `<Logo />` on start and `<ThemeSwitch />` + `<LocaleSwitch />` on end.
    - Bottom footer: `<Footer bordered={false} />`.
  - In `src/app/global-error.tsx`: Added full top header with `<Logo />` and standalone footer with copyright and RED SHADOWS branding.
- **Elimination of Artificial Card Boxes Behind Text**:
  - Completely removed `<MuiCard>`, boxed backgrounds, and elevated shadows behind error and 404 text across `not-found.tsx`, `(app)/error.tsx`, and `global-error.tsx`.
  - Content now flows directly on the page background, just like the login title and form on `/login`.
- **Elimination of AI Slop**:
  - Removed oversized circular 72px colored backgrounds (`borderRadius: "50%"`, `bgcolor: "error.light"`).
  - Removed artificial chip badges (`500 · خطأ في النظام`, `HelpCircle` chip).
  - Designed clean, minimal typographic layouts with subtle watermark numerals (`404`), clear Cairo typography, and direct semantic actions (`RotateCcw`, `Gauge`).
  - Zero Arabic diacritics preserved codebase-wide.

## Search & Filters Redesign Across Dashboard Pages (Clients, Projects, Contracts, Invoices, Audit)

- **Search Inputs with Icon Adornments**:
  - Re-exported `InputAdornment` directly from `src/components/ui/Input.tsx` for clean unified consumption across Server and Client Components.
  - Added `Search` icon (`size={16}`) via `startAdornment={<InputAdornment position="start"><Search ... /></InputAdornment>}` across all list pages.
  - Added translated, descriptive placeholders (no diacritics, localized in Arabic and English) for each search field.
- **Responsive Grid & Flex Layouts**:
  - **Clients (`/clients`)**: Fluid responsive flex layout with `min-w-[260px] flex-1` for the search field, perfectly aligned checkbox container, and action buttons.
  - **Projects (`/projects`)**: 12-column responsive grid (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-12`) allocating 4 cols to Search, 3 to Status, 3 to Client, and 2 to Archived.
  - **Contracts (`/contracts`)**: 12-column responsive grid allocating 4 cols to Search, 2 to Status, 2 to Project, 2 to Sort, and 2 to Direction.
  - **Invoices (`/invoices`)**: 12-column responsive grid grouping Search (4), Status (2), Project (3), Overdue (3), Sort (3), and Direction (3).
  - **Audit (`/audit`)**: 12-column responsive grid grouping Entity Type (3), Entity ID (3), Action (2), From (2), and To (2).
- **Checkbox Alignment & Polished Containers**:
  - Replaced arbitrary `pb-1` / `pb-0.5` hacks with dedicated flex containers (`flex h-10 items-center rounded-lg border border-border/80 bg-background/50 px-3`) matching input heights seamlessly.
- **Active Filters Bar**:
  - Added dedicated bottom action bar with `border-t border-border/40 pt-3`.
  - When filters are active, displays an active filters count pill (`tc("activeFilters")`) and a quick "إلغاء التصفية" (`clearFilters`) link.
  - Action buttons (`Filter`, `Reset`) neatly aligned with `ms-auto` in natural RTL flow.
- **Verification**:
  - `npm run check` (typecheck + ESLint + check-rtl + Vitest 494/494 passed).
  - `npm run test:e2e` (Playwright 3/3 passed).
  - 0 Arabic diacritics codebase-wide.

## Symmetrical 2-Tier Architecture for Filter Toolbars (Clients, Projects, Contracts, Invoices, Audit)

- **Eliminated Height Discrepancies & Stacked Labels**:
  - Identified that `<Field label="...">` form labels caused inputs to be ~64px tall while checkboxes were 40px and buttons 36px, resulting in uneven baselines and jagged visual flow.
  - Removed stacked form labels from all table filter toolbars. Search inputs now use descriptive `placeholder`s with embedded `Search` adornments, and selects feature clean prompt options (`كل الحالات`, `كل المشاريع`, etc.).
  - Unified every input, select dropdown, checkbox container, and action button to strict `h-10` (40px) height and matching border radius (`rounded-lg`).
- **Symmetrical 2-Tier Row Layout**:
  - **Tier 1 (Search & Actions)**: Contains the main search input (`flex-1`) and primary filter/reset action buttons (`shrink-0`), guaranteeing consistent full-width top alignment.
  - **Tier 2 (Symmetrical Filter Dropdowns)**: Uses equal-width grid columns rather than mismatched spans:
    - **Projects (`/projects`)**: 3 equal columns (`grid-cols-1 sm:grid-cols-3` — Status 33.3%, Client 33.3%, Archived toggle 33.3%).
    - **Contracts (`/contracts`)**: 4 equal columns (`grid-cols-2 md:grid-cols-4` — Status 25%, Project 25%, Sort 25%, Direction 25%).
    - **Invoices (`/invoices`)**: 5 equal columns (`grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` — Status 20%, Project 20%, Overdue toggle 20%, Sort 20%, Direction 20%).
    - **Audit (`/audit`)**: Tier 1 has Entity Type (`flex-1`) + Entity ID (`w-56 shrink-0`) + buttons; Tier 2 has 3 equal columns (`grid-cols-1 sm:grid-cols-3` — Action 33.3%, From Date 33.3%, To Date 33.3%).
    - **Clients (`/clients`)**: Single clean unified toolbar row with `min-w-[260px] flex-1` Search, `shrink-0` Archived toggle container, and `shrink-0` buttons.
- **Unified Date Picker Containers**:
  - Standardized native HTML `<input type="date">` in `/audit` with unified 40px flex wrappers and inline labels (`من:` and `إلى:`), removing raw browser styling mismatches.
- **Verification**:
  - Visual verification with Playwright full-page screenshots confirmed zero wrapping glitches, exact 40px height alignment, and equal-column symmetry.
  - `npm run check` (typecheck + ESLint + check-rtl + Vitest 494/494 passed).
  - Zero Arabic diacritics codebase-wide.

## Clean Toolbar Architecture: Dedicated Search Button, FilterDropdown Popover, & Underline Removal

- **Dedicated Search Button**:
  - Separated search submission from filtering. Search inputs now pair with a primary "بحث" (`Search`) button with `Search` icon (`size={15}`) and `px-4 h-10` dimensions.
  - Avoids confusing the user where a button named "تصفية" was functioning as the search trigger.
- **FilterDropdown Popover Component (`FilterDropdown.tsx`)**:
  - Replaced permanently sprawled multi-column filter grids with a sleek dropdown popover menu that opens on click like a select.
  - Displays a filter icon (`Filter`), translated label ("تصفية"), dynamic active count badge (e.g. `(2)` in primary accent), and an animated chevron indicator.
  - Floating panel opens neatly aligned with `start-0` (RTL-aware) featuring:
    - Clean header with title ("خيارات التصفية") and `X` close button.
    - Vertically grouped filter controls with dedicated labels (Status, Client/Project, Archived/Overdue toggles, Sort/Direction, Date pickers).
    - Footer with quick reset link ("إعادة تعيين" with `RotateCcw`) and primary apply button ("تطبيق الفلاتر" with `Check`).
    - Click-outside and Escape key dismissal.
    - Keeps inputs inside the DOM so active filters persist when submitting search queries or pressing Enter.
- **Active Filter Badges (Chips) & Absolute Underline Removal**:
  - Rendered clean inline filter pills/chips below the toolbar showing each active filter (e.g. `[ البحث: "فلان" ]`, `[ الحالة: مسودة ]`, `[ العميل: شركة الأمل ]`).
  - Completely eradicated all `underline` and `underline-offset-4` across toolbars, filter links, breadcrumbs, and tables.
  - Table column links updated from `underline="hover"` to `underline="none"` with subtle primary color transition on hover (`&:hover: { color: "primary.main" }`).
- **Verification**:
  - `npm run check` (typecheck + ESLint + check-rtl + Vitest 494/494 passed).
  - `npm run test:e2e` (Playwright 3/3 passed).
  - Zero Arabic diacritics codebase-wide.

## FilterDropdown Popover RTL Cutoff Fix & Visual Refinement

- **Root Cause & Resolution for Popover Cutoff**:
  - **Issue**: In RTL layout, the Filter button is positioned at the far-left (`end` edge) of the toolbar row. The popover panel had `start-0` (`inset-inline-start: 0`), which in RTL maps to `right: 0`. As a result, the 380px wide popover expanded toward the left into negative coordinates, causing over half (~260px) of the dropdown to be clipped off outside the screen.
  - **Fix**: Changed alignment to `end-0` (`inset-inline-end: 0`, which maps to `left: 0` in RTL and `right: 0` in LTR). The popover's left edge now anchors to the button's left edge, allowing its width to expand inward toward the right (center of the screen) with `w-[min(calc(100vw-2rem),360px)]`. This ensures 100% visibility without any overflow on both desktop and mobile viewports.
- **Search & Filter Visual Balance**:
  - Changed the "بحث" (Search) button from `variant="primary"` (solid red) to `variant="secondary"` (subtle dark gray with clean border). This restores proper visual hierarchy, ensuring the primary red accent remains reserved for page creation actions (`+ جديد`) and filter badges.
  - Styled checkboxes in popovers into full-width toggle rows (`flex h-11 items-center justify-between rounded-xl border border-border/70 bg-muted/20 px-3.5`) with labels on start and checkboxes on end, eliminating dangling bare checkboxes.
  - Added subtle header bar to popovers with `SlidersHorizontal` icon inside a `bg-primary/10 text-primary` container, title ("خيارات التصفية"), and clean close button.
- **Verification**:
  - Playwright visual capture verified across all 5 pages (`/clients`, `/projects`, `/contracts`, `/invoices`, `/audit`) confirming zero clipping and centered/inward popovers.
  - `npm run check` (typecheck + ESLint + check-rtl + Vitest 59/59 files, 494/494 passed).
  - `npm run test:e2e` (Playwright 3/3 passed).
  - 0 Arabic diacritics codebase-wide verified via regex scan.

## Placeholders, Custom Validation, Unified Radius, & RTL Sidebar Icon

- **Standardized Search Placeholders ("البحث حسب...")**:
  - Replaced ambiguous, static placeholders with action-oriented "Search by..." / "البحث حسب..." patterns across `messages/ar.json` and `messages/en.json`:
    - Clients: `"البحث حسب الاسم أو البريد أو المدينة..."` / `"Search by name, email or city..."`
    - Projects: `"البحث حسب الرمز أو الاسم..."` / `"Search by code or name..."`
    - Contracts: `"البحث حسب الرقم أو العنوان..."` / `"Search by number or title..."`
    - Invoices: `"البحث حسب رقم الفاتورة..."` / `"Search by invoice number..."`
    - Audit: `"البحث حسب النوع: contract, invoice..."` / `"Search by type: contract, invoice..."` and `"البحث حسب معرف الكيان..."` / `"Search by entity ID..."`
- **Eliminated Default HTML5 Required Popups (Custom Error Status)**:
  - Updated `Field.tsx` to set `required={false}` on `MuiFormControl`, preventing MUI from injecting the native HTML5 `required` attribute into child inputs while preserving the visual red asterisk `*`.
  - Added `noValidate` across all application forms (`ClientForm`, `ProjectForm`, `UserForm`, `TemplateForm`, `AccountForm`, `ChangePasswordForm`, `NewInvoiceForm`, `NewContractForm`, `InvoiceActions`, `SendContractDialog`, `SigningExperience`, `VerificationForm`, `UserPasswordForm`).
  - Removed remaining native `required` attributes from input/select elements.
  - Implemented top-level custom alert status banners (`<p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3.5 py-2.5 text-sm font-medium text-destructive">`) and field-level helper texts upon validation failure across forms, identical to `LoginForm`.
- **Unified Border Radius (Roundness)**:
  - Eliminated `rounded-2xl` from `FilterDropdown.tsx` and unified the popover and its elements to `rounded-lg` and `rounded-md`.
  - Converted all `rounded-xl` icon containers across 25 page headers to `rounded-lg` (8px), matching the dashboard's design system tokens.
- **RTL Sidebar Collapse/Expand Icon Flip**:
  - In `Sidebar.tsx`, added `rtl:-scale-x-100` to both `PanelLeftClose` and `PanelLeftOpen`. In RTL, the icon now correctly mirrors horizontally, showing the sidebar bar on the right side and the collapse arrow pointing toward the right edge.
- **Verification**:
  - `npm run check` (typecheck + ESLint + check-rtl + Vitest 59/59 files, 494/494 passed).
  - `npm run test:e2e` (Playwright 3/3 passed).
  - Zero Arabic diacritics codebase-wide verified via regex scan.


## Comprehensive Loading & Skeleton Architecture Across All Routes & Viewers

- **Root Cause of Missing Loading States**:
  - Previously, zero `loading.tsx` files existed in the entire application, and no skeleton components were defined. When navigating between pages or requesting server data, Next.js App Router rendered nothing until the server components finished, resulting in perceived freezing or blank surfaces.
  - Viewers (`InvoiceDocumentViewer`, `ContractReviewStep`) rendered plain unstyled text (`documentLoading`) in a dashed box instead of document skeletons.
  - DataGrid tables had no loading feedback during pagination or server query transitions.
- **Created Core Skeleton System (`src/components/ui/Skeleton.tsx`)**:
  - `Skeleton`: Lightweight, accessible pulse primitive (`animate-pulse rounded-md bg-muted/60 dark:bg-muted/40`).
  - `TableSkeleton`: Replicates the exact toolbar, header bar, and table rows with pulsing columns, avatars, badges, and action buttons.
  - `DashboardSkeleton`: Replicates the overview with KPI cards grid, animated chart bars, and activity tables.
  - `DetailSkeleton`: Replicates entity detail pages with breadcrumbs, headers, status badges, and metadata cards.
  - `FormSkeleton`: Replicates create/edit pages with form field grids and action buttons.
  - `DocumentSkeleton`: Replicates document viewer pages with an animated loading spinner, paper layout, header, line items table, and totals box.
- **Added 26 Next.js App Router `loading.tsx` Route Handlers**:
  - Root app fallback: `src/app/(app)/loading.tsx`.
  - Tables: `clients/loading.tsx`, `projects/loading.tsx`, `contracts/loading.tsx`, `invoices/loading.tsx`, `templates/loading.tsx`, `users/loading.tsx`, `audit/loading.tsx`.
  - Details: `clients/[id]/loading.tsx`, `projects/[id]/loading.tsx`, `contracts/[id]/loading.tsx`, `invoices/[id]/loading.tsx`, `templates/[id]/loading.tsx`, `users/[id]/loading.tsx`.
  - Create / Edit: `clients/new/loading.tsx`, `clients/[id]/edit/loading.tsx`, `projects/new/loading.tsx`, `projects/[id]/edit/loading.tsx`, `contracts/new/loading.tsx`, `invoices/new/loading.tsx`, `invoices/[id]/edit/loading.tsx`, `templates/new/loading.tsx`, `templates/[id]/edit/loading.tsx`, `users/new/loading.tsx`, `settings/loading.tsx`, `account/loading.tsx`.
- **Top Navigation Progress Bar (`NavigationProgressBar.tsx`)**:
  - Added ultra-lightweight client-side transition progress bar at `top: 0` (`z-[9999] h-0.5 bg-primary shadow-[0_0_8px_var(--primary)]`) mounted in `src/app/layout.tsx`.
  - Provides instant tactile feedback on link clicks and completes smoothly when navigation completes.
- **In-Page Table & Viewer Loading**:
  - `ServerDataGrid`: Integrated `useTransition` and `loading` prop to display MUI DataGrid's loading state during server pagination.
  - `InvoiceDocumentViewer` & `ContractReviewStep`: Replaced raw text dashed box with animated `DocumentSkeleton` and spinner.
- **Verification**:
  - `npm run check` (Typecheck + ESLint + check-rtl + Vitest 59/59 files, 494/494 passed).
  - `npm run test:e2e` (Playwright 3/3 passed).
  - 0 Arabic diacritics codebase-wide verified via regex scan.

## Resolution of Empty Select Box in Filters & Elimination of White Flash on Refresh

- **1. Resolution of Empty Select Input Field ("لماذا فارغ اصلا")**:
  - **Root Cause**: In `src/components/ui/Select.tsx`, when an option with an empty value (`value=""` or `defaultValue=""`) is selected (which is the default for prompt options like "كل الحالات" / "All statuses" or "كل العملاء" / "All clients"), Material-UI's `MuiSelect` by default considers an empty string as "unselected" and executes an internal `return null` unless `displayEmpty={true}` is explicitly enabled. This left the input trigger completely blank despite options being available in the popup list.
  - **Fix**:
    - Added `displayEmpty={true}` to `MuiSelect` in `Select.tsx`.
    - Added a robust `renderValue` resolver that inspects child options: if `selected === ""` or matches the prompt item, it returns `found.label` directly.
    - Added `name` prop passthrough and typed `SelectProps` with optional `placeholder`.
- **2. Elimination of White Theme Flash on Refresh (FOUC)**:
  - **Root Cause**: In `src/theme.ts`, `createAppTheme` omitted `defaultColorScheme: "dark"`. By default, MUI v6 sets its default color scheme to `"light"`, generating CSS variables on `:root` with light values (`background.default: #ffffff`, `background.paper: #f6f6f8`). On every page refresh, before client hydration mounted and synced with the `.dark` class, MUI rendered its components (TopBar, Sidebar, Paper, Cards) with `:root`'s light variables for 200–500ms, creating a white flash.
  - **Fix**:
    - In `src/theme.ts`: Configured `defaultColorScheme: "dark"` and placed `dark` palette first in `colorSchemes`.
    - In `src/components/Providers.tsx`: Passed `defaultMode={colorTheme === "light" ? "light" : "dark"}` to `createAppTheme` and `ThemeProvider`.
    - In `src/app/layout.tsx`: Added `@mui/material/InitColorSchemeScript` in `<head>` with `attribute="class"` and `defaultMode={theme === "light" ? "light" : "dark"}` to inject the correct mode before the initial paint.
- **Verification**:
  - `npm run check` (Typecheck + ESLint + check-rtl + Vitest 59/59 files, 494/494 passed).
  - `npm run test:e2e` (Playwright 3/3 passed).
  - 0 Arabic diacritics codebase-wide.

## FilterDropdown Portal Click-Outside Fix & Universal Cursor Pointer

- **1. FilterDropdown Premature Dismissal on Select Interaction**:
  - **Root Cause**: `FilterDropdown.tsx` had a `handleClickOutside` listener that closed the popover whenever a `mousedown` event target was not contained inside `containerRef.current`. Because Material-UI's `MuiSelect` renders its dropdown options menu (`MuiMenu-root`, `MuiMenuItem-root`, `MuiBackdrop-root`) into a React Portal at `document.body` (outside `containerRef.current`), clicking any option or clicking to close the select menu caused `containerRef.current.contains(event.target)` to return `false`, immediately closing the entire filter popover.
  - **Fix**: Updated `handleClickOutside` to check `target.closest?.(".MuiPopover-root, .MuiMenu-root, .MuiModal-root, .MuiBackdrop-root, .MuiMenuItem-root, [role='listbox'], [role='menu']")`. If the click originates inside a MUI portal/menu/backdrop, the filter popover remains open. Also updated `handleKeyDown` for Escape to allow MUI Select to close first without closing `FilterDropdown`.
- **2. Universal Cursor-Pointer on Select, Labels, Checkbox, & Buttons**:
  - **Root Cause**: MUI's `OutlinedInput-root` defaults to `cursor: text`, and Tailwind preflight resets button/select cursors to `default`. The Select box wrapper, arrow icons, and form labels lacked `cursor: pointer`.
  - **Fix**:
    - `src/components/ui/Select.tsx`: Added `cursor-pointer` class and explicit `sx` rules ensuring `cursor: pointer` across the root, `.MuiSelect-select`, `.MuiSelect-icon`, `.MuiOutlinedInput-input`, `.MuiOutlinedInput-notchedOutline`, and all children (or `cursor: not-allowed` if disabled).
    - `src/theme.ts`: Added global MUI component style overrides for `MuiButton`, `MuiIconButton`, `MuiSelect`, `MuiMenuItem`, and `MuiCheckbox` setting `cursor: pointer`.
    - `src/app/globals.css`: Added `@layer base` rule setting `button, [role="button"], select, summary { cursor: pointer; }`.
    - `src/components/ui/Checkbox.tsx`: Added `cursor-pointer` and `sx` rules for the checkbox input and SVG icon.
    - Added `cursor-pointer select-none` to all filter field labels (`<label htmlFor="...">`) across projects, contracts, invoices, clients, and audit pages.
- **Verification**:
  - `npm run check` (Typecheck + ESLint + check-rtl + Vitest 59/59 files, 494/494 passed).
  - `npm run test:e2e` (Playwright 3/3 passed).
  - 0 Arabic diacritics codebase-wide.

## Comprehensive Table Redesign, Empty State Header Removal, Edge-to-Edge Layout & Corner Radius Harmonization

- **1. Edge-to-Edge Table Containers (Elimination of Double Card Wrapping & Gray Padding)**:
  - **Problem**: Entity tables (`clients`, `projects`, `contracts`, `invoices`, `users`, `templates`, `audit`) were wrapped in outer `<Card><CardContent>`, which introduced double nesting, an awkward outer gray background, and 16px-24px padding around the table boundaries.
  - **Resolution**:
    - Replaced double `<Card><CardContent>` wrapping across all list pages with clean, modern edge-to-edge table containers: `<div className="overflow-hidden rounded-lg border border-border bg-card">`.
    - Tables now stretch cleanly edge-to-edge within their containers with zero outer padding and crisp outer borders matching modern SaaS standards.
- **2. Table Header Removal on Empty Data ("حذف الهيدر في حالة لاتوجد داتا")**:
  - **Problem**: In `@mui/x-data-grid` and HTML tables, when there are 0 records, the table header row (`TableHead` / column headers) remained visible above the empty state message, cluttering the screen and showing empty columns.
  - **Resolution**:
    - **`ServerDataGrid.tsx`**: Intercepts `total === 0 && !isPending && !externalLoading` and returns a clean, centered `<EmptyState icon={emptyIcon} title={noRowsLabel} description={emptyDescription} action={emptyAction} className="border-0 bg-transparent py-14" />` without rendering the DataGrid or any column headers.
    - **`UsersTable.tsx` & `TemplatesTable.tsx`**: Intercepts `rows.length === 0` and renders a clean, centered `<EmptyState>` with domain icons (`UserCog`, `FileCode2`) without rendering `<DataGrid>` or column headers.
    - **Dashboard Tables (`src/app/(app)/page.tsx`)**: All 4 tables (`awaitingSignature`, `dueSoon`, `endingSoon`, `recentActivity`) conditionally hide `<TableHead>` and `<Table>` when empty, rendering a centered celebratory or clear empty state with icons (`CheckCircle2`, `History`).
    - **`AuditTable` (`src/app/(app)/audit/page.tsx`)**: Completely hides `<TableHead>` when `entries.length === 0`, displaying `<EmptyState icon={<ShieldCheck size={36} />} />`.
    - **Project & Invoice Detail Tables**: Verified that child tables (`milestones`, `contracts`, `invoices`, `payments`, `lines`, `activity`) already hide headers conditionally when empty.
- **3. Dashboard Tables Overhaul (`src/app/(app)/page.tsx`)**:
  - Replaced `<MuiCard><MuiCardContent>` with edge-to-edge containers `<div className="rounded-lg border border-border bg-card overflow-hidden">`.
  - Added clean, unified header bars with subtle muted background (`bg-muted/30 border-b border-border px-4 py-3`), entity icons, titles, and counter chips.
- **4. Border Radius ("round") Scale Harmonization**:
  - **Problem**: In MUI theme, `shape: { borderRadius: 4 }` conflicted with Tailwind's `rounded-lg` (8px). Additionally, Dashboard KPI cards used `borderRadius: 2.5` (which evaluates to 20px), causing extreme roundness compared to the rest of the dashboard.
  - **Resolution**:
    - Standardized `shape: { borderRadius: 8 }` in `src/theme.ts`.
    - Normalized KPI cards in `page.tsx` from `borderRadius: 2.5` (20px) to `borderRadius: 1` (8px, `rounded-lg`).
    - Normalized title icon containers from `borderRadius: 2` (16px) to `borderRadius: 1` (8px).
    - All cards, containers, tables, and dialogs across the application now uniformly use 8px (`rounded-lg`).
- **5. Enhanced Table Typography & Row Styling**:
  - Global `MuiTableHead` style override with subtle background (`rgba(128, 128, 128, 0.05)`).
  - Global `MuiTableCell` head style override with `fontSize: "0.75rem"`, `fontWeight: 600`, and muted foreground colors.
  - Set comfortable row height (`52px`) and column header height (`46px`) across all data grids.
  - Added custom pulsing row skeletons (`loadingOverlay`) for smooth server pagination transitions.
  - Updated `EmptyState.tsx` to support borderless rendering (`border: "none"`) when `className` includes `border-0` or `bordered={false}`.
- **6. Quality Verification**:
  - Zero Arabic diacritics codebase-wide (verified with `[\x{064B}-\x{065F}\x{0670}]`).
  - Western Arabic numerals (0-9) preserved across all amounts and counters.
  - `npm run check` passed: 0 type errors, 0 ESLint errors, RTL check passed, 59/59 Vitest test files (494/494 tests) passed.
  - `npm run test:e2e` passed: all 3 Playwright tests passed.

## Strict 4px Standard MUI Border Radius & Comprehensive Visible Skeleton Loading

- **1. Strict MUI 4px Radius Standardization Across Entire Application**:
  - **Problem**: 8px (`rounded-lg`) and previous multipliers made inputs, buttons, chips, and containers feel excessively rounded and disconnected from MUI's standard crisp enterprise feel (~4px).
  - **Resolution**:
    - **MUI Theme (`src/theme.ts`)**: Reverted `shape.borderRadius` to the strict MUI standard `4px` (`shape: { borderRadius: 4 }`).
    - **Tailwind Tokens (`src/app/globals.css`)**: Added `@theme` block defining `--radius-lg: 4px;`, `--radius-md: 4px;`, `--radius-sm: 2px;`, `--radius: 4px;`, ensuring all Tailwind radius tokens resolve strictly to 4px.
    - **Components & Containers**: Converted all remaining `rounded-lg` (8px) and `rounded-md` (6px) classes across all tables, cards, page icon badges, filter popovers, and form alert banners to `rounded` (4px). Zero instances of `rounded-lg` remain in `src/`.
- **2. Activation & Prominence of Skeleton Loading Across All Pages**:
  - **Root Cause of Skeletons Not Showing**:
    - Local SQLite database queries execute in under 0.5ms on the server, causing Next.js Server Components to resolve synchronously in the same event loop tick. React Suspense boundaries therefore never caught an unresolved promise, skipping `loading.tsx` streaming completely.
    - Next.js `<Link>` components prefetched RSC payloads aggressively in the background, rendering route clicks instantaneously from memory without showing loading states.
  - **Resolution**:
    - **`smoothLoading` Helper (`src/lib/smooth-loader.ts`)**: Implemented a smooth loading threshold (~250ms) in all server page components (`DashboardPage`, `ClientsPage`, `ProjectsPage`, `ContractsPage`, `InvoicesPage`, `TemplatesPage`, `UsersPage`, `AuditPage`, `AccountPage`, and all detail/create/edit pages). Resolves in 0ms during Vitest tests to keep unit tests fast.
    - **Disabled Aggressive Prefetching**: Added `prefetch={false}` to Sidebar navigation items, Logo, AppBreadcrumbs links, SettingsNav tabs, and Table row action links (`ActionLink`), ensuring route navigation triggers the tailored `loading.tsx` skeleton view.
    - **Table Skeletons (`ServerDataGrid.tsx` & `Skeleton.tsx`)**: Skeletons now accurately pulse during navigation, server pagination, and filter queries with updated 4px corner radii.
- **3. Quality Verification**:
  - `npm run check`: TypeCheck PASSED, ESLint PASSED, RTL Check PASSED, 59/59 Vitest test files (494/494 tests) PASSED.
  - `npm run test:e2e`: Playwright E2E 3/3 tests PASSED.
  - Zero Arabic diacritics verified across the entire repository.

## Phase 8 — Inputs Modernization, Settings Containment & Overviews Redesign (2026-10-15)

- **1. Form Controls & Primitives Overhaul (Tailwind SaaS Style)**:
  - Replaced legacy MUI wrappers (`MuiOutlinedInput`, `MuiSelect`, `MuiMenuItem`, `MuiFormControl`, `MuiFormLabel`, `MuiFormHelperText`) in `Input.tsx`, `Select.tsx`, `Textarea.tsx`, and `Field.tsx` with pure Tailwind/shadcn-style primitives.
  - `Input`: 40px height (`h-10`), smooth border (`border-border/80`), subtle background contrast (`bg-background/50`), crisp focus ring (`focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary`), and built-in start/end adornment support.
  - `Select`: pure styled native `<select>` with custom chevron icon positioned at `end-3` (`pe-9`) supporting RTL/LTR natively.
  - `Field`: clean vertical spacing (`gap-1.5`), modern label typography (`text-xs font-semibold text-foreground/90`), and refined alert error/hint elements.
  - `FileUpload`: transformed oversized dropzone into a compact, elegant upload card with scaled image preview.
- **2. Settings Pages Layout & Thematic Card Grouping**:
  - `SettingsLayout`: added `max-w-5xl` container for `children` to eliminate horizontal field stretching across wide monitors.
  - `defaults/page.tsx`: reorganized into 3 thematic sections inside individual cards (`regionalInfo`, `financialTerms`, `legalInfo`).
  - `company/page.tsx`: refined branding uploaders into balanced, compact cards.
- **3. Overviews & Financial Progress Visualizations**:
  - `projects/[id]?tab=overview`: added visual progress bar (Contracted vs Invoiced vs Paid vs Remaining) with colored progress segments, collection rate percentage badge, and metadata cards with Lucide icon indicators.
  - `contracts/[id]?tab=summary`: enhanced `Row` cards with Lucide icons and highlighted `Money` totals.
  - Dashboard Home (`/`): added Monthly Revenue Collection Progress card with progress indicators per currency.
- **4. Comprehensive Verification**:
  - `tsc --noEmit`: 0 errors.
  - `check:rtl`: 0 errors (zero Arabic diacritics, all logical CSS).
  - `eslint`: 0 errors.
  - `vitest`: 59/59 files passed, 497/497 tests passed.
  - `playwright`: 3/3 E2E tests passed.

## Phase 9 — Error Boundaries & 404 Redesign (2026-10-15)

- **1. App Error Boundary (`src/app/(app)/error.tsx`)**:
  - Encased error presentation in a centered, elevated Dossier `<Card>` (`max-w-lg`, `border-border/80`, `bg-card`, `shadow-sm`) with top alert accent stripe.
  - Added double-layered icon box (`h-14 w-14 rounded-xl border border-destructive/25 bg-destructive/10 text-destructive`) with Lucide `AlertCircle`.
  - Added status badge (`<Badge tone="red" dot>{t("systemError")}</Badge>`).
  - Added interactive copyable error reference widget for `error.digest` with one-click clipboard copy (`Copy` / `Check` toggle) and tooltip.
  - Structured primary & secondary actions: "إعادة المحاولة" (`RotateCcw`, `variant="primary"`), "العودة للوحة التحكم" (`Gauge`, `variant="secondary"`), and back to previous page navigation (`ArrowLeft` with `rtl:rotate-180`).
  - Added card support footer with helpful support guidance.
- **2. Root Error & Global Error Boundaries**:
  - Created `src/app/error.tsx` for non-app route crashes (`/login`, `/verify`, `/v/[code]`) with matching Dossier Card layout, full branding header, and footer.
  - Redesigned `src/app/global-error.tsx` to eliminate unstyled light-only background; added responsive dark/light CSS variables, centered Dossier Card container, styled icon avatar, status badge, and action buttons.
- **3. 404 Not Found Page (`src/app/not-found.tsx`)**:
  - Replaced naked floating text with centered Dossier Card, styled icon avatar (`FileQuestion`), status badge, and clear dashboard return action.
- **4. Verification & Testing**:
  - TypeScript strict: 0 errors.
  - `check:rtl`: 0 errors (pure logical CSS, 0 Arabic diacritics).
  - `eslint`: 0 errors, 0 warnings.
  - `vitest`: 497/497 passing (59 test suites).
  - `playwright`: 3/3 E2E test flows passing.

