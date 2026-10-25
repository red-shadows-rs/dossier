<div align="center">

# Production Deployment Guide - Dossier

[![Version](https://img.shields.io/badge/version-1.4.0-2563eb?style=flat-square&logo=semver)](../CHANGELOG.md)
[![License](https://img.shields.io/badge/license-GPL--3.0-dc2626?style=flat-square)](../LICENSE)
![Docker](https://img.shields.io/badge/docker-ready-2496ed?style=flat-square&logo=docker)
![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20Self--Hosted-9333ea?style=flat-square&logo=linux)

</div>

---

## Language

<a href="DEPLOYMENT.md">🇬🇧 English</a> · <a href="DEPLOYMENT_AR.md">🇸🇦 العربية</a>

---

This guide covers deploying Dossier into production on a Linux host using Docker Compose, Nginx as a TLS reverse proxy, and local SQLite data volume persistence.

---

## Table of Contents

- [System Requirements](#system-requirements)
- [Directory Layout](#directory-layout)
- [Environment Configuration](#environment-configuration)
- [Docker Compose Deployment](#docker-compose-deployment)
- [Nginx Reverse Proxy Configuration](#nginx-reverse-proxy-configuration)
- [Database Persistence & Volumes](#database-persistence--volumes)
- [Automated Backups](#automated-backups)
- [Updating & Maintenance](#updating--maintenance)

---

<a id="system-requirements"></a>
## System Requirements

- **Operating System:** Linux (Ubuntu 22.04+, Debian 12+, Rocky Linux, Arch Linux)
- **CPU:** 2 vCPU minimum (recommended 4 vCPU for heavy concurrent PDF generation)
- **RAM:** 2 GB minimum (recommended 4 GB)
- **Disk Space:** 10 GB SSD minimum
- **Installed Software:** Docker Engine >= 24.0, Docker Compose v2, Nginx, Certbot (Let's Encrypt)

---

<a id="directory-layout"></a>
## Directory Layout

Recommended host deployment path: `/var/www/dossier`

```
/var/www/dossier/
├── docker-compose.yml
├── .env
└── data/
    ├── dossier.sqlite
    ├── files/
    └── backups/
```

---

<a id="environment-configuration"></a>
## Environment Configuration

Create `/var/www/dossier/.env` based on `.env.example`:

```bash
# ── Core ──
NODE_ENV=production
PORT=3000
APP_URL=https://dossier.yourdomain.com
APP_SECRET=replace-with-openssl-rand-hex-32

# ── Storage ──
DATA_DIR=/app/data

# ── Locale ──
DEFAULT_LOCALE=ar

# ── Email (SMTP) ──
SMTP_HOST=smtp.yourmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=no-reply@yourdomain.com
SMTP_PASS=your-strong-smtp-password
SMTP_FROM="Dossier <no-reply@yourdomain.com>"

# ── Bootstrap Account ──
BOOTSTRAP_OWNER_EMAIL=admin@yourdomain.com
BOOTSTRAP_OWNER_PASSWORD=your-initial-admin-password
BOOTSTRAP_OWNER_NAME="System Administrator"

# ── PDF Engine ──
PDF_TIMEOUT_MS=30000
PDF_CONCURRENCY=2

# ── Backups ──
BACKUP_RETENTION_DAYS=30
TZ=UTC
```

---

<a id="docker-compose-deployment"></a>
## Docker Compose Deployment

The provided `docker-compose.yml` runs both the web application and the background worker:

```bash
cd /var/www/dossier

# Build application and worker containers
docker compose build app worker

# Launch services in the background
docker compose up -d

# Verify container health
docker compose ps
```

---

<a id="nginx-reverse-proxy-configuration"></a>
## Nginx Reverse Proxy Configuration

Install and configure Nginx with SSL:

```nginx
server {
    listen 80;
    server_name dossier.yourdomain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name dossier.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/dossier.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dossier.yourdomain.com/privkey.pem;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

<a id="database-persistence--volumes"></a>
## Database Persistence & Volumes

All application state is preserved inside `/var/www/dossier/data`:
- `dossier.sqlite`: Main database with WAL journal mode enabled.
- `files/`: Stored attachments, contract PDFs, and receipts.
- Set correct permissions:
  ```bash
  sudo chown -R 1000:1000 /var/www/dossier/data
  ```

---

<a id="automated-backups"></a>
## Automated Backups

To create a nightly backup of the SQLite database and files:

```bash
# Add to crontab (crontab -e)
0 3 * * * docker exec dossier-app-1 node scripts/backup.js >> /var/log/dossier-backup.log 2>&1
```

---

<a id="updating--maintenance"></a>
## Updating & Maintenance

To deploy an update:

```bash
cd /var/www/dossier
git pull origin main
docker compose build app worker
docker compose up -d
docker compose ps
```

---

<div align="center">

Built by <a href="https://github.com/red-shadows-rs">RED SHADOWS | RS</a> (<a href="https://github.com/shadow-x78">shadow-x78</a>) ·
[Back to README](../README.md)

<sub>&copy; 2026 Dossier - RED SHADOWS | RS (shadow-x78)</sub>

</div>

