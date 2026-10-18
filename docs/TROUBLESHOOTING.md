<div align="center">

# Troubleshooting Guide - Dossier

[![Version](https://img.shields.io/badge/version-1.1.0-2563eb?style=flat-square&logo=semver)](../CHANGELOG.md)
[![License](https://img.shields.io/badge/license-GPL--3.0-dc2626?style=flat-square)](../LICENSE)
![TypeScript](https://img.shields.io/badge/typescript-5.9%2B-3178c6?style=flat-square&logo=typescript)
![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20Self--Hosted-9333ea?style=flat-square&logo=linux)

</div>

---

## Language

<a href="TROUBLESHOOTING.md">🇬🇧 English</a> · <a href="TROUBLESHOOTING_AR.md">🇸🇦 العربية</a>

---

This document outlines common diagnostic procedures and fixes for Dossier deployments.

---

## Table of Contents

- [Chromium PDF Generation Failures](#chromium-pdf-generation-failures)
- [Arabic Typography and Font Inconsistencies](#arabic-typography-and-font-inconsistencies)
- [SQLite Database Locks or Busy Errors](#sqlite-database-locks-or-busy-errors)
- [SMTP Email Delivery Retries](#smtp-email-delivery-retries)
- [Public Verification Barcode Dark Mode Rendering](#public-verification-barcode-dark-mode-rendering)

---

<a id="chromium-pdf-generation-failures"></a>
## Chromium PDF Generation Failures

**Symptom:** PDF generation throws `browserType.launch: Chromium sandboxing failed` or times out.

**Fix:**
Ensure the Docker host or Linux system has required Chromium shared libraries installed:
```bash
# Ubuntu / Debian host
sudo apt-get install -y libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libgbm1
```
Within Docker, ensure the container runs as an unprivileged user with `--ipc=host` or adequate shared memory.

---

<a id="arabic-typography-and-font-inconsistencies"></a>
## Arabic Typography and Font Inconsistencies

**Symptom:** Arabic text renders disconnected or uses system fallback fonts in generated PDFs.

**Fix:**
Dossier bundles the **Cairo** TrueType font directly within `assets/fonts/Cairo-Regular.ttf` and `assets/fonts/Cairo-Bold.ttf`.
Verify that the `assets/` directory exists and is copied into the Docker container during the runner build stage (`COPY --from=build /app/assets ./assets`).

---

<a id="sqlite-database-locks-or-busy-errors"></a>
## SQLite Database Locks or Busy Errors

**Symptom:** `SqliteError: database is locked` or `busy`.

**Fix:**
Dossier enables WAL (Write-Ahead Logging) mode automatically during database initialization. Ensure the SQLite file is on a native filesystem (ext4, btrfs, xfs) and not an NFS or CIFS network share, which lack reliable file locking.

---

<a id="smtp-email-delivery-retries"></a>
## SMTP Email Delivery Retries

**Symptom:** Emails stay in `email_outbox` with status `retry`.

**Fix:**
1. Check the background worker process:
   ```bash
   docker logs dossier-worker-1 --tail 50
   ```
2. Verify SMTP credentials in `.env`:
   - Set `SMTP_SECURE=true` for port `465`.
   - Set `SMTP_SECURE=false` for port `587` (STARTTLS).

---

<a id="public-verification-barcode-dark-mode-rendering"></a>
## Public Verification Barcode Dark Mode Rendering

**Symptom:** Barcode is invisible on dark backgrounds.

**Fix:**
All barcodes are rendered as vector SVGs using `currentColor` for rect fills (`text-foreground dark:text-zinc-100 [&_rect]:fill-current`), ensuring sharp contrast across light and dark themes.

---

<div align="center">

Built by <a href="https://github.com/red-shadows-rs">RED SHADOWS | RS</a> (<a href="https://github.com/shadow-x78">shadow-x78</a>) ·
[Back to README](../README.md)

<sub>&copy; 2026 Dossier - RED SHADOWS | RS (shadow-x78)</sub>

</div>

