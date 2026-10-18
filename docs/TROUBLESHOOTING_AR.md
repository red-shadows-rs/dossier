<div align="center">

# دليل استكشاف الأخطاء وإصلاحها - Dossier

[![الإصدار](https://img.shields.io/badge/version-0.1.0-2563eb?style=flat-square&logo=semver)](../CHANGELOG.md)
[![الرخصة](https://img.shields.io/badge/license-MIT-dc2626?style=flat-square)](../LICENSE)
![TypeScript](https://img.shields.io/badge/typescript-5.9%2B-3178c6?style=flat-square&logo=typescript)
![المنصة](https://img.shields.io/badge/platform-Linux%20%7C%20Self--Hosted-9333ea?style=flat-square&logo=linux)

</div>

---

## اللغة

<a href="TROUBLESHOOTING.md">🇬🇧 English</a> · <a href="TROUBLESHOOTING_AR.md">🇸🇦 العربية</a>

---

يوفر هذا الدليل خطوات تشخيصية وحلولاً للمشاكل التقنية الأكثر شيوعاً عند تشغيل نظام Dossier.

---

## فهرس المحتويات

- [فشل محرك Chromium في توليد PDF](#فشل-محرك-chromium-في-توليد-pdf)
- [مشاكل خط Cairo وتطابق الحروف العربية](#مشاكل-خط-cairo-وتطابق-الحروف-العربية)
- [أخطاء قفل قاعدة بيانات SQLite](#أخطاء-قفل-قاعدة-بيانات-sqlite)
- [إعادة محاولة إرسال البريد الإلكتروني SMTP](#إعادة-محاولة-إرسال-البريد-الإلكتروني-smtp)
- [وضوح الباركود في الوضع الليلي](#وضوح-الباركود-في-الوضع-الليلي)

---

<a id="فشل-محرك-chromium-في-توليد-pdf"></a>
## فشل محرك Chromium في توليد PDF

**العَرَض:** خطأ `browserType.launch: Chromium sandboxing failed` أو انتهاء مهلة التوليد.

**الحل:**
التأكد من تثبيت مكتبات النظام اللازمة لتشغيل Chromium على توزيعة الخادم:
```bash
sudo apt-get install -y libnss3 libatk-bridge2.0-0 libdrm2 libxkbcommon0 libgbm1
```
داخل Docker، يعمل Playwright كـ unprivileged user مع ذاكرة مشتركة ملائمة.

---

<a id="مشاكل-خط-cairo-وتطابق-الحروف-العربية"></a>
## مشاكل خط Cairo وتطابق الحروف العربية

**العَرَض:** ظهور الحروف العربية مقطعة أو بخط النظام الافتراضي في ملفات PDF.

**الحل:**
يحتوي Dossier على خط **Cairo** المدمج محلياً داخل `assets/fonts/Cairo-Regular.ttf` و`assets/fonts/Cairo-Bold.ttf`.
تأكد من وجود مجلد `assets/` ونسخه إلى حاوية التشغيل داخل الـ Dockerfile.

---

<a id="أخطاء-قفل-قاعدة-بيانات-sqlite"></a>
## أخطاء قفل قاعدة بيانات SQLite

**العَرَض:** خطأ `SqliteError: database is locked` أو `busy`.

**الحل:**
يُفعّل Dossier نمط WAL (Write-Ahead Logging) تلقائياً عند الاتصال. تأكد من أن ملف قاعدة البيانات مخزن على نظام ملفات محلي (ext4 أو xfs) وليس على مشاركات شبكية (NFS أو SMB).

---

<a id="إعادة-محاولة-إرسال-البريد-الإلكتروني-smtp"></a>
## إعادة محاولة إرسال البريد الإلكتروني SMTP

**العَرَض:** بقاء الرسائل في حالة `retry` داخل جدول `email_outbox`.

**الحل:**
1. تفقد سجلات الحاوية العاملة:
   ```bash
   docker logs dossier-worker-1 --tail 50
   ```
2. تأكد من إعدادات المنفذ والتشفير في `.env`:
   - استخدام `SMTP_SECURE=true` للمنفذ `465`.
   - استخدام `SMTP_SECURE=false` للمنفذ `587` (STARTTLS).

---

<a id="وضوح-الباركود-في-الوضع-الليلي"></a>
## وضوح الباركود في الوضع الليلي

**الحل:**
يتم توليد الباركود كمتجهات SVG تستخدم `currentColor` بدلاً من الألوان الثابتة (`text-foreground dark:text-zinc-100 [&_rect]:fill-current`) مما يضمن وضوحاً فائقاً في الوضعين الفاتح والليلي.

---

<div align="center">

بُني بواسطة <a href="https://github.com/shadow-x78">shadow-x78</a> ·
[العودة للملف الرئيسي](../README_AR.md)

<sub>&copy; 2026 Dossier (shadow-x78)</sub>

</div>

