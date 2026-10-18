<div align="center">

# Security Policy - Dossier

[![Version](https://img.shields.io/badge/version-1.0.0-2563eb?style=flat-square&logo=semver)](CHANGELOG.md)
[![License](https://img.shields.io/badge/license-AGPL--3.0-dc2626?style=flat-square)](LICENSE)
![TypeScript](https://img.shields.io/badge/typescript-5.9%2B-3178c6?style=flat-square&logo=typescript)
![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20Self--Hosted-9333ea?style=flat-square&logo=linux)

</div>

---

## Table of Contents

- [Supported Versions](#supported-versions)
- [Reporting a Vulnerability](#reporting)
- [Disclosure Policy](#disclosure)
- [Security Model & Trust Boundaries](#security-model)
- [Cryptographic Verification Architecture](#crypto-verification)
- [Database Integrity Triggers](#db-integrity)
- [Safe PDF Generation Sandbox](#pdf-sandbox)
- [Audit Logging](#audit-logging)
- [Recommendations](#recommendations)

---

<a id="supported-versions"></a>
## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.1.x   | ✅ Active development |
| < 0.1   | ❌ Not supported |

Only the latest release receives security updates.

---

<a id="reporting"></a>
## Reporting a Vulnerability

If you discover a security vulnerability in Dossier, please report it **responsibly** and **privately**.

**Preferred method:**
- Open a private security advisory on GitHub:
  [Report Security Vulnerability →](https://github.com/red-shadows-rs/dossier/security/advisories/new)

**What to include:**
- Clear description of the vulnerability and potential impact.
- Steps to reproduce or proof-of-concept (PoC).
- Affected routes, services, or database components.

**Response timeline:**
- Initial acknowledgment within 48 hours.
- Severity and impact assessment within 5 business days.
- Patch development and coordinated release within 14-30 days depending on severity.

---

<a id="disclosure"></a>
## Disclosure Policy

We follow a coordinated vulnerability disclosure policy:
1. Report received and privately acknowledged.
2. Fix engineered, verified through unit and integration suites, and released in a patch release.
3. Coordinated public disclosure with appropriate researcher credit.

---

<a id="security-model"></a>
## Security Model & Trust Boundaries

Dossier is designed as a zero-trust, self-hosted web application:

1. **Authentication & Session Tokens:**
   - User authentication uses Argon2id key derivation with per-user cryptographic salts.
   - Session identifiers are generated using high-entropy random bytes, cryptographically signed with HMAC-SHA256, and stored in HTTP-only, SameSite=Lax (or Strict), Secure cookies.
   - Client-side JavaScript cannot read or alter authentication session cookies.

2. **Role-Based Access Control (RBAC):**
   - Three discrete permission tiers: `owner`, `member`, `viewer`.
   - Mutation actions (create, edit, delete, send, sign, cancel) are enforced on the server within server actions and route handlers.

3. **Public Signing & Verification Boundary:**
   - Signatory invitations use high-entropy 256-bit random tokens (`/s/[token]`).
   - Tokens are hashed with HMAC-SHA256 before database storage. Raw tokens are never stored at rest.
   - Rate limiting protects against brute-force guessing and abuse on public routes.

---

<a id="crypto-verification"></a>
## Cryptographic Verification Architecture

Every contract version and generated PDF is cryptographically anchored:

1. **Canonical JSON Payload Hashing:**
   - Contract version metadata, title, clauses, and pricing terms are serialized into canonical, deterministic JSON (lexicographically sorted keys, invariant whitespace).
   - A SHA-256 digest is computed and immutably stored in `contract_versions.canonical_hash`.

2. **Signed Document Seal:**
   - Upon final counter-signature, a tamper-evident cryptographic seal is calculated by combining the canonical version hash, signatory timestamps, signatory names/emails, and the system secret.
   - The resulting verification code is encoded into a high-density Code39 barcode and QR code embedded in the generated PDF certificate.

3. **Public Verification Endpoint:**
   - Anyone holding the verification code or scanning the barcode can query `/v/[code]` or `/verify`.
   - The system retrieves the canonical record, validates the digest against stored ledger hashes, and reports the exact historical state without exposing internal credentials.

---

<a id="db-integrity"></a>
## Database Integrity Triggers

To prevent silent tampering or administrative corruption, the database layer enforces immutability via native triggers:
- Once a contract transitions to `signed`, an SQLite `BEFORE UPDATE` trigger rejects any subsequent mutation to the contract body, version ID, or signatories.
- Attempting to update a signed contract directly raises an `IntegrityError: signed contracts are immutable`.

---

<a id="pdf-sandbox"></a>
## Safe PDF Generation Sandbox

Dossier uses a sandboxed headless Chromium instance through Playwright to render pixel-perfect PDFs:
- The browser runs inside an unprivileged Linux user namespace.
- No arbitrary external network requests are executed during rendering: fonts, styles, and SVG brand assets are bundled locally on disk.
- HTML content is strictly escaped and sanitized to prevent XSS or server-side injection into the PDF generation context.

---

<a id="audit-logging"></a>
## Audit Logging

Every critical event produces an append-only audit entry in `audit_log`:
- User logins and logout events.
- Contract creation, version drafting, email sending, recipient views, OTP verification, and signatures.
- Invoice generation and payment recordings.
- Actor ID, actor type (user, signatory, worker, system), IP address, and metadata snapshot.

---

<a id="recommendations"></a>
## Recommendations

1. **Keep Secrets Secret:**
   - Always set `APP_SECRET` in `.env.local` or `.env.production` using `openssl rand -hex 32`.
   - Never commit `.env` files into source control.

2. **Run behind TLS Reverse Proxy:**
   - Run Dossier behind Nginx, Caddy, or Traefik with HTTP/2 and modern TLS 1.3 ciphers.
   - Enforce HSTS (`Strict-Transport-Security`).

3. **Secure SQLite Database File:**
   - Ensure the `./data/` directory and `dossier.sqlite` are owned by the application user with `0600` permissions.
   - Schedule periodic backups using the built-in backup CLI or SQLite vacuum backup API.

---

<div align="center">

Built by <a href="https://github.com/red-shadows-rs">RED SHADOWS</a> (<a href="https://github.com/shadow-x78">shadow-x78</a>) ·
[Back to README](README.md)

<sub>&copy; 2026 Dossier - RED SHADOWS (shadow-x78)</sub>

</div>

