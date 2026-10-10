# UI Audit — Dossier

Read-only inventory + findings. Evidence is exact file paths and line numbers (branch `ui-redesign`, HEAD `1d27711`).

> Summary: the UI is already **flat, tokenized, RTL-clean, single-font (Cairo), i18n-complete, no emoji, no gradients, no fake data**. It does NOT have the usual "AI slop". The real defects are **structural (mobile navigation is missing)** and **consistency** (radius scale, status-color tokens, touch targets, dialog overflow).

## Baseline (see ui-log.md for verbatim output)

- `typecheck` 0 · `lint` 0 · `check:rtl` 0 · `test` 494/494 · `build` exit 0, zero warnings · `start` health 200.
- Before screenshots: `tmp/ui-shots/before/` (62 PNGs, 12 pages × 2 themes × 3 widths).

## Design tokens (current)

- Colors (dark default, `src/app/globals.css:6-18`): `--background #0b0b0f`, `--surface #14141a`, `--border #26262e`, `--text #ededf0`, `--muted #9a9aa6`, `--primary #e11d48`, `--danger #ef4444`, `--success #22c55e`, `--warning #f59e0b`, `--info #3b82f6`.
- Light overrides (`globals.css:24-31`): `#ffffff / #f6f6f8 / #e4e4e9 / #16161a / #6b6b76`.
- Radii (`tailwind.config.ts:43-47`): `lg 10px`, `md 8px`, `sm 6px` → **3 distinct radius values**.
- Shadows: only `shadow-lg`, used twice, both overlays (`UserMenu.tsx:20`, `Toast.tsx:73`) — justified.
- Font: `var(--font-cairo)` (`globals.css:51`, loaded `src/app/layout.tsx:10-14`).
- Breakpoints: Tailwind defaults (sm 640 / md 768 / lg 1024 / xl 1280 / 2xl 1536).
- z-index: `z-30` (builder toolbar), `z-40` (UserMenu), `z-50` (Toast).
- Status colors leak into utilities as raw palette: `Badge.tsx:8-14` (`text-blue-600`, `bg-green-500/10` …), `Toast.tsx:32-34`, `v/[code]/page.tsx:188` (`text-green-700`).

## Inventory

### App shell / layout
- `src/app/layout.tsx` — root; sets `lang`/`dir`, Cairo, theme class, `NextIntlClientProvider`.
- `src/app/(app)/layout.tsx` — `Sidebar` + `TopBar` + `main` (`max-w-[1280px]`), wraps `ToastProvider`.
- `src/components/layout/Sidebar.tsx` — nav entries filtered by permission; `hidden … md:flex` (desktop only).
- `src/components/layout/TopBar.tsx` — `LocaleSwitch`, `ThemeSwitch`, `UserMenu`.
- `src/components/layout/{UserMenu,LocaleSwitch,ThemeSwitch,SettingsNav}.tsx`.
- `src/app/(app)/error.tsx` — route error boundary with retry. **No `loading.tsx` / `not-found.tsx` under `(app)`.**

### Pages (36 total)
Dashboard `(app)/page.tsx`; clients (list/new/[id]/[id]/edit); projects (…); contracts (list/new/[id]/[id]/edit); invoices (…); templates (…); settings (index/company/defaults/email/numbering/signing); users (list/new/[id]); account; audit; public `login`, `s/[token]` (signing), `verify`, `v/[code]`.

### UI primitives (`src/components/ui/*`)
`Button`, `Input`, `Textarea`, `Select`, `Field`, `BilingualField`, `Card` (+Header/Title/Content/Footer), `Table` (+Head/Body/Row/HeaderCell/Cell/Empty), `Tabs`, `Badge`, `Pagination`, `Dialog`, `ConfirmDialog`, `Toast`, `EmptyState`, `cn`.

### Overlays / feedback / states
- Modal: `Dialog.tsx` (native `<dialog>` + focus trap), `ConfirmDialog.tsx`, `SendContractDialog.tsx`, `ContractLifecycleActions.tsx`, `TemplateActions.tsx`, `InvoiceActions.tsx`.
- Toasts: `Toast.tsx` (`aria-live`, auto-dismiss 5s, dismiss `aria-label`).
- Empty: `TableEmpty` (`Table.tsx:93`), `EmptyState.tsx`.
- Loading: `Button loading`, `Skeleton`-issuer none; no route-level `loading.tsx`.
- Error: `Field` `role="alert"`, form-level alerts, `(app)/error.tsx`.
- Charts: **none** (no chart dependency).

### Forms (33 files under `src/components/forms`)
Client, Project, Contract builder (6 steps), Invoice lines/meta, Template, Settings, User, Account, Password, Login, Signature pad, Signing experience, Verification.

## Findings

### U-001
- Severity: High
- Category: Responsive
- File: `src/components/layout/Sidebar.tsx:80`; `src/app/(app)/layout.tsx:12-20`
- Evidence: `<aside className="hidden w-60 shrink-0 … md:flex md:flex-col">`. `TopBar.tsx:13-17` shows only the logo + switches on mobile; there is **no menu button, drawer, or bottom nav** below `md`.
- Why it is a problem: on phones/tablets-portrait (< 768px) there is **no way to reach any section** (clients, projects, contracts, invoices, templates, settings, users, audit). The app is effectively unusable on mobile.
- Exact fix: add a mobile nav — a hamburger trigger in `TopBar` opening the same `NAV` list in a `Sheet`/drawer (shadcn `Sheet`, or `Dialog`-based drawer), visible below `md`; keep the desktop `<aside>`. No logic change (reuse `NAV`, `role`, permissions).
- Verification command and expected result: load `/` at 320/375/390px → menu trigger ≥ 44px, opens nav, every entry navigates; `check:rtl` and `tests/e2e/rtl.spec.ts` still pass.
- Risk of the fix: low (presentation only). Must not change permission filtering.

### U-002
- Severity: Medium
- Category: Responsive
- File: `src/components/ui/Table.tsx:15` (`overflow-x-auto`); used by `(app)/page.tsx:183+`, `clients/page.tsx`, `contracts/page.tsx`, `invoices/page.tsx`, `audit/page.tsx`, `projects/[id]/page.tsx`, etc.
- Evidence: every table scrolls horizontally inside `overflow-x-auto`; there is no card/list fallback for primary data.
- Why it is a problem: on phones, primary lists (clients, invoices, contracts) require horizontal scrolling; columns get cut off and rows are hard to scan.
- Exact fix: for the primary list pages, render a card list below `md` and the table from `md` up, using the **same rows/data** (`md:hidden` list + `hidden md:table`). Keep table for density on desktop.
- Verification command and expected result: list pages at 320/375 → no horizontal page scroll; each row readable as a card; links preserve `href`.
- Risk of the fix: medium (multiple pages); do one page per commit.

### U-003
- Severity: Medium
- Category: Inconsistency
- File: `tailwind.config.ts:43-47`; usages `Card.tsx:14` (`rounded-lg`), `Dialog.tsx:95` (`rounded-lg`), `Input.tsx:12`/`Select.tsx:12`/`Textarea.tsx:13` (`rounded-md`), `Badge.tsx:29` (`rounded-md`), `v/[code]/page.tsx:188` (`rounded-full`).
- Evidence: three radii (6/8/10px) plus a pill, with no single `--radius` token.
- Why it is a problem: §2.2 requires **one radius token**; mixed radii read as unpolished and are hard to keep consistent.
- Exact fix: define one `--radius` (e.g. `0.5rem`) and map `sm/md/lg` in `tailwind.config.ts` to it; replace `rounded-full` badge usage with the Badge component (U-004).
- Verification command and expected result: `grep -rEn "rounded-(sm|md|lg|full)" src/components/ui` shows one consistent set; build/lint pass.
- Risk of the fix: low.

### U-004
- Severity: Low
- Category: Slop / Inconsistency
- File: `src/app/v/[code]/page.tsx:183-194`
- Evidence: `StateBadge` renders `rounded-full border border-green-600/40 bg-green-600/10 … text-green-700` — a pill with a raw green, duplicating `Badge` (`Badge.tsx` already has a `green` tone).
- Why it is a problem: over-rounding (§2.1 "everything very rounded") + raw non-token color + duplicate component (§2.1 "duplicated components").
- Exact fix: replace `StateBadge` markup with `<Badge tone={valid ? "green" : "red"}>`; keep the same label/text.
- Verification command and expected result: `/v/[code]` still shows the state badge; no `rounded-full`/`green-*` left in the page.
- Risk of the fix: low.

### U-005
- Severity: Low
- Category: Inconsistency
- File: `src/components/ui/Badge.tsx:8-14`; `src/components/ui/Toast.tsx:32-34`
- Evidence: status tones hard-code Tailwind palette (`blue-500/30`, `green-500/10`, `red-…`, `amber-…`, `teal-…`) instead of the `--success/--warning/--danger/--info` tokens already defined in `globals.css`.
- Why it is a problem: a status color that looks right in one theme may fail contrast in the other; §3.1 wants color from tokens.
- Exact fix: express tones with the semantic tokens (e.g. `border-[color:var(--success)]/30 …` or dedicated `--badge-*` vars), keeping the same five tones and the same status→tone mapping.
- Verification command and expected result: light + dark screenshots of a page with each status show 4.5:1 text contrast; grep shows no `-500/` raw palette in `ui/`.
- Risk of the fix: low–medium (contrast must be re-checked in both themes).

### U-006
- Severity: Medium
- Category: Accessibility / Responsive
- File: `src/components/ui/Button.tsx:18-21` (`sm: h-8`=32px, `md: h-10`=40px); `LocaleSwitch.tsx:22` (`px-2 py-1`); `ThemeSwitch.tsx:23`
- Evidence: primary control heights are 32–40px; language buttons are ~24px tall.
- Why it is a problem: WCAG 2.2 / §4.2 want ≥ 44×44px touch targets on touch devices; small targets cause mis-taps.
- Exact fix: on coarse pointers, raise control min-height to 44px (Tailwind `pointer-coarse:` if available in 3.4, else a `@media (pointer: coarse)` rule in `globals.css`), and give `LocaleSwitch`/`ThemeSwitch` larger hitboxes.
- Verification command and expected result: measured tap target ≥ 44px at 375px width; visual check in both themes.
- Risk of the fix: low.

### U-007
- Severity: Medium
- Category: Responsive
- File: `src/components/ui/Dialog.tsx:94-97`
- Evidence: dialog is `w-[min(32rem,calc(100vw-2rem))]` with `p-5` content but **no `max-height`/overflow**; native `<dialog>` centers content and can overflow the viewport.
- Why it is a problem: tall dialogs (e.g. `SendContractDialog`, contract lifecycle) can clip off-screen on short/phone viewports with no scroll.
- Exact fix: give the dialog `max-h-[calc(100dvh-2rem)]` and an inner scroll region (`overflow-y-auto`), keep header/footer pinned. On phones optionally use full-height sheet.
- Verification command and expected result: open the tallest dialog at 320×600 → content scrolls, no clipping, Escape closes.
- Risk of the fix: low.

### U-008
- Severity: Low
- Category: Accessibility
- File: `src/components/layout/UserMenu.tsx:11-19`
- Evidence: disclosure built on `<details>/<summary>`; the chevron uses `group-open:rotate-180 rtl:rotate-180` (both classes can fight), and the menu does not close on outside click / Escape beyond native behaviour.
- Why it is a problem: keyboard/screen-reader affordances are weaker than a proper menu; the dual rotate classes are a smell.
- Exact fix: keep native `<details>` if acceptable (it is keyboard-accessible), but fix the chevron to a single logical transform; optionally migrate to shadcn `DropdownMenu` (Appendix A).
- Verification command and expected result: Tab to the menu, open, arrow/navigate, Escape closes; chevron points down→up correctly in both `dir`.
- Risk of the fix: low.

### U-009
- Severity: Low
- Category: Accessibility
- File: `src/app/(app)/layout.tsx:16`
- Evidence: no "skip to content" link; `main` has no `id`.
- Why it is a problem: keyboard users must tab through the whole sidebar on every page (§4.4).
- Exact fix: add `<a href="#main" class="sr-only focus:not-sr-only …">` as the first focusable element and `id="main"` on `<main>`.
- Verification command and expected result: first Tab reveals the skip link; activating it focuses `#main`.
- Risk of the fix: low.

### U-010
- Severity: Low
- Category: Slop (glass-lite)
- File: `src/components/forms/ContractBuilder.tsx:113`
- Evidence: `border-b border-border bg-background/95 py-2 backdrop-blur`.
- Why it is a problem: `backdrop-blur` + translucent background is the glassmorphism pattern §2.1 asks to remove; for a sticky step bar a solid background is enough.
- Exact fix: replace with a solid `bg-background` (keep the bottom border); drop `backdrop-blur` unless a real overlap needs it.
- Verification command and expected result: `/contracts/new` builder header stays opaque while scrolling; no `backdrop-blur` left in `src`.
- Risk of the fix: low.

### U-011
- Severity: Low
- Category: Responsive / Consistency
- File: `src/app/(app)/layout.tsx:16`
- Evidence: content container `max-w-[1280px]` is an arbitrary value; the app has no named content-width token.
- Why it is a problem: magic number instead of a token (§2.1 "magic numbers"), and 1280 is narrower than the 1920/2560 targets may want.
- Exact fix: add a `content` width token in `tailwind.config.ts` (e.g. `themes.screens`/`maxWidth`) and use it; verify 1440/1920/2560 spacing.
- Verification command and expected result: wide-width screenshots keep a readable line length and centered content.
- Risk of the fix: low.

### U-012 (not a UI defect — deploy note)
- Severity: Low
- Category: Bug (devops, pre-existing)
- File: `package.json:11` (`start: node .next/standalone/server.js`)
- Evidence: standalone `.next/standalone` lacks `.next/static` and `public`; bare `npm run start` serves HTML but static assets 404. The Dockerfile copies them.
- Why it is a problem: only affects bare local `start`, not the app UI; out of presentation scope.
- Exact fix (if desired, separate task): add a copy step or document it. Not part of this redesign.
- Verification command and expected result: `curl /_next/static/...css` = 200 after copy.
- Risk of the fix: n/a here.

## Accessibility snapshot (§4.4)

- Good: `lang`/`dir` on `<html>` (`layout.tsx:33-34`); `aria-current` on active nav links; `th scope="col"` (`Table.tsx:72`); dialog `aria-labelledby`/`aria-describedby` + focus trap (`Dialog.tsx:86-90`); toast `aria-live`/`role=status`; icon-only toast dismiss has `aria-label`; `Field` labels bound via `htmlFor`, errors `role="alert"`; `<img alt={label}>` (`ImageUploadField.tsx:54-57`); `aria-hidden` on decorative icons.
- Gaps: no mobile nav (U-001) → no `nav` landmark on mobile; no skip link (U-009); touch targets (U-006); status-by-color partly raw (U-005); no route `loading.tsx`.

## Slop scan results (§2.1)

- Gradients / gradient text: **none**.
- Glassmorphism: only `ContractBuilder.tsx:113` (U-010).
- Glow/colored shadows: **none**; `shadow-lg` only on 2 overlays (justified).
- Over-rounding: `v/[code]:188` `rounded-full` (U-004); radius scale otherwise small (U-003).
- Neon dark mode: **no** — neutral palette.
- Random per-card colors: **no** — colors carry status.
- Emoji in UI chrome: **none**.
- Buzzword copy: **none**.
- Fake content / lorem / “John Doe” / “10K users”: **none** (real seeded data; honest empty states via `TableEmpty`/`EmptyState`).
- Hover lift/scale, bounce/pulse, fade-up-on-scroll: **none**.
- Custom components where a library exists: all primitives are bespoke (Appendix A target of the migration).
- div-soup vs semantic HTML: mostly semantic (`aside`, `nav`, `header`, `main`, `section`, `table`, `dialog`, `form`, `label`).
- Raw colors in components: only `SignaturePad.tsx:39` `penColor: "#111111"` (functional canvas ink — justified) and the status palette above.

## Content/xState matrix (to design/test, §4.3)

- States present: loading (`Button loading`), empty (`TableEmpty`, `EmptyState`), error (`error.tsx`, form alerts), success (`Toast`). Missing: route-level `loading.tsx` skeleton.
- Extremes to test: long client name (`max-w-[10rem] truncate` in `UserMenu.tsx:13`), long unbroken strings in tables (`ellipsis`?), 0/1/many rows, multi-currency amounts (`dir="ltr" tabular-nums`), Arabic + English mixed (`BilingualField`, `ClientName`), Arabic-Indic vs Western digits.
- RTL/LTR: both supported; keep `check:rtl` + `rtl.spec.ts` green.