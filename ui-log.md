# UI Redesign — Log

> Presentation-layer only. No business logic, API, routing, data shape, state, or env changes.
> Status: **Phase 0–5 complete, stopped at CHECKPOINT (waiting for user approval).**

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

## Rollback

```
git reset --hard pre-ui-redesign      # or: git checkout t-044-deps-upgrade
```