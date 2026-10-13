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
