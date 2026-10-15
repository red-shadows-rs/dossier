import type { CurrencyCode, Locale } from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import type { DocLang } from "@/lib/doc-lang";
import { FONT_STACK } from "@/server/pdf/fonts";
import type { ContractSnapshotV1 } from "@/server/templating/variables";

export type { DocLang } from "@/lib/doc-lang";

export const esc = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export function isRtl(lang: DocLang): boolean {
  return lang === "ar";
}

export function docDir(lang: DocLang): "rtl" | "ltr" {
  return lang === "ar" ? "rtl" : "ltr";
}

export function num(value: string): string {
  return `<span class="num">${esc(value)}</span>`;
}

export function money(minor: number, currency: string, lang: Locale): string {
  return num(formatMoney(minor, currency as CurrencyCode, lang));
}

export function fmtQty(qtyMilli: number): string {
  const whole = Math.trunc(qtyMilli / 1000);
  const frac = qtyMilli % 1000;
  if (frac === 0) return String(whole);
  return `${whole}.${String(frac).padStart(3, "0").replace(/0+$/, "")}`;
}

export function baseCss(fonts: string): string {
  return `${fonts}
@page {
  size: A4;
  margin: 14mm 14mm 16mm 14mm;
}
* {
  box-sizing: border-box;
}
html {
  font-family: ${FONT_STACK};
  font-size: 8.5pt;
  color: #18181b;
  background: #ffffff;
}
body {
  margin: 0;
  line-height: 1.55;
  background: #ffffff;
}
[lang="ar"], .ar {
  line-height: 1.75;
}
p {
  margin: 0 0 2mm;
  orphans: 3;
  widows: 3;
  overflow-wrap: anywhere;
}
p.note {
  font-size: 7.8pt;
  color: #52525b;
}
ul {
  margin: 0 0 2.5mm;
  padding-inline-start: 4.5mm;
}
li {
  margin-bottom: 1mm;
}
.num {
  font-variant-numeric: tabular-nums;
  font-family: monospace;
  direction: ltr;
  unicode-bidi: isolate;
}
.watermark {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 80pt;
  font-weight: 900;
  color: rgba(225, 29, 72, 0.05);
  transform: rotate(-30deg);
  pointer-events: none;
  z-index: 0;
  letter-spacing: 0.08em;
}

/* Header Styling */
.contract-hero-header {
  border-bottom: 0.4mm solid #e4e4e7;
  padding-bottom: 3.5mm;
  margin-bottom: 4mm;
  position: relative;
}
.contract-hero-header::before {
  content: "";
  display: block;
  height: 1.2mm;
  background: linear-gradient(90deg, #e11d48 0%, #be123c 50%, #14141a 100%);
  margin-bottom: 3.5mm;
  border-radius: 1mm;
}
.header-top-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 3mm;
}
.header-logo-container {
  display: flex;
  align-items: center;
}
.header-logo {
  max-height: 12mm;
  max-width: 38mm;
  object-fit: contain;
}
.brand-logo-fallback {
  display: flex;
  align-items: center;
  gap: 2mm;
}
.brand-title {
  font-size: 10pt;
  font-weight: 900;
  letter-spacing: 0.04em;
  color: #14141a;
}
.header-pills-container {
  display: flex;
  gap: 2mm;
  align-items: center;
}
.header-pill {
  display: inline-flex;
  align-items: center;
  gap: 1.5mm;
  background: #f4f4f5;
  border: 0.3mm solid #e4e4e7;
  border-radius: 1.5mm;
  padding: 0.8mm 2.2mm;
  font-size: 7.2pt;
  color: #27272a;
  font-weight: 600;
}
.doc-number-pill {
  background: #14141a;
  border-color: #14141a;
  color: #ffffff;
  font-family: monospace;
  font-weight: 700;
  font-size: 7.5pt;
}
.pill-lbl {
  font-size: 6.2pt;
  text-transform: uppercase;
  color: #71717a;
  font-weight: 700;
}
.doc-number-pill .pill-lbl {
  color: #fb7185;
}

/* Titles */
.doc-badge {
  display: inline-block;
  background: #fff1f2;
  color: #e11d48;
  border: 0.25mm solid #fecdd3;
  border-radius: 1.5mm;
  padding: 0.6mm 2mm;
  font-size: 6.8pt;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 1.2mm;
}
.contract-main-title {
  font-size: 13pt;
  font-weight: 900;
  color: #14141a;
  line-height: 1.25;
  margin: 0 0 1.2mm;
}
.contract-meta-sub {
  font-size: 7.5pt;
  color: #52525b;
}

/* Bilingual Structure — pure side-by-side */
.bilingual-clause {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 3.5mm;
  page-break-inside: auto;
}
.clause-parties,
.clause-signatures {
  break-inside: avoid;
  page-break-inside: avoid;
}
.clause-heading-row {
  break-inside: avoid;
  break-after: avoid;
}
.clause-heading-row th {
  padding: 2.5mm 0 1.5mm;
  background: transparent;
  border: none;
}
.article-header {
  display: flex;
  align-items: center;
  gap: 1.8mm;
}
.article-badge {
  display: inline-block;
  background: #fff1f2;
  color: #e11d48;
  border: 0.25mm solid #fecdd3;
  border-radius: 1.2mm;
  padding: 0.6mm 2mm;
  font-size: 7.2pt;
  font-weight: 800;
  white-space: nowrap;
}
.article-title {
  font-size: 9.8pt;
  font-weight: 800;
  color: #14141a;
}
.col-en {
  width: 50%;
  vertical-align: top;
  direction: ltr;
  text-align: left;
  padding: 1.5mm 3.5mm 2mm 0;
}
.col-ar {
  width: 50%;
  vertical-align: top;
  direction: rtl;
  text-align: right;
  padding: 1.5mm 0 2mm 3.5mm;
}
.divider {
  border-inline-end: 0.35mm solid #e4e4e7;
}

/* Clauses single mode */
.contract-single-clause {
  margin-bottom: 4mm;
  break-inside: auto;
}
.clause-body-single {
  padding-top: 1.5mm;
}

/* Cards & Tables */
.contract-card {
  background: #fafafa;
  border: 0.3mm solid #e4e4e7;
  border-radius: 2mm;
  padding: 2.5mm 3mm;
  margin: 1.5mm 0;
  break-inside: avoid;
}
.section-badge {
  font-size: 6.8pt;
  font-weight: 800;
  color: #e11d48;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-bottom: 1.5mm;
}
.party-box {
  margin-bottom: 2mm;
}
.party-box:last-child {
  margin-bottom: 0;
}
.party-role {
  font-size: 7pt;
  font-weight: 800;
  color: #e11d48;
  text-transform: uppercase;
  margin-bottom: 0.5mm;
}
.party-name {
  font-size: 8.8pt;
  font-weight: 800;
  color: #14141a;
  margin-bottom: 0.5mm;
}
.party-meta {
  font-size: 7.2pt;
  color: #52525b;
  line-height: 1.4;
}
.party-lbl {
  color: #71717a;
  font-weight: 600;
}
.party-val {
  color: #18181b;
  font-weight: 500;
}

/* Modern Contract Tables */
.contract-table {
  width: 100%;
  border-collapse: collapse;
  margin: 1.5mm 0;
  font-size: 7.2pt;
  border: 0.3mm solid #e4e4e7;
  border-radius: 1.5mm;
  overflow: hidden;
}
.contract-table thead {
  display: table-header-group;
}
.contract-table th {
  background: #f8f9fa;
  color: #3f3f46;
  font-size: 6.5pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 1.4mm 1.5mm;
  border: none;
  border-bottom: 0.35mm solid #d4d4d8;
  vertical-align: middle;
}
.contract-table td {
  padding: 1.4mm 1.5mm;
  border: none;
  border-bottom: 0.25mm solid #f4f4f5;
  vertical-align: top;
  color: #18181b;
}
.contract-table td.num {
  white-space: nowrap;
}
.contract-table tbody tr:last-child td {
  border-bottom: none;
}
.contract-table tbody tr:nth-child(even) td {
  background: #fafafa;
}
.clause-num {
  font-weight: 700;
  color: #52525b;
  margin-inline-end: 1.5mm;
  display: inline-block;
  direction: ltr;
}

/* Signatures */
.sig-grid {
  display: flex;
  gap: 2.5mm;
  margin-top: 1mm;
}
.sig-card {
  flex: 1;
  background: #fafafa;
  border: 0.3mm solid #e4e4e7;
  border-radius: 2mm;
  padding: 2.5mm;
  min-height: 25mm;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  break-inside: avoid;
}
.sig-role {
  font-size: 6.8pt;
  font-weight: 800;
  color: #e11d48;
  text-transform: uppercase;
  margin-bottom: 1mm;
}
.sig-mark-area {
  min-height: 11mm;
  display: flex;
  align-items: center;
  gap: 2mm;
  margin: 1mm 0;
}
.sig-img {
  max-height: 11mm;
  max-width: 30mm;
  object-fit: contain;
}
.stamp {
  max-height: 13mm;
  max-width: 22mm;
  object-fit: contain;
}
.sig-name {
  font-size: 8.2pt;
  font-weight: 800;
  color: #14141a;
}
.sig-title {
  font-size: 7pt;
  color: #71717a;
}
.sig-date {
  font-size: 6.5pt;
  color: #71717a;
  margin-top: 0.8mm;
}
.sig-pending {
  font-size: 7pt;
  color: #a1a1aa;
  font-style: italic;
}

/* Unsigned Note */
.unsigned-card {
  margin: 4mm 0;
  background: #fff1f2;
  border: 0.35mm solid #fecdd3;
  border-radius: 2mm;
  padding: 2.5mm 3.5mm;
  text-align: center;
  break-inside: avoid;
}
.unsigned-badge {
  display: inline-block;
  background: #e11d48;
  color: #ffffff;
  font-weight: 800;
  font-size: 7.2pt;
  padding: 0.6mm 2.2mm;
  border-radius: 1.5mm;
  margin: 0 1mm;
  text-transform: uppercase;
}
.unsigned-desc {
  margin: 1mm 0 0;
  font-size: 7pt;
  color: #9f1239;
}

/* Verification */
.verify {
  margin-top: 5mm;
  border: 0.3mm solid #e4e4e7;
  border-radius: 2mm;
  padding: 2.5mm 3mm;
  background: #fafafa;
  break-inside: avoid;
}
.verify-badge {
  font-size: 6.8pt;
  font-weight: 800;
  color: #e11d48;
  letter-spacing: 0.04em;
  margin-bottom: 1mm;
}
.verify .qr {
  width: 24mm;
  height: 24mm;
  border-radius: 1.5mm;
  border: 0.25mm solid #e4e4e7;
  background: #ffffff;
  padding: 1mm;
}
.verify .hash {
  font-family: monospace;
  font-size: 6.8pt;
  color: #71717a;
  word-break: break-all;
}

/* Certificate of Completion */
.cert {
  break-before: page;
  padding-top: 2mm;
}
.cert h1 {
  font-size: 13pt;
  font-weight: 900;
  color: #14141a;
  margin: 0 0 3mm;
  border-bottom: 0.4mm solid #e4e4e7;
  padding-bottom: 2mm;
}
.cert table {
  width: 100%;
  border-collapse: collapse;
  margin: 2mm 0;
  border: 0.3mm solid #e4e4e7;
  border-radius: 1.5mm;
  overflow: hidden;
}
.cert th {
  background: #f8f9fa;
  color: #3f3f46;
  font-size: 6.8pt;
  font-weight: 700;
  padding: 1.6mm 2mm;
  border-bottom: 0.3mm solid #e4e4e7;
  text-align: start;
}
.cert td {
  padding: 1.5mm 2mm;
  border-bottom: 0.25mm solid #f4f4f5;
  font-size: 7.5pt;
  color: #18181b;
}
.cert tbody tr:last-child td {
  border-bottom: none;
}
.muted {
  color: #71717a;
  font-size: 7.2pt;
}
`;
}

export function documentShell(input: {
  lang: DocLang;
  title: string;
  fonts: string;
  watermark?: string | null;
  body: string;
  extraCss?: string;
}): string {
  const dir = docDir(input.lang);
  const htmlLang = input.lang === "bilingual" ? "en" : input.lang;
  return `<!doctype html><html lang="${htmlLang}" dir="${dir}"><head><meta charset="utf-8"><title>${esc(input.title)}</title><style>${baseCss(input.fonts)}${input.extraCss ?? ""}</style></head><body>${
    input.watermark
      ? `<div class="watermark">${esc(input.watermark)}</div>`
      : ""
  }${input.body}</body></html>`;
}

export function buildFooterTemplate(meta: {
  docNumber: string;
  code: string | null;
  kind?: "contract" | "invoice";
  lang?: DocLang;
}): string {
  if (meta.kind === "invoice") {
    const isRtlDoc = meta.lang === "ar";
    return `<div style="position: absolute; bottom: 0; left: 0; right: 0; width: 100%; height: 13mm; margin: 0; padding: 0 8mm; background-color: #e11d48; -webkit-print-color-adjust: exact; color: #ffffff; font-family: 'IBM Plex Sans Arabic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 8pt; font-weight: 700; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; direction: ${isRtlDoc ? "rtl" : "ltr"};">
      <span dir="ltr">Dossier</span>
      <span dir="ltr"><span class="pageNumber"></span> / <span class="totalPages"></span></span>
    </div>`;
  }
  const grouped = meta.code
    ? meta.code
        .toUpperCase()
        .replace(/[\s-]/g, "")
        .replace(/(.{4})(?=.)/g, "$1-")
    : "";
  return `<div style="font-size:8px;width:100%;padding:0 14mm;display:flex;justify-content:space-between;direction:ltr;color:#71717a;font-family:'IBM Plex Sans Arabic',Arial,sans-serif;font-weight:600;"><span>${esc(meta.docNumber)}</span><span>${esc(grouped)}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;
}

export function renderPartiesBlock(
  snapshot: ContractSnapshotV1,
  lang: DocLang,
): string {
  const p = snapshot.provider;
  const c = snapshot.client;

  function partyHtml(
    roleTitle: string,
    name: string,
    legalName: string | null | undefined,
    crNumber: string | null | undefined,
    taxNumber: string | null | undefined,
    address: string | null | undefined,
    extraLabel: string,
    extraValue: string | null | undefined,
    labels: { legal: string; cr: string; tax: string; addr: string },
  ): string {
    const lines: string[] = [];
    if (legalName)
      lines.push(
        `<span class="party-lbl">${esc(labels.legal)}:</span> <span class="party-val">${esc(legalName)}</span>`,
      );
    if (crNumber)
      lines.push(
        `<span class="party-lbl">${esc(labels.cr)}:</span> <span class="party-val">${esc(crNumber)}</span>`,
      );
    if (taxNumber)
      lines.push(
        `<span class="party-lbl">${esc(labels.tax)}:</span> <span class="party-val">${esc(taxNumber)}</span>`,
      );
    if (address)
      lines.push(
        `<span class="party-lbl">${esc(labels.addr)}:</span> <span class="party-val">${esc(address)}</span>`,
      );
    if (extraValue)
      lines.push(
        `<span class="party-lbl">${esc(extraLabel)}:</span> <span class="party-val">${esc(extraValue)}</span>`,
      );
    return `
      <div class="party-box">
        <div class="party-role">${esc(roleTitle)}</div>
        <div class="party-name">${esc(name)}</div>
        <div class="party-meta">${lines.join(" · ")}</div>
      </div>
    `;
  }

  const enProvider = partyHtml(
    "First Party (Service Provider)",
    p.nameEn || p.nameAr || "",
    p.legalNameEn,
    p.crNumber,
    p.taxNumber,
    p.addressEn,
    "Email",
    p.email,
    { legal: "Legal Name", cr: "CR", tax: "VAT", addr: "Address" },
  );
  const enClient = partyHtml(
    "Second Party (Client)",
    c.nameEn || c.nameAr || "",
    c.legalNameEn,
    c.crNumber,
    c.taxNumber,
    c.addressEn,
    "Rep",
    c.repNameEn,
    { legal: "Legal Name", cr: "CR", tax: "VAT", addr: "Address" },
  );

  const arProvider = partyHtml(
    "الطرف الأول (مزود الخدمة)",
    p.nameAr || p.nameEn || "",
    p.legalNameAr,
    p.crNumber,
    p.taxNumber,
    p.addressAr,
    "البريد",
    p.email,
    {
      legal: "الاسم القانوني",
      cr: "س.ت",
      tax: "الرقم الضريبي",
      addr: "العنوان",
    },
  );
  const arClient = partyHtml(
    "الطرف الثاني (العميل)",
    c.nameAr || c.nameEn || "",
    c.legalNameAr,
    c.crNumber,
    c.taxNumber,
    c.addressAr,
    "الممثل",
    c.repNameAr,
    {
      legal: "الاسم القانوني",
      cr: "س.ت",
      tax: "الرقم الضريبي",
      addr: "العنوان",
    },
  );

  if (lang === "bilingual") {
    return `
      <table class="bilingual-clause" style="margin: 0;">
        <tbody>
          <tr>
            <td class="col-en divider" dir="ltr" style="width: 50%; vertical-align: top;">
              <div class="contract-card">
                <div class="section-badge">PARTIES TO THE AGREEMENT</div>
                ${enProvider}
                ${enClient}
              </div>
            </td>
            <td class="col-ar" dir="rtl" style="width: 50%; vertical-align: top;">
              <div class="contract-card">
                <div class="section-badge">أطراف العقد</div>
                ${arProvider}
                ${arClient}
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    `;
  }

  if (lang === "ar") {
    return `
      <div class="contract-card" dir="rtl">
        <div class="section-badge">أطراف العقد</div>
        <div style="display: flex; gap: 4mm;">
          <div style="flex: 1;">${arProvider}</div>
          <div style="flex: 1;">${arClient}</div>
        </div>
      </div>
    `;
  }

  return `
    <div class="contract-card" dir="ltr">
      <div class="section-badge">PARTIES TO THE AGREEMENT</div>
      <div style="display: flex; gap: 4mm;">
        <div style="flex: 1;">${enProvider}</div>
        <div style="flex: 1;">${enClient}</div>
      </div>
    </div>
  `;
}

export function renderPricingTableBlock(
  snapshot: ContractSnapshotV1,
  lang: DocLang,
): string {
  const currency = snapshot.contract.currency;

  function tableHtml(tableLang: Locale): string {
    const isArabic = tableLang === "ar";
    const thNum = "#";
    const thDesc = isArabic ? "الوصف" : "Description";
    const thQty = isArabic ? "الكمية" : "Qty";
    const thPrice = isArabic ? "سعر الوحدة" : "Unit price";
    const thTotal = isArabic ? "الإجمالي" : "Total";

    const rows = snapshot.items
      .map((item) => {
        const desc = isArabic
          ? esc(item.descriptionAr ?? item.descriptionEn ?? "")
          : esc(item.descriptionEn ?? item.descriptionAr ?? "");
        return `<tr>
          <td class="num" style="width: 8%; text-align: center;">${esc(String(item.position))}</td>
          <td>${desc}</td>
          <td class="num" style="width: 14%; text-align: end;">${num(fmtQty(item.qtyMilli))}</td>
          <td class="num" style="width: 24%; text-align: end;">${money(item.unitPriceMinor, currency, tableLang)}</td>
          <td class="num" style="width: 24%; text-align: end;">${money(item.lineTotalMinor, currency, tableLang)}</td>
        </tr>`;
      })
      .join("");

    return `
      <table class="contract-table">
        <thead>
          <tr>
            <th style="width: 8%; text-align: center;">${thNum}</th>
            <th>${thDesc}</th>
            <th style="width: 14%; text-align: end;">${thQty}</th>
            <th style="width: 24%; text-align: end;">${thPrice}</th>
            <th style="width: 24%; text-align: end;">${thTotal}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  if (lang === "bilingual") {
    return `
      <table class="bilingual-clause" style="margin: 0;">
        <tbody>
          <tr>
            <td class="col-en divider" dir="ltr" style="width: 50%; vertical-align: top;">
              <div class="section-badge">PRICING SPECIFICATION</div>
              ${tableHtml("en")}
            </td>
            <td class="col-ar" dir="rtl" style="width: 50%; vertical-align: top;">
              <div class="section-badge">تفاصيل الأتعاب والأسعار</div>
              ${tableHtml("ar")}
            </td>
          </tr>
        </tbody>
      </table>
    `;
  }

  const currentLocale = lang === "ar" ? "ar" : "en";
  const badge =
    lang === "ar" ? "تفاصيل الأتعاب والأسعار" : "PRICING SPECIFICATION";
  return `
    <div dir="${docDir(lang)}">
      <div class="section-badge">${badge}</div>
      ${tableHtml(currentLocale)}
    </div>
  `;
}

export function renderPaymentScheduleBlock(
  snapshot: ContractSnapshotV1,
  lang: DocLang,
): string {
  const currency = snapshot.contract.currency;

  function tableHtml(tableLang: Locale): string {
    const isArabic = tableLang === "ar";
    const thNum = "#";
    const thMilestone = isArabic ? "الدفعة / المرحلة" : "Milestone";
    const thPercent = isArabic ? "النسبة" : "%";
    const thNet = isArabic ? "الصافي" : "Net";
    const thTax = isArabic ? "الضريبة" : "Tax";
    const thTotal = isArabic ? "الإجمالي" : "Total";
    const thDue = isArabic ? "الاستحقاق" : "Due";

    const rows = snapshot.milestones
      .map((m) => {
        const title = isArabic
          ? esc(m.titleAr || m.titleEn)
          : esc(m.titleEn || m.titleAr);
        const trigger = isArabic
          ? esc(m.triggerNoteAr || m.triggerNoteEn || "")
          : esc(m.triggerNoteEn || m.triggerNoteAr || "");
        const percent =
          m.percentBp !== null ? num(`${(m.percentBp / 100).toFixed(2)}%`) : "—";
        const dueDate = m.dueDate ? esc(m.dueDate) : "—";

        return `<tr>
          <td class="num" style="width: 6%; text-align: center;">${esc(String(m.position))}</td>
          <td>
            <strong>${title}</strong>
            ${trigger ? `<br><span class="muted" style="font-size: 7pt;">${trigger}</span>` : ""}
          </td>
          <td class="num" style="width: 10%; text-align: end;">${percent}</td>
          <td class="num" style="width: 18%; text-align: end;">${money(m.amountMinor, currency, tableLang)}</td>
          <td class="num" style="width: 16%; text-align: end;">${money(m.taxMinor, currency, tableLang)}</td>
          <td class="num" style="width: 18%; text-align: end;">${money(m.totalMinor, currency, tableLang)}</td>
          <td style="width: 14%; font-size: 7.2pt; text-align: center;">${dueDate}</td>
        </tr>`;
      })
      .join("");

    return `
      <table class="contract-table">
        <thead>
          <tr>
            <th style="width: 6%; text-align: center;">${thNum}</th>
            <th>${thMilestone}</th>
            <th style="width: 10%; text-align: end;">${thPercent}</th>
            <th style="width: 18%; text-align: end;">${thNet}</th>
            <th style="width: 16%; text-align: end;">${thTax}</th>
            <th style="width: 18%; text-align: end;">${thTotal}</th>
            <th style="width: 14%; text-align: center;">${thDue}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  if (lang === "bilingual") {
    return `
      <table class="bilingual-clause" style="margin: 0;">
        <tbody>
          <tr>
            <td class="col-en divider" dir="ltr" style="width: 50%; vertical-align: top;">
              <div class="section-badge">PAYMENT SCHEDULE</div>
              ${tableHtml("en")}
            </td>
            <td class="col-ar" dir="rtl" style="width: 50%; vertical-align: top;">
              <div class="section-badge">جدول الدفعات والمراحل</div>
              ${tableHtml("ar")}
            </td>
          </tr>
        </tbody>
      </table>
    `;
  }

  const currentLocale = lang === "ar" ? "ar" : "en";
  const badge =
    lang === "ar" ? "جدول الدفعات والمراحل" : "PAYMENT SCHEDULE";
  return `
    <div dir="${docDir(lang)}">
      <div class="section-badge">${badge}</div>
      ${tableHtml(currentLocale)}
    </div>
  `;
}

export type SignatureRender = {
  role: "provider" | "client";
  name: string;
  title: string | null;
  signedAtMs: number | null;
  method: "drawn" | "typed" | null;
  imageDataUri: string | null;
  typedName: string | null;
};

function formatSignedAt(ms: number): string {
  return new Date(ms).toISOString().replace("T", " ").slice(0, 16);
}

export function renderSignaturesBlock(
  signatures: SignatureRender[],
  stampDataUri: string | null,
  lang: DocLang,
): string {
  const provider = signatures.find((s) => s.role === "provider");
  const client = signatures.find((s) => s.role === "client");

  function sigCard(
    sig: SignatureRender | undefined,
    role: "provider" | "client",
    targetLang: Locale,
  ): string {
    const isArabic = targetLang === "ar";
    const roleTitle =
      role === "provider"
        ? isArabic
          ? "الطرف الأول (مزود الخدمة)"
          : "First Party (Service Provider)"
        : isArabic
          ? "الطرف الثاني (العميل)"
          : "Second Party (Client)";

    let mark = "";
    if (sig?.imageDataUri) {
      mark = `<img class="sig-img" src="${esc(sig.imageDataUri)}" alt="Signature" />`;
    } else if (sig?.method === "typed" && sig.typedName) {
      mark = `<em style="font-family: serif; font-size: 13pt; color: #1e1b4b;">${esc(sig.typedName)}</em>`;
    }

    const stamp =
      role === "provider" && stampDataUri
        ? `<img class="stamp" src="${esc(stampDataUri)}" alt="Stamp" />`
        : "";

    const hasMark = Boolean(mark || stamp);
    const dateFormatted = sig?.signedAtMs
      ? formatSignedAt(sig.signedAtMs)
      : null;

    const dateNote = dateFormatted
      ? isArabic
        ? `تم التوقيع إلكترونيا في ${esc(dateFormatted)} UTC`
        : `Signed electronically on ${esc(dateFormatted)} UTC`
      : isArabic
        ? "بانتظار التوقيع"
        : "Pending signature";

    return `
      <div class="sig-card">
        <div>
          <div class="sig-role">${esc(roleTitle)}</div>
          <div class="sig-mark-area">${
            hasMark
              ? `${mark}${stamp}`
              : `<span class="sig-pending">${isArabic ? "بانتظار التوقيع" : "Pending signature"}</span>`
          }</div>
        </div>
        <div>
          <div class="sig-name">${esc(
            sig?.name ?? (isArabic ? "المفوض بالتوقيع" : "Authorized Signatory"),
          )}</div>
          ${sig?.title ? `<div class="sig-title">${esc(sig.title)}</div>` : ""}
          <div class="sig-date">${dateNote}</div>
        </div>
      </div>
    `;
  }

  const enCards = `
    <div class="sig-grid">
      ${sigCard(provider, "provider", "en")}
      ${sigCard(client, "client", "en")}
    </div>
  `;

  const arCards = `
    <div class="sig-grid">
      ${sigCard(provider, "provider", "ar")}
      ${sigCard(client, "client", "ar")}
    </div>
  `;

  if (lang === "bilingual") {
    return `
      <table class="bilingual-clause" style="margin: 0;">
        <tbody>
          <tr>
            <td class="col-en divider" dir="ltr" style="width: 50%; vertical-align: top;">
              <div class="section-badge">EXECUTION & SIGNATURES</div>
              ${enCards}
            </td>
            <td class="col-ar" dir="rtl" style="width: 50%; vertical-align: top;">
              <div class="section-badge">التوقيع والاعتماد</div>
              ${arCards}
            </td>
          </tr>
        </tbody>
      </table>
    `;
  }

  const badge = lang === "ar" ? "التوقيع والاعتماد" : "EXECUTION & SIGNATURES";
  return `
    <div dir="${docDir(lang)}">
      <div class="section-badge">${badge}</div>
      ${lang === "ar" ? arCards : enCards}
    </div>
  `;
}
