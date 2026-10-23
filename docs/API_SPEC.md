<div align="center">

# API & Verification Specification - Dossier

[![Version](https://img.shields.io/badge/version-1.3.1-2563eb?style=flat-square&logo=semver)](../CHANGELOG.md)
[![License](https://img.shields.io/badge/license-GPL--3.0-dc2626?style=flat-square)](../LICENSE)
![TypeScript](https://img.shields.io/badge/typescript-5.9%2B-3178c6?style=flat-square&logo=typescript)
![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20Self--Hosted-9333ea?style=flat-square&logo=linux)

</div>

---

## Language

<a href="API_SPEC.md">🇬🇧 English</a> · <a href="API_SPEC_AR.md">🇸🇦 العربية</a>

---

This document details the public verification endpoints, authenticated PDF routes, health checks, and data formats supported by Dossier.

---

## Table of Contents

- [Public Endpoints](#public-endpoints)
  - [Health Check (`GET /api/health`)](#health-check)
  - [Public Verification View (`GET /v/[code]`)](#public-verification-view)
  - [Verification Search Portal (`GET /verify`)](#verification-search-portal)
  - [Signatory Signing Portal (`GET /s/[token]`)](#signatory-signing-portal)
- [Authenticated Endpoints](#authenticated-endpoints)
  - [Contract PDF Generation (`GET /api/contracts/[id]/pdf`)](#contract-pdf-generation)
  - [Invoice PDF Generation (`GET /api/invoices/[id]/pdf`)](#invoice-pdf-generation)
  - [Payment Receipt PDF (`GET /api/invoices/[id]/receipt/pdf`)](#payment-receipt-pdf)
  - [File Retrieval (`GET /api/files/[id]`)](#file-retrieval)
- [Payload Schemas](#payload-schemas)

---

<a id="public-endpoints"></a>
## Public Endpoints

<a id="health-check"></a>
### 1. Health Check

Checks application liveness and SQLite connectivity.

- **URL:** `/api/health`
- **Method:** `GET`
- **Authentication:** None
- **Response:**
  ```json
  {
    "ok": true
  }
  ```

---

<a id="public-verification-view"></a>
### 2. Public Verification View

Renders the full tamper-evident certificate for a signed contract matching `code` (e.g. `DEMO-2026-X7K9`).

- **URL:** `/v/:code`
- **Method:** `GET`
- **Authentication:** None
- **Response:** `200 OK` (HTML with Code39 Barcode, contract metadata, and SHA-256 seal) or `404 Not Found`.

---

<a id="verification-search-portal"></a>
### 3. Verification Search Portal

Public portal allowing visitors to input any document code or scan a barcode to verify document authenticity.

- **URL:** `/verify`
- **Method:** `GET`
- **Authentication:** None

---

<a id="signatory-signing-portal"></a>
### 4. Signatory Signing Portal

Secure portal for signatories to review clauses, confirm signatory identity, sign, and download agreements.

- **URL:** `/s/:token`
- **Method:** `GET`
- **Authentication:** Token-based (`:token` is an HMAC-secured 256-bit random string).

---

<a id="authenticated-endpoints"></a>
## Authenticated Endpoints

All internal endpoints require an active session cookie (`dossier_session`).

<a id="contract-pdf-generation"></a>
### 1. Contract PDF Generation
- **URL:** `/api/contracts/:id/pdf`
- **Method:** `GET`
- **Headers:** `Cookie: dossier_session=<cookie>`
- **Response:** `application/pdf` binary stream.

<a id="invoice-pdf-generation"></a>
### 2. Invoice PDF Generation
- **URL:** `/api/invoices/:id/pdf`
- **Method:** `GET`
- **Headers:** `Cookie: dossier_session=<cookie>`
- **Response:** `application/pdf` binary stream.

<a id="payment-receipt-pdf"></a>
### 3. Payment Receipt PDF
- **URL:** `/api/invoices/:id/receipt/pdf`
- **Method:** `GET`
- **Response:** `application/pdf` binary stream.

---

<div align="center">

Built by <a href="https://github.com/red-shadows-rs">RED SHADOWS | RS</a> (<a href="https://github.com/shadow-x78">shadow-x78</a>) ·
[Back to README](../README.md)

<sub>&copy; 2026 Dossier - RED SHADOWS | RS (shadow-x78)</sub>

</div>

