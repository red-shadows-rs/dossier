<div align="center">

# دليل النشر والتشغيل في بيئة الإنتاج - Dossier

[![الإصدار](https://img.shields.io/badge/version-1.1.0-2563eb?style=flat-square&logo=semver)](../CHANGELOG.md)
[![الرخصة](https://img.shields.io/badge/license-AGPL--3.0-dc2626?style=flat-square)](../LICENSE)
![Docker](https://img.shields.io/badge/docker-ready-2496ed?style=flat-square&logo=docker)
![المنصة](https://img.shields.io/badge/platform-Linux%20%7C%20Self--Hosted-9333ea?style=flat-square&logo=linux)

</div>

---

## اللغة

<a href="DEPLOYMENT.md">🇬🇧 English</a> · <a href="DEPLOYMENT_AR.md">🇸🇦 العربية</a>

---

يشرح هذا الدليل خطوات نشر نظام Dossier على خادم لينكس حقيقي في بيئة الإنتاج باستخدام Docker Compose وخادم Nginx كوسيط عكسي (Reverse Proxy) مع شهادات SSL والتخزين المحلي الدائم.

---

## فهرس المحتويات

- [متطلبات النظام](#متطلبات-النظام)
- [هيكل المجلدات على الخادم](#هيكل-المجلدات-على-الخادم)
- [إعداد متغيرات البيئة](#إعداد-متغيرات-البيئة)
- [التشغيل عبر Docker Compose](#التشغيل-عبر-docker-compose)
- [إعداد خادم Nginx الوسيط](#إعداد-خادم-nginx-الوسيط)
- [الحفاظ على البيانات والنسخ الاحتياطي](#الحفاظ-على-البيانات-والنسخ-الاحتياطي)
- [التحديث والصيانة الدورية](#التحديث-والصيانة-الدورية)

---

<a id="متطلبات-النظام"></a>
## متطلبات النظام

- **نظام التشغيل:** Linux (Ubuntu 22.04+, Debian 12+, Rocky Linux, Arch Linux)
- **المعالج:** 2 vCPU كحد أدنى (يفضل 4 vCPU للتعامل السريع مع توليد ملفات PDF المتزامنة)
- **الذاكرة العشوائية (RAM):** 2 جيجابايت كحد أدنى (يفضل 4 جيجابايت)
- **مساحة القرص:** 10 جيجابايت SSD كحد أدنى
- **البرمجيات المثبتة:** Docker Engine >= 24.0, Docker Compose v2, Nginx, Certbot

---

<a id="هيكل-المجلدات-على-الخادم"></a>
## هيكل المجلدات على الخادم

المسار المقترح لنشر النظام: `/var/www/dossier`

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

<a id="إعداد-متغيرات-البيئة"></a>
## إعداد متغيرات البيئة

قم بإنشاء الملف `/var/www/dossier/.env` بناءً على `.env.example`:

```bash
# ── الإعدادات الأساسية ──
NODE_ENV=production
PORT=3000
APP_URL=https://dossier.yourdomain.com
APP_SECRET=replace-with-openssl-rand-hex-32

# ── التخزين ──
DATA_DIR=/app/data

# ── اللغة الافتراضية ──
DEFAULT_LOCALE=ar

# ── خادم البريد (SMTP) ──
SMTP_HOST=smtp.yourmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=no-reply@yourdomain.com
SMTP_PASS=your-strong-smtp-password
SMTP_FROM="Dossier <no-reply@yourdomain.com>"

# ── الحساب الإداري الأولي ──
BOOTSTRAP_OWNER_EMAIL=admin@yourdomain.com
BOOTSTRAP_OWNER_PASSWORD=your-initial-admin-password
BOOTSTRAP_OWNER_NAME="System Administrator"

# ── محرك PDF ──
PDF_TIMEOUT_MS=30000
PDF_CONCURRENCY=2

# ── النسخ الاحتياطي ──
BACKUP_RETENTION_DAYS=30
TZ=UTC
```

---

<a id="التشغيل-عبر-docker-compose"></a>
## التشغيل عبر Docker Compose

```bash
cd /var/www/dossier

# بناء الحاويات
docker compose build app worker

# تشغيل الخدمات في الخلفية
docker compose up -d

# التحقق من حالة الحاويات
docker compose ps
```

---

<a id="إعداد-خادم-nginx-الوسيط"></a>
## إعداد خادم Nginx الوسيط

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

<a id="الحفاظ-على-البيانات-والنسخ-الاحتياطي"></a>
## الحفاظ على البيانات والنسخ الاحتياطي

يتم تخزين كافة البيانات داخل مجلد `/var/www/dossier/data`:
- `dossier.sqlite`: قاعدة البيانات المشغلة بنمط WAL للسرعة وحماية البيانات.
- `files/`: العقود والشهادات الموقعة والمرفقات وسندات القبض.
- لجدولة النسخ الاحتياطي الليلي أضف إلى cron (`crontab -e`):
  ```bash
  0 3 * * * docker exec dossier-app-1 node scripts/backup.js >> /var/log/dossier-backup.log 2>&1
  ```

---

<a id="التحديث-والصيانة-الدورية"></a>
## التحديث والصيانة الدورية

لتطبيق التحديثات البرمجية وسحب الإصدارات الجديدة:

```bash
cd /var/www/dossier
git pull origin main
docker compose build app worker
docker compose up -d
docker compose ps
```

---

<div align="center">

تم التطوير بواسطة <a href="https://github.com/red-shadows-rs">RED SHADOWS | RS</a> (<a href="https://github.com/shadow-x78">shadow-x78</a>) ·
[العودة للملف الرئيسي](../README_AR.md)

<sub>&copy; 2026 Dossier - RED SHADOWS | RS (shadow-x78)</sub>

</div>

