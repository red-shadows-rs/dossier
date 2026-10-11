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