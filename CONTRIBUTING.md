<div align="center">

# Contributing to Dossier

[![Version](https://img.shields.io/badge/version-1.0.0-2563eb?style=flat-square&logo=semver)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-AGPL--3.0-dc2626?style=flat-square)](LICENSE)
![TypeScript](https://img.shields.io/badge/typescript-5.9%2B-3178c6?style=flat-square&logo=typescript)
![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20Self--Hosted-9333ea?style=flat-square&logo=linux)

</div>

---

Contributions to Dossier are welcome. Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

---

## Table of Contents

- [Day-to-Day Work](#day-to-day-work)
- [Branching Model](#branching-model)
- [Commit Conventions](#commit-conventions)
- [Coding & Comment Style](#coding--comment-style)
- [File Header Convention](#file-header-convention)
- [Verification Suite](#verification-suite)
- [Pull Request Process](#pull-request-process)
- [Release Process](#release-process)

---

<a id="day-to-day-work"></a>
## Day-to-Day Work

- **Toolchain:** Node.js >= 20.9 (recommended Node 22 LTS), npm >= 10.
- **Environment:** Copy `.env.example` to `.env.local` for local development.

```bash
npm install
npm run db:migrate
npm run seed
npm run dev
```

---

<a id="branching-model"></a>
## Branching Model

- Branches use `feature/`, `fix/`, `docs/`, `chore/` prefixes (e.g. `feature/crypto-verification`, `fix/invoice-rounding`).
- All work branches from `main`.

---

<a id="commit-conventions"></a>
## Commit Conventions

- Work commits: `dossier | <type>: <description>` or standard Conventional Commits (`feat(...)`, `fix(...)`, `chore(...)`).
- Release commits: `dossier | vX.Y.Z | <type>: <description>`.
- Commit types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`.

---

<a id="coding--comment-style"></a>
## Coding & Comment Style

- **TypeScript:** Strict mode enabled. No `any` types unless interfacing with dynamic third-party untyped payloads.
- **RTL & Bidirectionality:** Never use physical Tailwind direction classes (`ml-*`, `mr-*`, `pl-*`, `pr-*`, `left-*`, `right-*`, `text-left`, `text-right`). Always use logical alternatives (`ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`, `text-start`, `text-end`). Verified via `npm run check:rtl`.
- **Comment Policy:** Source code files (`.ts`, `.tsx`, `.js`, `.mjs`, `.css`) must not contain non-directive comments. The file-top credit banner (and compiler directives like `// eslint-disable...` or `/// <reference...`) is the only tolerated occurrence. Verified via `npm run check:comments`.
- **Configuration Files:** Configuration files (`.env*`, `.sh`, `.yml`, `.json`) use `# ── Section Name ──` dividers.

---

<a id="file-header-convention"></a>
## File Header Convention

Every source file begins with the official Dossier header banner, followed by an empty line:

```typescript
// Dossier - <Module Name / Purpose>
// https://github.com/red-shadows-rs/dossier

```

For stylesheet files (`.css`):

```css
/* Dossier - <Styles Purpose> */
/* https://github.com/red-shadows-rs/dossier */

```

For shell scripts and configuration files:

```bash
# ─────────────────────────────────────────────
# Dossier - <Script / Config Purpose>
# https://github.com/red-shadows-rs/dossier
# ─────────────────────────────────────────────

```

---

<a id="verification-suite"></a>
## Verification Suite

Before submitting any contribution, run the full verification suite to ensure zero regressions:

```bash
# 1. Type check
npm run typecheck

# 2. ESLint analysis
npm run lint

# 3. Logical RTL compliance check
npm run check:rtl

# 4. Comment policy guard
npm run check:comments

# 5. Unit & integration test suite
npm test -- --run

# 6. Next.js production build
npm run build
```

---

<a id="pull-request-process"></a>
## Pull Request Process

1. Fork the repository and create your branch from `main`.
2. Ensure all verification checks pass locally with exit code 0.
3. Update `CHANGELOG.md` with your changes under `[Unreleased]` or the pending release block.
4. Open a pull request against `main` describing the changes and referencing any related issues.

---

<a id="release-process"></a>
## Release Process (Maintainers)

A release is ONE commit containing the pending work plus the version bump:

1. Bump the version in `package.json` and `package-lock.json`.
2. Update the version badges in `README.md`, `README_AR.md`, and `docs/`.
3. Rotate the `CHANGELOG.md` entry into a `## [vX.Y.Z] - <date>` block.
4. Run full verification suite: `npm run typecheck && npm run lint && npm run check:rtl && npm run check:comments && npm test -- --run && npm run build`.
5. Commit and tag:
   ```bash
   git commit -m "dossier | vX.Y.Z | release: <summary>"
   git tag -a vX.Y.Z -m "vX.Y.Z - <summary>"
   git push origin main vX.Y.Z
   ```

---

<div align="center">

Built by <a href="https://github.com/red-shadows-rs">RED SHADOWS</a> (<a href="https://github.com/shadow-x78">shadow-x78</a>) ·
[Code of Conduct](CODE_OF_CONDUCT.md) ·
[Back to README](README.md)

<sub>&copy; 2026 Dossier - RED SHADOWS (shadow-x78)</sub>

</div>

