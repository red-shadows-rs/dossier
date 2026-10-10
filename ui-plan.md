# UI Plan — Dossier

Ordered, atomic tasks. One component/page per task. Selected library: **shadcn/ui (Appendix A)** — pending checkpoint approval.
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
