# UI Plan — Dossier

> **Two plans in this file.** Below is **Run 1 (shadcn/ui)** — SUPERSEDED, kept for history. The **ACTIVE plan is Run 2 (MUI)** in the **"MUI migration plan (ACTIVE)"** section at the end. Follow the ACTIVE plan; do not execute the superseded one.

Ordered, atomic tasks. One component/page per task. Selected library (Run 1): **shadcn/ui (Appendix A)** — superseded.
Every task: run its Verify, tick the box, append to `ui-log.md`. Never touch logic/services/API/stores/env.

Baseline to keep or beat: `typecheck` 0 · `lint` 0 · `check:rtl` 0 · `test` 494/494 · `build` 0 warnings.

Group commit prefixes: `style:` · `refactor(ui):` · `a11y:` · `chore:`.

---

## Phase 3 — theme & providers

- [ ] T-001 (approval gate)
  - File(s): none (decision + install)
  - Change: user confirms library (recommended shadcn/ui) and authorizes installing `shadcn` + deps. Only then run `npx shadcn@latest --help` to verify flags, then `npx shadcn@latest init` (base color `neutral`, CSS variables on). If the project later mixes libs, stop.
  - Verify: `git status` shows only intended new files (`components.json`, `src/lib/utils.ts`, deps in `package.json`); `npm run build` exit 0.
  - Expected output: `init` completes; build green; `check:rtl` still green.
  - Rollback: `git checkout -- .` + `git clean -fd src/lib src/components/ui` + `git checkout package.json package-lock.json`.
  - Depends on: none

- [ ] T-002 (fixes U-003)
  - File(s): `src/app/globals.css`, `tailwind.config.ts`
  - Change: add one `--radius: 0.5rem` token; map `borderRadius.sm/md/lg` to it in `tailwind.config.ts`; keep everything else.
  - Verify: `npm run build && npm run lint`; `grep -n "radius" tailwind.config.ts src/app/globals.css`.
  - Expected: build/lint exit 0; all three keys derive from `--radius`.
  - Rollback: `git checkout -- tailwind.config.ts src/app/globals.css`.
  - Depends on: none

- [ ] T-003 (fixes U-005)
  - File(s): `src/components/ui/Badge.tsx`, `src/components/ui/Toast.tsx`
  - Change: express status tones from semantic tokens (`--success/--warning/--danger/--info`) instead of raw `blue-500/green-500/…`; keep the same `BadgeTone` union and status→tone mapping exported.
  - Verify: `npm run typecheck && npm run build`; screenshots of a status page in light + dark; contrast ≥ 4.5:1.
  - Expected: build green; tones readable in both themes; no `-500/` palette left in `ui/`.
  - Rollback: `git checkout -- src/components/ui/Badge.tsx src/components/ui/Toast.tsx`.
  - Depends on: none

- [ ] T-004
  - File(s): `src/components/ui/*` (owned shadcn files after T-001), `src/app/globals.css`
  - Change: remove decorative shadows/gradients from owned primitives (card/button/input) leaving 1px border; keep one shadow only on overlays (dropdown/popover/dialog/sheet).
  - Verify: `grep -rEn "shadow-(sm|md|lg|xl|2xl)" src/components/ui` shows only overlay files; build green.
  - Expected: only overlay shadow remains.
  - Rollback: `git checkout -- src/components/ui`.
  - Depends on: T-001

## Phase 2 — app shell

- [ ] T-005 (fixes U-001)
  - File(s): `src/components/layout/TopBar.tsx`, new `src/components/layout/MobileNav.tsx`, `src/components/layout/Sidebar.tsx` (extract shared `NAV`)
  - Change: extract `NAV` + permission filter into a shared module; add a `<md` hamburger (≥ 44px, `aria-label`) in `TopBar` that opens the same nav in a drawer/sheet; desktop `<aside>` unchanged. No permission/logic change.
  - Verify: at 320/375/768px the menu opens and every entry routes; `check:rtl` + `tests/e2e/rtl.spec.ts` green; keyboard opens/closes (Escape).
  - Expected: full navigation reachable below `md`; desktop unchanged.
  - Rollback: `git checkout -- src/components/layout` + remove new file.
  - Depends on: T-001

- [ ] T-006 (fixes U-009)
  - File(s): `src/app/(app)/layout.tsx`
  - Change: add skip-link as first focusable element and `id="main"` on `<main>`.
  - Verify: first Tab reveals the link; activating focuses `#main`; build green.
  - Expected: skip link works in both `dir`.
  - Rollback: `git checkout -- src/app/(app)/layout.tsx`.
  - Depends on: none

- [ ] T-007 (fixes U-011)
  - File(s): `tailwind.config.ts`, `src/app/(app)/layout.tsx`
  - Change: add a named content-width token; replace `max-w-[1280px]`.
  - Verify: wide-width screenshots (1440/1920/2560) stay centered with readable line length.
  - Expected: no arbitrary `[1280px]` left.
  - Rollback: `git checkout -- tailwind.config.ts src/app/(app)/layout.tsx`.
  - Depends on: T-002

## Phase 3 — shared components

- [ ] T-008 (fixes U-007)
  - File(s): `src/components/ui/Dialog.tsx`
  - Change: add `max-h-[calc(100dvh-2rem)]` + inner `overflow-y-auto` scroll; keep header/footer pinned; keep focus trap/`aria-*`.
  - Verify: tallest dialog at 320×600 scrolls, no clip, Escape closes; build green.
  - Expected: no clipping on small heights.
  - Rollback: `git checkout -- src/components/ui/Dialog.tsx`.
  - Depends on: none

- [ ] T-009 (fixes U-006)
  - File(s): `src/app/globals.css`, `src/components/layout/LocaleSwitch.tsx`, `src/components/layout/ThemeSwitch.tsx`
  - Change: add `@media (pointer: coarse)` min 44px for buttons/icon-buttons/selects; enlarge the two switches' hitboxes.
  - Verify: measured target ≥ 44px at 375px; visual light+dark.
  - Expected: all interactive targets ≥ 44px on coarse pointers.
  - Rollback: `git checkout -- …`.
  - Depends on: none

- [ ] T-010 (fixes U-008)
  - File(s): `src/components/layout/UserMenu.tsx`
  - Change: fix chevron to a single logical transform; (optional) migrate to shadcn `DropdownMenu`.
  - Verify: open/keyboard/Escape; chevron direction correct in RTL/LTR.
  - Expected: menu accessible; no double-rotate class.
  - Rollback: `git checkout -- src/components/layout/UserMenu.tsx`.
  - Depends on: T-001

- [ ] T-011 (fixes U-010)
  - File(s): `src/components/forms/ContractBuilder.tsx`
  - Change: replace `bg-background/95 backdrop-blur` with solid `bg-background`.
  - Verify: `/contracts/new` step bar opaque while scrolling; no `backdrop-blur` in `src`.
  - Expected: flat sticky bar.
  - Rollback: `git checkout -- src/components/forms/ContractBuilder.tsx`.
  - Depends on: none

## Phase 4 — pages (most-used first)

- [ ] T-012 (fixes U-002, dashboard)
  - File(s): `src/app/(app)/page.tsx`
  - Change: below `md`, render the dashboard list tables as stacked cards using the same rows/data (`md:hidden` cards + `hidden md:table`).
  - Verify: `/` at 320/375 → no horizontal scroll; links intact; build green.
  - Expected: readable cards on phone.
  - Rollback: `git checkout -- src/app/(app)/page.tsx`.
  - Depends on: none

- [ ] T-013 (fixes U-002, clients)
  - File(s): `src/app/(app)/clients/page.tsx`
  - Change: mobile card list + desktop table (same rows).
  - Verify: `/clients` at 320/375; build green.
  - Expected: no horizontal scroll.
  - Rollback: `git checkout -- src/app/(app)/clients/page.tsx`.
  - Depends on: T-012

- [ ] T-014 (fixes U-002, invoices)
  - File(s): `src/app/(app)/invoices/page.tsx`
  - Change: mobile card list + desktop table.
  - Verify: `/invoices` at 320/375; build green.
  - Expected: no horizontal scroll.
  - Rollback: `git checkout -- src/app/(app)/invoices/page.tsx`.
  - Depends on: T-012

- [ ] T-015 (fixes U-002, contracts)
  - File(s): `src/app/(app)/contracts/page.tsx`
  - Change: mobile card list + desktop table.
  - Verify: `/contracts` at 320/375; build green.
  - Expected: no horizontal scroll.
  - Rollback: `git checkout -- src/app/(app)/contracts/page.tsx`.
  - Depends on: T-012

- [ ] T-016 (fixes U-002, projects + audit)
  - File(s): `src/app/(app)/projects/page.tsx`, `src/app/(app)/audit/page.tsx`
  - Change: same card fallback where the table is primary.
  - Verify: both routes at 320/375; build green.
  - Expected: no horizontal scroll.
  - Rollback: `git checkout -- <files>`.
  - Depends on: T-012

- [ ] T-017 (fixes U-004)
  - File(s): `src/app/v/[code]/page.tsx`
  - Change: replace `StateBadge` markup with `<Badge tone={valid ? "green" : "red"}>`.
  - Verify: `/v/<code>` renders; no `rounded-full`/`green-*` left.
  - Expected: consistent badge.
  - Rollback: `git checkout -- src/app/v/[code]/page.tsx`.
  - Depends on: T-003

## Phase 5 — responsive pass

- [ ] T-018
  - File(s): touched pages/components
  - Change: verify/adjust against the full §4.1 width set (320…2560, landscape, ~280/~700 foldables, zoom 200%/400%); fix any overflow/overlap introduced.
  - Verify: screenshot matrix light+dark, RTL+dir, no horizontal page scroll anywhere.
  - Expected: clean at every width.
  - Rollback: `git checkout -- <file>` per fix.
  - Depends on: T-005, T-012–T-016

## Phase 6 — RTL / dark mode

- [ ] T-019
  - File(s): `src/app/globals.css`, owned shadcn files in `src/components/ui`
  - Change: convert any new physical utilities to logical (`ms/me/ps/pe/start/end`); verify `.light`/`.dark` tokens; no hard-coded colors vanish in either theme.
  - Verify: `npm run check:rtl` 0; `npx playwright test rtl.spec.ts` green; both themes screenshot.
  - Expected: RTL clean, both themes correct.
  - Rollback: `git checkout -- …`.
  - Depends on: all UI tasks

## Phase 7 — accessibility pass

- [ ] T-020
  - File(s): global
  - Change: audit labels/`aria-*`/focus-visible/heading order; add route `loading.tsx` skeleton(s); confirm one `h1` per page.
  - Verify: keyboard-test main flows; axe/Lighthouse if available; build green.
  - Expected: WCAG 2.2 AA minimum on main flows.
  - Rollback: per-file `git checkout --`.
  - Depends on: T-006, T-008, T-009

## Phase 8 — removal

- [ ] T-021
  - File(s): replaced `src/components/ui/*` files, unused styles/deps
  - Change: remove each bespoke primitive replaced by shadcn ONLY after `grep -rn "<Component"` proves no references (incl. dynamic/string imports); one removal per commit.
  - Verify: `grep -rEn "<Button|<Card|<Dialog|<Table|<Input|<Select|<Tabs|<Badge" src` shows no import of removed files; build+lint+test green.
  - Expected: no dead UI code; app unchanged.
  - Rollback: `git checkout -- <file>`.
  - Depends on: T-004

## Phase 9 — final verification

- [ ] T-022
  - File(s): docs
  - Change: run full baseline; capture "after" screenshots at every §4.1 width (light+dark, RTL); re-scan for slop; run Appendix A verification commands; update `ui-plan.md`/`ui-log.md`.
  - Verify: `npm run typecheck && npm run lint && npm run check:rtl && npm run test && npm run build`; `git status`; `git diff --stat pre-ui-redesign..HEAD`.
  - Expected: equal or better than baseline; no unintended files; no secrets.
  - Rollback: `git reset --hard pre-ui-redesign`.
  - Depends on: all
---

## Execution status (actual)

- [x] T-001 install/init → superseded: **Tailwind 4.3.3 upgrade first** (commit `3c7f156`), then shadcn init + `components.json` + `lib/utils` + tokens (commit `9145d29`).
- [x] T-002 one radius token (`--radius`) — done (`9145d29`).
- [~] T-003 status tones: kept `tone` API intentionally; not tokenized (documented).
- [~] T-004 overlay-only shadow: satisfied by shadcn overlays; app primitives already flat.
- [x] T-005 mobile navigation via shadcn `Sheet` (`dc90aa0`).
- [x] T-006 skip link + `#main` (`b2baf34`).
- [ ] T-007 named content-width token — not done (kept `max-w-[1280px]`).
- [x] T-008 dialog overflow (`b2baf34`).
- [x] T-009 touch targets (`b2baf34`).
- [x] T-010 UserMenu → DropdownMenu (`8dff98f`).
- [x] T-011 remove `backdrop-blur` (`b2baf34`).
- [x] T-012..T-016 responsive: real fix was the **mobile header** (`24167e2`) → 0 page overflow at 320/375/768; tables scroll in-container (allowed).
- [x] T-017 verification badge → `Badge` (`b2baf34`).
- [x] T-018 responsive pass (probe all listing pages, dark+light, en+ar).
- [x] T-019 RTL/dark: `check:rtl` 0, RTL probes pass.
- [x] T-020 a11y pass: skip link, dialog scroll, touch targets, dropdown menu.
- [ ] T-021 removal: kept app primitives deliberately (see ui-log "Key decision"); shadcn duplicates removed.
- [x] T-022 final verification: `npm run check` (494/494), build 0 warnings, 96 after-screenshots, slop re-scan clean.

Superseded/kept items are explained in `ui-log.md`.

---

# MUI migration plan (ACTIVE)

Library: **MUI (Material UI)** — user-mandated. Strategy: **adapter** (reimplement the 15 `ui/*` primitives as thin MUI-backed components preserving their public API, so the 67 consumers and 494 tests keep working) + direct MUI for overlays. Tailwind stays for layout (§8). One theme source of truth: `src/theme.ts`.

Baseline to keep or beat (Run 2): `typecheck` 0 · `lint` 0 · `check:rtl` 0 · `test` 494/494 · `build` 0 warnings · `/api/health` 200.
Commit prefixes: `style:` · `refactor(ui):` · `a11y:` · `chore:`.
**Rule for every primitive task:** read the file first, keep the exported names/props/refs identical, change only the internals. Run the Verify after each task; tick the box; append to `ui-log.md`.

## Phase A — install + theme + providers (approval gate)

- [ ] T-M01 (fixes M-001 setup; needs install approval)
  - File(s): `package.json`, `package-lock.json`; new `src/theme.ts`
  - Change: `npm install @mui/material@latest @emotion/react@latest @emotion/styled@latest @mui/icons-material@latest @mui/material-nextjs@latest stylis@latest stylis-plugin-rtl@latest` — **only after** verifying versions/peer support for React 18.3.1 + Next 16 against the official docs (`UNVERIFIED:` until then). Create `src/theme.ts` with `createTheme({ cssVariables: true, colorSchemes: { light, dark }, colorSchemeSelector: 'class', shape: { borderRadius: 6 }, typography: { fontFamily: 'var(--font-cairo), ...' }, components: { MuiButton:{defaultProps:{disableElevation:true}}, MuiPaper:{defaultProps:{elevation:0}, styleOverrides:{root:{backgroundImage:'none'}}}, MuiCard:{defaultProps:{variant:'outlined'}}, MuiAppBar:{defaultProps:{elevation:0,color:'inherit'}}, MuiTooltip:{defaultProps:{arrow:false}} } })`; palette primary `#e11d48`, neutral surfaces, status colors.
  - Verify: `npm run typecheck && npm run build` (exit 0); `git status` shows only intended files; no MUI default purple in a smoke page.
  - Expected output: install exit 0; build 0 warnings; theme compiles.
  - Rollback: `npm uninstall @mui/material @emotion/react @emotion/styled @mui/icons-material @mui/material-nextjs stylis stylis-plugin-rtl && git checkout -- package.json package-lock.json && rm -f src/theme.ts`.
  - Depends on: checkpoint approval

- [ ] T-M02 (fixes M-004, M-005, M-006)
  - File(s): new `src/components/Providers.tsx` (client); `src/app/layout.tsx`
  - Change: add `AppRouterCacheProvider` (`@mui/material-nextjs`, import path per Next 16 — `UNVERIFIED:`), `ThemeProvider`+`CssBaseline`, `InitColorSchemeScript`, and an RTL Emotion `CacheProvider` (`createCache({ key:'muirtl', stylisPlugins:[prefixer, rtlPlugin] })` for `ar`, default cache for `en`) switched by the current locale. Keep `NextIntlClientProvider`, `<html lang dir>`, Cairo var, and the `dossier_theme` class.
  - Verify: `npm run build && npm run check:rtl`; load `/` dark+light, `ar`+`en`; no style flash; console has no MUI ordering/hydration warnings.
  - Expected: build green; RTL cache active for `ar`; scheme follows the existing classes.
  - Rollback: `git checkout -- src/app/layout.tsx && rm -f src/components/Providers.tsx`.
  - Depends on: T-M01

## Phase B — shared primitives (adapter; one file per task)

- [ ] T-M03 (fixes M-… Button)
  - File(s): `src/components/ui/Button.tsx`
  - Change: reimplement on MUI `Button`/`IconButton`; keep `forwardRef`, `ButtonVariant`, `ButtonSize`, `loading`, `asChild` (map to MUI `component`/`Slot`-free), and every class passthrough. Keep `data-slot="button"` + `aria-busy`.
  - Verify: `npm run typecheck && npm run build`; `npm run test` (494); spot-check a page with primary/secondary/ghost/icon/loading buttons in dark+light.
  - Expected: identical props/behavior; focus-visible + disabled preserved; ripple kept.
  - Rollback: `git checkout -- src/components/ui/Button.tsx`.
  - Depends on: T-M02

- [ ] T-M04 (Input)
  - File(s): `src/components/ui/Input.tsx`
  - Change: reimplement on MUI `Input`/`OutlinedInput`; keep `forwardRef<HTMLInputElement>` and spread of input props (react-hook-form `register` must still work in all 24 consumers).
  - Verify: `npm run typecheck && npm run build && npm run test`; a form still registers/validates.
  - Rollback: `git checkout -- src/components/ui/Input.tsx`.
  - Depends on: T-M02

- [ ] T-M05 (Select)
  - File(s): `src/components/ui/Select.tsx`
  - Change: reimplement on MUI `Select` with `native` (renders a native `<select>`), keeping `forwardRef<HTMLSelectElement>` and `children` options.
  - Verify: build+test; a `<Select>` still submits its value.
  - Rollback: `git checkout -- src/components/ui/Select.tsx`.
  - Depends on: T-M02

- [ ] T-M06 (Textarea)
  - File(s): `src/components/ui/Textarea.tsx`
  - Change: reimplement on MUI `Input` with `multiline`; keep `forwardRef<HTMLTextAreaElement>`.
  - Verify: build+test; a textarea still registers.
  - Rollback: `git checkout -- src/components/ui/Textarea.tsx`.
  - Depends on: T-M02

- [ ] T-M07 (fixes M-007, Field)
  - File(s): `src/components/ui/Field.tsx`
  - Change: reimplement on MUI `FormControl`+`FormLabel`+`FormHelperText`; keep `label/htmlFor/error/hint/required/className/children`; error keeps `role="alert"`; required marker stays (no emoji).
  - Verify: build+test; form errors render and are announced.
  - Rollback: `git checkout -- src/components/ui/Field.tsx`.
  - Depends on: T-M02

- [ ] T-M08 (Card)
  - File(s): `src/components/ui/Card.tsx`
  - Change: reimplement on MUI `Card` (`variant="outlined"`) + `CardHeader`/`CardContent`/`CardActions`, preserving `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardFooter` exports and semantics (`section`/`header`/`footer`).
  - Verify: build+test; spot-check 3 pages.
  - Rollback: `git checkout -- src/components/ui/Card.tsx`.
  - Depends on: T-M02

- [ ] T-M09 (fixes M-007, Badge)
  - File(s): `src/components/ui/Badge.tsx`
  - Change: reimplement on MUI `Chip` (`size="small"`, `variant="outlined"`); keep `BadgeTone` union, `contractStatusTone`, `invoiceStatusTone` and the status→tone mapping; colors from theme/status palette (no raw Tailwind palette).
  - Verify: build+test; light+dark status contrast ≥ 4.5:1; `v/[code]` badge renders.
  - Rollback: `git checkout -- src/components/ui/Badge.tsx`.
  - Depends on: T-M02

- [ ] T-M10 (Table)
  - File(s): `src/components/ui/Table.tsx`
  - Change: reimplement on MUI `Table`/`TableHead`/`TableRow`/`TableCell` inside `TableContainer` (`overflow-x:auto`); keep `Table`, `TableHead`, `TableBody`, `TableRow`, `TableHeaderCell`, `TableCell`, `TableEmpty` exports and `th scope="col"`.
  - Verify: build+test; a list page still renders and scrolls in-container at 320px.
  - Rollback: `git checkout -- src/components/ui/Table.tsx`.
  - Depends on: T-M02

- [ ] T-M11 (Dialog, fixes overflow)
  - File(s): `src/components/ui/Dialog.tsx`
  - Change: **read first**; reimplement on MUI `Dialog` (`fullScreen` on `sm`), keep the public API, focus trap, `Escape`, `aria-labelledby`/`aria-describedby`, and the Run 1 `max-h`/scroll behavior.
  - Verify: build+test; tallest dialog at 320×600 scrolls, no clip, Escape closes.
  - Rollback: `git checkout -- src/components/ui/Dialog.tsx`.
  - Depends on: T-M02

- [ ] T-M12 (ConfirmDialog)
  - File(s): `src/components/ui/ConfirmDialog.tsx`
  - Change: reimplement on MUI `Dialog`+`DialogActions`; keep props/behavior (used in 7 files).
  - Verify: build+test; confirm/cancel flows unchanged.
  - Rollback: `git checkout -- src/components/ui/ConfirmDialog.tsx`.
  - Depends on: T-M11

- [ ] T-M13 (fixes M-008, Toast)
  - File(s): `src/components/ui/Toast.tsx`
  - Change: reimplement on MUI `Snackbar`+`Alert`; keep `ToastProvider`, `useToast`, `ToastInput`/`ToastTone` (info/success/error) and auto-dismiss; `aria-live`/`role` retained; colors from theme.
  - Verify: build+test; a toast still shows/dismisses; contrast ok in both themes.
  - Rollback: `git checkout -- src/components/ui/Toast.tsx`.
  - Depends on: T-M02

- [ ] T-M14 (EmptyState)
  - File(s): `src/components/ui/EmptyState.tsx`
  - Change: **read first**; reimplement on MUI `Box`/`Stack`+`Typography`; keep props (used in 10 files).
  - Verify: build+test.
  - Rollback: `git checkout -- src/components/ui/EmptyState.tsx`.
  - Depends on: T-M02

- [ ] T-M15 (Pagination)
  - File(s): `src/components/ui/Pagination.tsx`
  - Change: **read first**; reimplement on MUI `Pagination`; keep props (used in 5 files) and link-based navigation (no logic change).
  - Verify: build+test; paging a list works.
  - Rollback: `git checkout -- src/components/ui/Pagination.tsx`.
  - Depends on: T-M02

## Phase C — app shell (direct MUI)

- [ ] T-M16 (Sidebar → Drawer permanent)
  - File(s): `src/components/layout/Sidebar.tsx`
  - Change: render MUI `Drawer variant="permanent"` + `List`; keep entries/permission filter/`<nav>` landmark.
  - Verify: build+test; desktop layout unchanged; `check:rtl` 0.
  - Rollback: `git checkout -- src/components/layout/Sidebar.tsx`.
  - Depends on: T-M03, T-M07

- [ ] T-M17 (NavItem → ListItemButton)
  - File(s): `src/components/layout/NavItem.tsx`
  - Change: reimplement on MUI `ListItemButton`+`ListItemIcon` with `component={Link}`; keep `aria-current` and active styling.
  - Verify: build+test; active state correct.
  - Rollback: `git checkout -- src/components/layout/NavItem.tsx`.
  - Depends on: T-M03

- [ ] T-M18 (fixes M-002, MobileNav → Drawer temporary; drop Sheet)
  - File(s): `src/components/layout/MobileNav.tsx`
  - Change: replace shadcn `Sheet` with MUI `Drawer variant="temporary"`; side follows `dir`; keep the hamburger (`aria-label`), all entries, locale/theme switches, and close-on-navigate.
  - Verify: at 375px the drawer opens with all 9 entries, closes on Escape/backdrop; RTL side correct; `check:rtl` 0; `rtl.spec.ts` green.
  - Rollback: `git checkout -- src/components/layout/MobileNav.tsx`.
  - Depends on: T-M02, T-M17

- [ ] T-M19 (fixes M-002, UserMenu → Menu; drop DropdownMenu)
  - File(s): `src/components/layout/UserMenu.tsx`
  - Change: replace shadcn `DropdownMenu` with MUI `IconButton`+`Menu`/`MenuItem`; keep items, keyboard, Escape, click-outside.
  - Verify: build+test; menu opens/keys/Escape; RTL ok.
  - Rollback: `git checkout -- src/components/layout/UserMenu.tsx`.
  - Depends on: T-M03

- [ ] T-M20 (TopBar → AppBar/Toolbar)
  - File(s): `src/components/layout/TopBar.tsx`
  - Change: render MUI `AppBar elevation={0} color="inherit"` + `Toolbar`; keep layout and children.
  - Verify: build+test; header looks identical.
  - Rollback: `git checkout -- src/components/layout/TopBar.tsx`.
  - Depends on: T-M18, T-M19

- [ ] T-M21 (LocaleSwitch / ThemeSwitch → MUI)
  - File(s): `src/components/layout/LocaleSwitch.tsx`, `src/components/layout/ThemeSwitch.tsx`
  - Change: reimplement on MUI `ButtonGroup`/`ToggleButtonGroup`/`IconButton`; theme toggle uses `useColorScheme()`; keep the `dossier_theme` cookie + class behavior (no logic change).
  - Verify: build+test; toggling theme/locale still persists.
  - Rollback: `git checkout -- …`.
  - Depends on: T-M02

## Phase D — pages, responsive, RTL, a11y

- [ ] T-M22 (fixes M-009)
  - File(s): `src/app/(app)/layout.tsx`
  - Change: express content width via MUI `Container maxWidth` or a named token; replace `max-w-[1280px]`; keep `id="main"` + skip link.
  - Verify: 1440/1920/2560 screenshots centered, readable.
  - Rollback: `git checkout -- src/app/(app)/layout.tsx`.
  - Depends on: T-M02

- [ ] T-M23 (responsive pass)
  - File(s): list pages / dashboard where a table is primary
  - Change: card list `<sm` + table `≥sm` using the same rows only where needed; verify against the full §4.1 width set; fix overflow/overlap.
  - Verify: screenshot matrix light+dark, `ar`+`en`, no horizontal page scroll 320…2560.
  - Rollback: per-file `git checkout --`.
  - Depends on: T-M10, T-M22

- [ ] T-M24 (RTL / dark verification)
  - File(s): global
  - Change: convert any new physical utilities to logical; verify both themes/CSS vars; test Dialog/Menu/Drawer/Tabs in RTL; icons mirror only where required.
  - Verify: `npm run check:rtl` 0; `npx playwright test rtl.spec.ts` green.
  - Rollback: per-file.
  - Depends on: Phase B, C

- [ ] T-M25 (accessibility pass)
  - File(s): global
  - Change: labels/`aria-*`/focus-visible/heading order; optional `loading.tsx` skeletons; one `h1` per page.
  - Verify: keyboard-test main flows; axe/Lighthouse if available; build green.
  - Rollback: per-file.
  - Depends on: T-M24

## Phase E — removal + final

- [ ] T-M26 (fixes M-001, M-003)
  - File(s): shadcn/dead files + deps
  - Change: remove `src/components/ui/{sheet,dropdown-menu,alert,alert-dialog,checkbox,label,popover,radio-group,separator,skeleton,switch,tabs,table,badge,tooltip}.tsx`, `src/lib/utils.ts`, `components.json`; uninstall `radix-ui`, `class-variance-authority`, `tw-animate-css` and shadcn-only deps — **each only after** `grep -rEn` proves zero references (incl. dynamic/string imports). One removal per commit.
  - Verify: `grep -rEn "from ['\"](radix-ui|@radix-ui)" src` and `"@/lib/utils"` return nothing; build+lint+check:rtl+test green.
  - Rollback: per-file/`npm install` the removed package.
  - Depends on: T-M18, T-M19, T-M13, and all primitive tasks

- [ ] T-M27 (final verification)
  - File(s): docs
  - Change: run the full baseline; capture "after" screenshots at every §4.1 width (light+dark, `ar`+`en`); re-scan for slop + second-library + raw colors + barrel icon imports; update `ui-plan.md`/`ui-log.md`.
  - Verify: `npm run typecheck && npm run lint && npm run check:rtl && npm run test && npm run build`; `grep -rEn "from '@mui/icons-material'" src` empty; `grep -rEn "from ['\"](antd|@mantine|@chakra-ui|react-bootstrap|@radix-ui)" src` empty; `git status`; `git diff --stat pre-mui-migration..HEAD`.
  - Expected: equal or better than baseline; no unintended files; no secrets.
  - Rollback: `git reset --hard pre-mui-migration`.
  - Depends on: all

## Notes / open items

- `UNVERIFIED:` MUI major (v7) vs Next 16 `@mui/material-nextjs` import path + React 18 peer support (T-M01/T-M02).
- `UNVERIFIED:` `colorSchemeSelector: 'class'` value and `cssVariables` + RTL cache interaction (T-M01/T-M02/T-M24).
- The adapter keeps Tailwind for layout; MUI components are never re-styled with utility classes (§8).
- `#111111` SignaturePad ink is a justified raw color (M-010).
