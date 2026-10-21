# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [v1.3.0] - 2026-10-22

### Added
- **Subscriptions & Scheduled Services Management:** Complete recurring service billing module allowing organizations to schedule, provision, and track recurring services (such as cloud hosting, maintenance contracts, retainer agreements, and recurring domain renewals). Features include custom billing frequencies (daily, weekly, monthly, quarterly, yearly), customizable interval counts, automatic scheduled invoice generation via daily worker cron jobs, manual invoice generation on demand, pause/resume/cancel lifecycle workflows, and automated next-run date progression.
- **Dedicated Crypto & Digital Wallet Payment Accounts:** Integrated provider-specific transfer configurations for Binance (custom blockchain networks, deposit wallet address, memo/tag) and PayPal (merchant email, direct payment links), seamlessly rendering dedicated payment instruction cards in both the web app and PDF invoice documents.
- **Dynamic Multi-Currency Support:** Introduced currency selector with localized currency symbols and English currency names (SAR, USD, EUR, GBP, AED, QAR, KWD, BHD, OMR) across invoice and subscription creation workflows.
- **Automated Recurring Billing Cron Worker:** Background queue worker integration (`processScheduledSubscriptions`) running inside `daily-jobs.ts` to automatically query due subscriptions, generate sequential draft invoices, attach line items, and advance execution dates atomically.

### Changed
- **Fractional Pricing & Subunit Handling:** Support for fractional item pricing and exact minor unit rounding preventing subtotal mismatches in multi-item invoices.
- **Invoice Payment Methods Selector:** Redesigned invoice payment method card picker with bank logos, status indicators, and clean form layout alignment.
- **PDF Layout Polish:** Sticky footer alignment, optimized Cairo font typography, and refined payment method card layouts across printed invoice documents.

## [v1.2.1] - 2026-10-19

### Security & Privacy
- **Settings Concealment in Demo Mode:** Completely removed the "Settings" entry from navigation and mobile menus for demo visitors to prevent exposing company operational configurations and bank details.
- **Route Guard for Settings:** Added automatic redirect from `/settings` and any settings subpage to `/` when authenticated as a demo user.
- **Scoped Operational Pages:** Wrapped clients, projects, contracts, invoices, and templates pages in `withDbInstance` to guarantee complete query routing to `dossier-demo.sqlite`.

## [v1.2.0] - 2026-10-18

### Added
- **Physical Demo Database Isolation:** Introduced dedicated SQLite database (`dossier-demo.sqlite`) activated automatically via AsyncLocalStorage and session token routing (`demo_*`), guaranteeing 100% data separation and zero real customer or pricing leakage.
- **Pure Synthetic Demo Dataset:** Replaced all seed fixtures with completely fictional, randomized Saudi corporate entities, contracts, and invoices.
- **Production Sanitization Tooling:** Added `scripts/clean-production-demo-data.ts` to purge any previously injected demo records from production SQLite database.
- **One-Click Demo Lifecycle Actions:** Added `exitDemoAction` to reliably terminate demo sessions and navigate immediately to `/login`, and enhanced `resetDemoAction` to refresh data instantly.

### Changed
- **AI-Slop & Visual Cleanup:** Fully removed all decorative `Sparkles` icons, glowing neon box shadows, multi-color gradient bars, and decorative accent lines across forms, templates, clauses, charts, and the demo banner.
- **Enterprise Demo Banner:** Redesigned demo banner to a sleek minimalist enterprise top bar with subtle badge and standard buttons.
- **Dashboard Layout Unification:** Harmonized KPI card heights and padding, fixed `- 0` overdue invoice formatting bug, and balanced metrics layout across light and dark modes.

## [v1.1.0] - 2026-10-18

### Added
- **Interactive Live Demo System:** Added `/demo` route featuring immediate one-click guest authentication, automatic provisioning of realistic bilingual contracts and invoices, and a persistent session for hands-on evaluation.
- **Demo Mode Banner:** Context-aware floating status banner rendering across the application when authenticated as a demo user, with instant "Reset Demo Data" action and session exit.
- **Login Demo CTA:** Prominent "Try Live Demo" one-click shortcut on `/login` and direct documentation links.
- **Repository Discussions & Auto-Merge:** Synchronized GitHub repository features with Orbiscreen standard, including GitHub Discussions, automatic branch deletion on merge, and pull request auto-merge support.

### Changed
- **Team Identity Standardization:** Aligned team branding to `RED SHADOWS | RS` across all project documentation, footers, legal templates, and GitHub metadata.
- **Description & License Alignment:** Streamlined repository and `package.json` descriptions to match Orbiscreen standard without redundant team attribution; adopted `GPL-3.0-or-later` license and unified badge layout across all documentation suites.

## [v1.0.0] - 2026-10-18

### Added
- **Documentation Suite:** Comprehensive bilingual documentation suite modeled after the enterprise standard, including `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, `docs/API_SPEC.md`, `docs/TROUBLESHOOTING.md`, and their complete Arabic counterparts (`_AR.md`).
- **Code Standards & Clean Comment Policy:** Added strict file-top credit banners across all source code, tests, and configuration files, verified by automated `scripts/check-comments.sh` guard script.
- **Git Metadata:** Clean `.gitattributes` Linguist configuration and hardened `.gitignore`.

### Changed
- Promoted Dossier to official `v1.0.0` production release.

## [v0.11.0] - 2026-10-17

### Added
- **Production Containerization:** Multi-stage production `Dockerfile` with Playwright Chromium headless binary installation, Cairo font configuration, and non-root execution.
- **Docker Compose Orchestration:** Full multi-container setup with PostgreSQL 16, application service, background email worker, and automated database health checks.
- **Nginx Reverse Proxy:** Reverse proxy configuration with SSL termination, HTTP/2, security headers, rate limiting, and asset caching.
- **Continuous Integration:** GitHub Actions CI workflow running typechecks, ESLint, RTL verification, comment policy checks, and Vitest test suite on every commit.

## [v0.10.0] - 2026-10-17

### Added
- **Analytics Dashboard:** Executive KPI dashboard with financial summaries, revenue metrics, active contracts, outstanding invoices, and quarterly/monthly period filters.
- **Organization Settings:** Company profile management with logo uploads, legal entity information, and commercial registration numbers.
- **Banking Management:** Multi-currency bank account registry (IBAN, SWIFT, bank branch details) for automated invoice payment instructions.
- **Sequence Numbering Generator:** Customizable atomic sequence number generators for contracts (`CNT-YYYY-XXXX`) and invoices (`INV-YYYY-XXXX`).
- **Administration & Backups:** User role delegation (Owner, Member, Viewer), session termination, health monitoring endpoints (`/api/health`), and automated PostgreSQL database backup utilities.

## [v0.9.0] - 2026-10-16

### Added
- **Asynchronous Email Worker:** Dedicated background worker process polling PostgreSQL queue with advisory locking to prevent duplicate processing.
- **Exponential Retry Engine:** Automated retry mechanism with exponential backoff and persistent failure audit logging.
- **Transactional Email Templates:** High-fidelity HTML and text notification templates for contract signing invitations, invoice delivery, payment receipts, and OTP security codes.
- **SMTP Transport Layer:** Configurable SMTP mailer integration with TLS security and fallback connection handling.

## [v0.8.0] - 2026-10-16

### Added
- **Cryptographic Document Sealing:** SHA-256 document hashing and canonical payload serialization ensuring tamper-evident contract snapshots.
- **Code39 Barcode Generator:** High-density barcode generator embedding contract verification codes directly into document footers.
- **Public Verification Portals:** Responsive verification interfaces (`/v/[code]` and `/verify`) with dark/light theme support, instant authenticity lookup, and audit trail confirmation.

## [v0.7.0] - 2026-10-15

### Added
- **Public Digital Signing Portal:** Secure public access route (`/s/[token]`) protected by opaque, single-use, cryptographically generated tokens.
- **OTP Verification Flow:** Two-factor signing authentication via time-sensitive email one-time passwords with rate-limiting protection.
- **Signature Canvas:** HTML5 touch- and pen-sensitive digital signature canvas with live preview and base64 vector capture.
- **Digital Completion Certificate:** Automated generation of tamper-evident signing certificates recording signatory IP addresses, timestamps, email addresses, and SHA-256 digests.

## [v0.6.0] - 2026-10-14

### Added
- **Headless Chromium PDF Generator:** Playwright-driven PDF printing engine with exact pixel-perfect fidelity, `@page` margin control, and pagination counters.
- **Embedded Cairo Typography:** Native Arabic font embedding ensuring crisp, high-resolution rendering without system font dependencies.
- **Document PDF Templates:** High-fidelity HTML templates for bilingual contracts, tax invoices, and payment receipts with RTL mirroring.
- **Streaming PDF API Routes:** Server-side streaming endpoints (`/api/contracts/[id]/pdf`, `/api/invoices/[id]/pdf`, `/api/invoices/[id]/receipt/pdf`) with HTTP caching headers.

## [v0.5.0] - 2026-10-13

### Added
- **Milestone Billing Engine:** Flexible milestone payment scheduling with percentage splits, fixed amount installments, and automated due date calculation.
- **Automated Invoice Generator:** One-click invoice generation from completed contract milestones with itemized line items and tax calculations.
- **Payment Recording & Receipts:** Transaction ledger tracking partial and full payments, issuing numbered receipts with balance-due recalculation.

## [v0.4.0] - 2026-10-12

### Added
- **Interactive Contract Builder:** Multi-step contract drafting interface with live bilingual side-by-side preview and real-time state synchronization.
- **Bilingual Clause Library:** Standardized Arabic and English contractual clauses covering scope of work, intellectual property, confidentiality, payment terms, and governing law.
- **Dynamic Variable Interpolation:** Context-aware template engine interpolating client details, financial amounts, and milestones into clause markdown.

## [v0.3.0] - 2026-10-10

### Added
- **Client Directory:** Comprehensive client contact registry with billing addresses, tax identification numbers, and contact personnel.
- **Project Dossier Model:** Centralized project workspace linking contracts, invoices, milestones, uploaded asset files, and audit logs into a unified dossier.
- **Structured Audit Logging:** Immutable audit trail recording user actions, IP addresses, entity mutations, and document transitions.
- **File Asset Storage:** Secure file upload and retrieval system for project attachments, signed documents, and client branding assets.

## [v0.2.0] - 2026-10-09

### Added
- **Authentication & Session Security:** Argon2id password hashing, HTTP-only secure cookie session management, and role-based access control (RBAC).
- **Bilingual Internationalization (i18n):** Native Arabic RTL and English LTR interface with next-intl, dynamic locale switching, and bidirectional typography.
- **Authentication Views:** Login, initial setup wizard, password change forms, and account settings interface.
- **Application Shell:** Responsive navigation sidebar, breadcrumbs, theme switcher (dark/light mode), and locale toggle.

## [v0.1.0] - 2026-10-08

### Added
- **Core Architecture & Toolchain:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS, PostCSS, and Cairo font assets.
- **Database Layer:** PostgreSQL database with Drizzle ORM, type-safe schema definitions, connection pooling, and baseline database migrations.
- **Runtime Utilities & Primitives:** Strongly-typed environment configuration, nanoid-based ID generators, crypto helpers, structured JSON logger, and UI design system primitives.

---

<div align="center">

Built by <a href="https://github.com/red-shadows-rs">RED SHADOWS | RS</a> (<a href="https://github.com/shadow-x78">shadow-x78</a>) ·
[Back to README](README.md)

<sub>&copy; 2026 Dossier - RED SHADOWS | RS (shadow-x78)</sub>

</div>
