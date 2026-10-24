// Dossier - Invoice Module
// https://github.com/red-shadows-rs/dossier

import { formatDateLong } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { CurrencyCode, Locale } from "@/lib/constants";
import type { DocLang } from "@/lib/doc-lang";
import type { InvoiceStatus } from "@/server/services/invoices";
import { renderCode39Svg } from "@/server/pdf/qr";
import { getBankLogoDataUri } from "@/server/services/settings";
import {
  parsePaymentInstructionsToCards,
  stripPaymentMetadata,
} from "@/lib/payment-methods";
import {
  documentShell,
  esc,
  isRtl,
  num,
  type DocLang as SharedDocLang,
} from "./shared";

export type InvoiceLineHtml = {
  position: number;
  descriptionAr: string | null;
  descriptionEn: string | null;
  qtyMilli: number;
  unitPriceMinor: number;
  lineTotalMinor: number;
};

export type InvoicePaymentHtml = {
  paidOn: string;
  amountMinor: number;
  method: string;
  reference: string | null;
  voided: boolean;
};

export type SellerSnapshot = {
  nameAr: string;
  nameEn: string;
  legalNameAr?: string;
  legalNameEn?: string;
  crNumber?: string;
  taxNumber?: string;
  addressAr?: string;
  addressEn?: string;
  email?: string;
  phone?: string;
  website?: string;
  logoFileId?: string | null;
  stampFileId?: string | null;
};

export type BuyerSnapshot = {
  nameAr?: string | null;
  nameEn?: string | null;
  legalNameAr?: string | null;
  legalNameEn?: string | null;
  addressAr?: string | null;
  addressEn?: string | null;
  taxNumber?: string | null;
  crNumber?: string | null;
  email?: string | null;
  phone?: string | null;
};

export type InvoiceHtmlInput = {
  invoice: {
    id: string;
    number: string | null;
    currency: string;
    languageMode: "ar" | "en";
    status: InvoiceStatus;
    issueDate: string | null;
    dueDate: string | null;
    projectLabel: string;
    contractNumber: string | null;
    subtotalMinor: number;
    discountMinor: number;
    netMinor: number;
    taxRateBp: number;
    taxMinor: number;
    totalMinor: number;
    paidMinor: number;
    notesAr: string | null;
    notesEn: string | null;
    paymentInstructionsAr: string | null;
    paymentInstructionsEn: string | null;
  };
  lines: InvoiceLineHtml[];
  seller: SellerSnapshot;
  buyer: BuyerSnapshot;
  payments: InvoicePaymentHtml[];
  lang: DocLang;
  isOverdue: boolean;
  fonts: string;
  logoDataUri: string | null;
  stampDataUri?: string | null;
  verification: { code: string; url: string; qrDataUri: string } | null;
};

function pick(
  ar: string | null | undefined,
  en: string | null | undefined,
  lang: DocLang,
): string {
  if (lang === "en") return esc(en || ar || "");
  return esc(ar || en || "");
}

function uiLang(lang: DocLang): Locale {
  return lang === "ar" ? "ar" : "en";
}

function fmtQty(qtyMilli: number): string {
  const whole = Math.trunc(qtyMilli / 1000);
  const frac = qtyMilli % 1000;
  if (frac === 0) return String(whole);
  return `${whole}.${String(frac).padStart(3, "0").replace(/0+$/, "")}`;
}

export const INVOICE_CSS = `
@page {
  size: A4;
  margin: 0 0 8mm 0;
}
* {
  box-sizing: border-box;
}
html {
  margin: 0;
  padding: 0;
  height: 100%;
}
body {
  margin: 0;
  padding: 0;
  min-height: 100%;
  color: #14141a;
  font-size: 8.5pt;
  line-height: 1.45;
  background: #ffffff;
}
.invoice-page {
  width: 210mm;
  max-width: 100%;
  height: 284mm;
  max-height: 284mm;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  position: relative;
  background: #ffffff;
  box-sizing: border-box;
  page-break-after: always;
  break-after: page;
  overflow: hidden;
}
.invoice-page-main {
  flex: 1 1 auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.invoice-page:last-child {
  page-break-after: auto;
  break-after: auto;
}

.hero-header {
  position: relative;
  min-height: 48mm;
  margin-top: -2mm;
  margin-bottom: 2mm;
  width: calc(100% + 6mm);
  margin-left: -3mm;
  margin-right: -3mm;
  overflow: hidden;
}
.hero-svg-bg {
  position: absolute;
  top: -3mm;
  left: -4mm;
  right: -4mm;
  bottom: -2mm;
  width: calc(100% + 8mm);
  height: calc(100% + 5mm);
  pointer-events: none;
  z-index: 1;
}
.hero-content {
  position: relative;
  z-index: 2;
  display: flex;
  min-height: 48mm;
  width: 100%;
  padding-top: 2mm;
  padding-left: 3mm;
  padding-right: 3mm;
}
.hero-red-box {
  width: 42%;
  padding: 6mm 8mm;
  padding-inline-end: 16mm;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.inv-main-title {
  font-size: 26pt;
  font-weight: 900;
  letter-spacing: 0.04em;
  line-height: 1;
  text-transform: uppercase;
}
.sub-title {
  font-size: 11pt;
  font-weight: 700;
  margin-top: 1mm;
  opacity: 0.95;
}
.seller-meta {
  font-size: 7.6pt;
  line-height: 1.45;
  opacity: 0.95;
}

.hero-dark-box {
  width: 58%;
  min-height: 38mm;
  padding: 4mm 8mm;
  padding-inline-start: 6mm;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  color: #ffffff;
}
.meta-table {
  border-collapse: collapse;
}
.meta-table td {
  border: none;
  padding: 0.4mm 0;
  font-size: 7.8pt;
  color: #ffffff;
}
.meta-table td.lbl {
  color: #9a9aa6;
  padding-inline-end: 2.5mm;
  text-align: start;
  white-space: nowrap;
  font-size: 7.2pt;
}
.meta-table td.val {
  font-family: monospace;
  font-weight: 700;
  text-align: end;
  color: #ffffff;
}
.meta-table td.val-std {
  font-weight: 600;
  text-align: end;
  color: #ffffff;
}
.doc-number {
  font-family: monospace;
  font-size: 8.5pt;
  font-weight: 700;
}
.overdue-tag {
  display: inline-block;
  background: #f87171;
  color: #ffffff;
  font-weight: 800;
  font-size: 6.8pt;
  padding: 0.3mm 1.8mm;
  border-radius: 2px;
  margin-inline-start: 1.5mm;
  text-transform: uppercase;
}
.brand-box {
  display: flex;
  align-items: center;
  gap: 2.5mm;
  text-align: start;
  max-width: 55mm;
  flex-shrink: 0;
}
.brand-text-col {
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 38mm;
  overflow: hidden;
}
.brand-name {
  font-size: 9.5pt;
  font-weight: 800;
  letter-spacing: 0.02em;
  line-height: 1.25;
  color: #ffffff;
  word-break: break-word;
}
.brand-sub {
  font-size: 6.8pt;
  color: #9a9aa6;
  line-height: 1.2;
  margin-top: 0.4mm;
  word-break: break-word;
}
.brand-logo-frame {
  width: 13mm;
  height: 13mm;
  min-width: 13mm;
  min-height: 13mm;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.brand-logo-img {
  max-height: 13mm;
  max-width: 13mm;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
}

.subsequent-header {
  height: 12mm;
  padding: 2.5mm 8mm;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 0.45mm solid #e11d48;
  margin-bottom: 3.5mm;
  background: #ffffff;
}
.sub-header-left {
  display: flex;
  align-items: center;
}
.sub-doc-meta {
  font-size: 8pt;
  color: #64748b;
  display: flex;
  align-items: center;
  gap: 1.5mm;
}
.sub-meta-lbl {
  color: #94a3b8;
}
.sub-meta-val {
  font-family: monospace;
  font-weight: 700;
  color: #14141a;
}
.sub-meta-sep {
  color: #cbd5e1;
}
.sub-header-right {
  display: flex;
  align-items: center;
  gap: 2.5mm;
}
.sub-brand-name {
  font-size: 8.5pt;
  font-weight: 800;
  color: #14141a;
}
.sub-brand-logo {
  max-height: 10mm;
  max-width: 18mm;
  object-fit: contain;
}

.invoice-page-main {
  width: 100%;
  display: flex;
  flex-direction: column;
}

.page-continued-indicator {
  padding: 3mm 8mm;
  text-align: end;
  font-size: 7.5pt;
  font-weight: 700;
  color: #94a3b8;
  border-top: 0.25mm dashed #e2e8f0;
}

.invoice-body {
  padding: 0 8mm 0 8mm;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.bill-to-strip {
  display: flex;
  justify-content: flex-start;
  margin: 1mm 0 4mm;
}
.bill-to-inner {
  max-width: 65%;
  text-align: start;
}
.bill-to-tag {
  font-size: 8pt;
  font-weight: 700;
  color: #e11d48;
  text-transform: uppercase;
  margin-bottom: 0.5mm;
  letter-spacing: 0.04em;
}
.buyer-name {
  font-size: 10.5pt;
  font-weight: 800;
  color: #14141a;
}
.buyer-meta {
  font-size: 7.8pt;
  color: #64748b;
  line-height: 1.35;
}

table.inv-items-table {
  width: 100%;
  border-collapse: collapse;
  margin: 3mm 0 5mm;
  page-break-inside: auto;
  break-inside: auto;
}
table.inv-items-table thead {
  display: table-header-group;
}
table.inv-items-table thead th {
  background: #e11d48;
  color: #ffffff;
  border: none;
  padding: 3mm 3.5mm;
  font-size: 8pt;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}
table.inv-items-table thead th .ar {
  font-size: 7pt;
  opacity: 0.95;
}
table.inv-items-table tbody tr {
  page-break-inside: avoid;
  break-inside: avoid;
}
table.inv-items-table tbody td {
  border: none;
  padding: 3.2mm 3.5mm;
  font-size: 8.5pt;
  color: #14141a;
}
table.inv-items-table tbody tr:nth-child(odd) td {
  background: #f8f9fb;
}
table.inv-items-table tbody tr:nth-child(even) td {
  background: #ffffff;
}
table.inv-items-table tbody tr:last-child td {
  border-bottom: 1.5pt solid #14141a;
}
.col-num {
  width: 12mm;
  text-align: center;
  font-weight: 700;
  white-space: nowrap;
}
.col-desc {
  text-align: start;
}
.item-title {
  font-weight: 700;
  color: #14141a;
}
.item-sub {
  font-size: 7.5pt;
  color: #64748b;
  margin-top: 0.5mm;
}
.col-price {
  width: 30mm;
  text-align: end;
}
.col-qty {
  width: 22mm;
  text-align: center;
  white-space: nowrap;
}
.col-total {
  width: 32mm;
  text-align: end;
  font-weight: 700;
  color: #14141a;
}

.totals-wrap {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 5mm;
  break-inside: avoid;
}
.totals-box {
  width: 78mm;
}
.totals-table {
  width: 100%;
  border-collapse: collapse;
}
.totals-table td {
  border: none;
  padding: 1.4mm 2.5mm;
  font-size: 8pt;
}
.totals-table tr:nth-child(odd) td {
  background: #f8f9fb;
}
.totals-table td.lbl {
  color: #475569;
  font-weight: 600;
  text-align: start;
}
.totals-table td.val {
  color: #14141a;
  font-weight: 700;
  text-align: end;
}
.total-due-card {
  background: #14141a;
  color: #ffffff;
  padding: 2.8mm 3.5mm;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 1mm;
  border-radius: 2px;
}
.due-lbl {
  font-size: 9.5pt;
  font-weight: 900;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #ffffff;
}
.due-val {
  font-size: 12.5pt;
  font-weight: 900;
  color: #ffffff;
}
.due-val .num {
  color: #ffffff;
}
.paid-stamp {
  border: 0.8mm solid #16a34a;
  background: rgba(22, 163, 74, 0.07);
  color: #15803d;
  padding: 1.8mm 4.5mm;
  font-weight: 900;
  font-size: 11pt;
  letter-spacing: 0.06em;
  display: inline-block;
  border-radius: 4px;
  transform: rotate(-5deg);
  margin-top: 2mm;
}

.inv-footer-wrap {
  width: 100%;
  margin-top: auto !important;
  margin-bottom: 0 !important;
  border-top: 0.35mm solid #cbd5e1;
  break-inside: avoid;
  page-break-inside: avoid;
  flex-shrink: 0;
}
.inv-footer {
  display: flex;
  justify-content: space-between;
  gap: 8mm;
  padding: 3.5mm 8mm 2mm 8mm;
  break-inside: avoid;
  page-break-inside: avoid;
}
.footer-info {
  flex: 1.2;
  display: flex;
  flex-direction: column;
  gap: 2.5mm;
}
.info-block h4 {
  margin: 0 0 1mm;
  font-size: 8pt;
  font-weight: 800;
  color: #e11d48;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.info-block p {
  margin: 0;
  font-size: 7.8pt;
  color: #334155;
  line-height: 1.45;
}
.instructions-list {
  display: flex;
  flex-direction: column;
  gap: 1mm;
}
.instruction-line {
  font-size: 7.8pt;
  color: #334155;
  line-height: 1.45;
}
.payment-cards-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 2mm;
  margin-top: 1.2mm;
}
.payment-cards-grid.single-card {
  grid-template-columns: 1fr;
}
.payment-card {
  background: #f8fafc;
  border: 0.25mm solid #cbd5e1;
  border-radius: 1.5mm;
  padding: 2mm 2.5mm;
  display: flex;
  flex-direction: column;
  gap: 1.2mm;
  page-break-inside: avoid;
}
.payment-card-header {
  display: flex;
  align-items: center;
  gap: 2mm;
}
.payment-card-logo {
  width: 5.5mm;
  height: 5.5mm;
  object-fit: contain;
  flex-shrink: 0;
}
.payment-card-title-wrap {
  flex: 1;
  min-width: 0;
}
.payment-card-title {
  font-size: 7.8pt;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
}
.payment-card-holder {
  font-size: 6.8pt;
  color: #64748b;
  margin-top: 0.3mm;
}
.payment-card-id-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5mm;
  font-size: 7pt;
  padding-top: 0.8mm;
  border-top: 0.15mm solid #e2e8f0;
}
.payment-card-label {
  color: #64748b;
  font-weight: 500;
  white-space: nowrap;
}
.payment-card-mono {
  font-family: monospace;
  font-weight: 600;
  color: #1e293b;
  word-break: break-all;
}
.thank-you {
  font-size: 10.5pt;
  font-weight: 900;
  color: #14141a;
  margin-top: 2mm;
}

.footer-verification {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2.5mm;
}
.verify-card {
  background: #f8fafc;
  border: 0.3mm solid #cbd5e1;
  border-radius: 4px;
  padding: 2.5mm 3.5mm;
  display: flex;
  align-items: center;
  gap: 3.5mm;
  width: 100%;
}
.qr-frame {
  width: 22mm;
  height: 22mm;
  background: #ffffff;
  border: 0.25mm solid #cbd5e1;
  border-radius: 3px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1mm;
  flex-shrink: 0;
}
.qr-frame .qr {
  width: 20mm;
  height: 20mm;
  display: block;
}
.barcode-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1mm;
}
.verify-badge-title {
  font-size: 7.5pt;
  font-weight: 800;
  color: #14141a;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.barcode-svg-container {
  overflow: hidden;
  margin: 0.5mm 0;
}
.verify-code-str {
  font-family: monospace;
  font-size: 8pt;
  font-weight: 800;
  color: #14141a;
}
.verify-link {
  font-size: 6.8pt;
  color: #64748b;
  word-break: break-all;
}

.sig-box {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 1mm;
}
.stamp-img {
  max-height: 18mm;
  max-width: 30mm;
  object-fit: contain;
}
.sig-title {
  font-size: 7.5pt;
  color: #64748b;
  font-weight: 600;
}

.bottom-red-bar {
  background: #e11d48;
  color: #ffffff;
  padding: 0 8mm;
  height: 7.5mm;
  font-size: 7.2pt;
  font-weight: 600;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 0;
  letter-spacing: 0.03em;
  break-inside: avoid;
  flex-shrink: 0;
}
@media print {
  html, body {
    height: 100% !important;
    min-height: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  .invoice-page {
    width: 210mm !important;
    height: 288mm !important;
    max-height: 288mm !important;
    page-break-after: always !important;
    break-after: page !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: flex-start !important;
    overflow: hidden !important;
    background: #ffffff !important;
  }
  .invoice-page:last-child {
    page-break-after: auto !important;
    break-after: auto !important;
  }
  .bottom-red-bar {
    display: none !important;
  }
}
@media screen {
  body {
    background: #ffffff;
    padding: 0;
    margin: 0;
  }
  .invoice-page {
    box-shadow: none;
    margin: 0 auto;
    width: 100% !important;
    max-width: 100% !important;
  }
}

`;

function heroHeader(input: InvoiceHtmlInput): string {
  const s = input.seller;
  const lang = input.lang;
  const inv = input.invoice;
  const ui = uiLang(lang);
  const isRtlDoc = isRtl(lang);

  const title = lang === "ar" ? "فاتورة" : "INVOICE";
  const subtitle = "";

  const sellerName = pick(s.nameAr, s.nameEn, lang);
  const address = pick(s.addressAr ?? null, s.addressEn ?? null, lang);

  const sellerLines: string[] = [];
  if (address) sellerLines.push(`<div>${address}</div>`);
  const contact: string[] = [];
  if (s.phone) contact.push(`<span dir="ltr">${esc(s.phone)}</span>`);
  if (s.email) contact.push(`<span dir="ltr">${esc(s.email)}</span>`);
  if (s.website) {
    const cleanWeb = s.website.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    contact.push(`<span dir="ltr">${esc(cleanWeb)}</span>`);
  }
  if (contact.length > 0) sellerLines.push(`<div>${contact.join(" · ")}</div>`);
  const crVat: string[] = [];
  if (s.crNumber) crVat.push(lang === "ar" ? `س.ت: ${esc(s.crNumber)}` : `CR: ${esc(s.crNumber)}`);
  if (s.taxNumber) crVat.push(lang === "ar" ? `ض.ر: ${esc(s.taxNumber)}` : `VAT: ${esc(s.taxNumber)}`);
  if (crVat.length > 0) sellerLines.push(`<div>${crVat.join(" · ")}</div>`);

  const issueDateFormatted = inv.issueDate
    ? esc(formatDateLong(inv.issueDate, ui))
    : "—";

  const overdueTag = input.isOverdue
    ? ` <span class="overdue-tag">${lang === "en" ? "OVERDUE" : "متأخرة"}</span>`
    : "";

  const dueDateFormatted = inv.dueDate
    ? esc(formatDateLong(inv.dueDate, ui))
    : "—";

  const sellerLegal = pick(s.legalNameAr ?? null, s.legalNameEn ?? null, lang);
  const brandSubHtml =
    sellerLegal && sellerLegal !== sellerName
      ? `<div class="brand-sub">${sellerLegal}</div>`
      : "";

  const brandMarkSvg = input.logoDataUri
    ? `
      <div class="brand-box">
        <div class="brand-text-col">
          <div class="brand-name">${sellerName}</div>
          ${brandSubHtml}
        </div>
        <div class="brand-logo-frame">
          <img class="brand-logo-img" src="${esc(input.logoDataUri)}" alt="${sellerName}" />
        </div>
      </div>
    `
    : `
      <div class="brand-box">
        <div class="brand-text-col">
          <div class="brand-name">${sellerName}</div>
          ${brandSubHtml}
        </div>
        <div class="brand-logo-frame">
          <svg width="24" height="24" viewBox="0 0 32 32" fill="none">
            <polygon points="16,2 30,10 16,18 2,10" fill="#e11d48" />
            <polygon points="2,10 16,18 16,30 2,22" fill="#9f1239" />
            <polygon points="30,10 16,18 16,30 30,22" fill="#fb7185" />
          </svg>
        </div>
      </div>
    `;

  const svgTransform = isRtlDoc
    ? 'transform="scale(-1, 1) translate(-1000, 0)"'
    : "";

  const lblNo = lang === "en" ? "Invoice No" : "رقم الفاتورة";
  const lblIssue = lang === "en" ? "Issue Date" : "تاريخ الإصدار";
  const lblDue = lang === "en" ? "Due Date" : "تاريخ الاستحقاق";
  const lblProject = lang === "en" ? "Project" : "المشروع";
  const lblContract = lang === "en" ? "Contract" : "العقد";

  return `
  <header class="hero-header">
    <svg class="hero-svg-bg" viewBox="0 0 1000 240" preserveAspectRatio="none" style="overflow: hidden;">
      <g ${svgTransform}>
        <polygon points="-50,-20 440,-20 370,240 -50,240" fill="#e11d48" />
        <polygon points="440,-20 1050,-20 1050,240 370,240" fill="#14141a" />
        <line x1="0" y1="239" x2="1000" y2="239" stroke="#e11d48" stroke-width="2" />
      </g>
    </svg>

    <div class="hero-content">
      <div class="hero-red-box">
        <div>
          <div class="inv-main-title">${esc(title)}</div>
          ${subtitle}
        </div>
        <div class="seller-meta">
          ${sellerLines.join("")}
        </div>
      </div>

      <div class="hero-dark-box">
        <table class="meta-table">
          <tbody>
            <tr>
              <td class="lbl">${lblNo}</td>
              <td class="val"><span class="doc-number" dir="ltr">${esc(inv.number ?? "DRAFT")}</span></td>
            </tr>
            <tr>
              <td class="lbl">${lblIssue}</td>
              <td class="val-std">${issueDateFormatted}</td>
            </tr>
            <tr>
              <td class="lbl">${lblDue}</td>
              <td class="val-std">${inv.dueDate ? `${dueDateFormatted}${overdueTag}` : "—"}</td>
            </tr>
            <tr>
              <td class="lbl">${lblProject}</td>
              <td class="val-std">${esc(inv.projectLabel)}</td>
            </tr>
            ${
              inv.contractNumber
                ? `<tr><td class="lbl">${lblContract}</td><td class="val">${num(
                    inv.contractNumber,
                  )}</td></tr>`
                : ""
            }
          </tbody>
        </table>

        ${brandMarkSvg}
      </div>
    </div>
  </header>
  `;
}

function billToSection(input: InvoiceHtmlInput): string {
  const b = input.buyer;
  const lang = input.lang;
  const buyerName = pick(b.nameAr, b.nameEn, lang);
  const buyerAddress = pick(b.addressAr ?? null, b.addressEn ?? null, lang);
  const buyerDetails: string[] = [];
  if (b.email) {
    buyerDetails.push(
      lang === "ar"
        ? `البريد: <span dir="ltr">${esc(b.email)}</span>`
        : `Email: <span dir="ltr">${esc(b.email)}</span>`,
    );
  }
  if (b.phone) {
    buyerDetails.push(
      lang === "ar"
        ? `الهاتف: <span dir="ltr">${esc(b.phone)}</span>`
        : `Phone: <span dir="ltr">${esc(b.phone)}</span>`,
    );
  }
  if (buyerAddress) buyerDetails.push(buyerAddress);
  if (b.crNumber) buyerDetails.push(lang === "ar" ? `س.ت: ${esc(b.crNumber)}` : `CR: ${esc(b.crNumber)}`);
  if (b.taxNumber) buyerDetails.push(lang === "ar" ? `ض.ر: ${esc(b.taxNumber)}` : `VAT: ${esc(b.taxNumber)}`);

  const billToLabel = lang === "en" ? "Invoice to:" : "الفاتورة إلى:";

  return `
  <section class="bill-to-strip">
    <div class="bill-to-inner">
      <div class="bill-to-tag">${billToLabel}</div>
      <div class="buyer-name">${buyerName}</div>
      ${buyerDetails.length > 0 ? `<div class="buyer-meta">${buyerDetails.join(" · ")}</div>` : ""}
    </div>
  </section>
  `;
}

function subsequentHeader(
  input: InvoiceHtmlInput,
  _pageNumber: number,
  _pageTotal: number,
): string {
  const s = input.seller;
  const lang = input.lang;
  const inv = input.invoice;
  const sellerName = pick(s.nameAr, s.nameEn, lang);

  const docNoLabel =
    lang === "ar"
      ? "رقم الفاتورة:"
      : lang === "en"
        ? "Invoice No:"
        : '<span dir="ltr">Invoice No</span> / <span dir="rtl">رقم الفاتورة</span>:';

  const logoHtml = input.logoDataUri
    ? `<img class="sub-brand-logo" src="${esc(input.logoDataUri)}" alt="" />`
    : "";

  return `
  <header class="subsequent-header">
    <div class="sub-header-left">
      <div class="sub-doc-meta">
        <span class="sub-meta-lbl">${docNoLabel}</span>
        <span class="sub-meta-val" dir="ltr">${esc(inv.number ?? "DRAFT")}</span>
        ${
          inv.projectLabel
            ? `<span class="sub-meta-sep">·</span><span class="sub-meta-project">${esc(
                inv.projectLabel,
              )}</span>`
            : ""
        }
      </div>
    </div>
    <div class="sub-header-right">
      <div class="sub-brand-name">${sellerName}</div>
      ${logoHtml}
    </div>
  </header>
  `;
}

export function paginateInvoiceLines(lines: InvoiceLineHtml[]): InvoiceLineHtml[][] {
  if (lines.length <= 10) {
    return [lines];
  }
  const pages: InvoiceLineHtml[][] = [];
  pages.push(lines.slice(0, 10));
  let remaining = lines.slice(10);
  while (remaining.length > 0) {
    if (remaining.length <= 14) {
      pages.push(remaining);
      break;
    }
    pages.push(remaining.slice(0, 18));
    remaining = remaining.slice(18);
  }
  return pages;
}

function linesTable(
  input: InvoiceHtmlInput,
  linesOverride?: InvoiceLineHtml[],
): string {
  const currency = input.invoice.currency as CurrencyCode;
  const lang = uiLang(input.lang);
  const linesToRender = linesOverride ?? input.lines;
  const rows = linesToRender
    .map((line) => {
      const primary = pick(line.descriptionAr, line.descriptionEn, input.lang);
      const descHtml = `<div class="item-title">${primary}</div>`;
      return `<tr>
        <td class="col-num">${num(String(line.position))}</td>
        <td class="col-desc">${descHtml}</td>
        <td class="col-price">${num(formatMoney(line.unitPriceMinor, currency, lang))}</td>
        <td class="col-qty">${num(fmtQty(line.qtyMilli))}</td>
        <td class="col-total">${num(formatMoney(line.lineTotalMinor, currency, lang))}</td>
      </tr>`;
    })
    .join("");

  const thDesc = input.lang === "ar" ? "الوصف" : "Item Description";
  const thPrice = input.lang === "ar" ? "سعر الوحدة" : "Unit Price";
  const thQty = input.lang === "ar" ? "الكمية" : "Qty";
  const thTotal = input.lang === "ar" ? "الإجمالي" : "Total";

  return `
  <table class="inv-items-table">
    <thead>
      <tr>
        <th class="col-num">#</th>
        <th class="col-desc">${thDesc}</th>
        <th class="col-price">${thPrice}</th>
        <th class="col-qty">${thQty}</th>
        <th class="col-total">${thTotal}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  `;
}


function totalsBlock(input: InvoiceHtmlInput): string {
  const inv = input.invoice;
  const currency = inv.currency as CurrencyCode;
  const lang = uiLang(input.lang);
  const money = (minor: number) => num(formatMoney(minor, currency, lang));

  const lblSub =
    input.lang === "ar"
      ? "المجموع الفرعي"
      : input.lang === "en"
        ? "Subtotal"
        : "Subtotal / المجموع الفرعي";
  const lblDisc =
    input.lang === "ar"
      ? "الخصم"
      : input.lang === "en"
        ? "Discount"
        : "Discount / الخصم";
  const lblNet =
    input.lang === "ar"
      ? "الصافي"
      : input.lang === "en"
        ? "Net"
        : "Net / الصافي";

  const rows: Array<[string, string]> = [[lblSub, money(inv.subtotalMinor)]];
  if (inv.discountMinor > 0) {
    rows.push([lblDisc, money(inv.discountMinor)]);
  }
  rows.push([lblNet, money(inv.netMinor)]);
  if (inv.taxMinor > 0) {
    const percent = (inv.taxRateBp / 100).toFixed(2).replace(/\.?0+$/, "");
    const lblTax =
      input.lang === "ar"
        ? `الضريبة (${percent}%)`
        : input.lang === "en"
          ? `Tax (${percent}%)`
          : `Tax / الضريبة (${percent}%)`;
    rows.push([lblTax, money(inv.taxMinor)]);
  }

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><td class="lbl">${esc(label)}</td><td class="val">${value}</td></tr>`,
    )
    .join("");

  const lblPaid =
    input.lang === "ar"
      ? "المدفوع"
      : input.lang === "en"
        ? "Paid"
        : "Paid / المدفوع";
  const lblBal =
    input.lang === "ar"
      ? "المتبقي"
      : input.lang === "en"
        ? "Balance due"
        : "Balance due / المتبقي";

  let paidAndBalance = "";
  if (inv.paidMinor > 0) {
    paidAndBalance = `
    <table class="totals-table" style="margin-top: 1.5mm;">
      <tbody>
        <tr>
          <td class="lbl">${lblPaid}</td>
          <td class="val">${money(inv.paidMinor)}</td>
        </tr>
        <tr>
          <td class="lbl" style="font-weight: 700; color: #14141a;">${lblBal}</td>
          <td class="val" style="font-weight: 800; color: #e11d48;">${money(
            inv.totalMinor - inv.paidMinor,
          )}</td>
        </tr>
      </tbody>
    </table>
    `;
  }

  const lblTotalDue =
    input.lang === "ar"
      ? "الإجمالي المستحق"
      : input.lang === "en"
        ? "TOTAL DUE"
        : "TOTAL DUE / الإجمالي";

  const stamp =
    inv.status === "paid"
      ? `<div class="paid-stamp">${
          input.lang === "ar"
            ? "مدفوعة"
            : input.lang === "en"
              ? "PAID"
              : "PAID / مدفوعة"
        }</div>`
      : "";

  return `
  <div class="totals-wrap">
    <div class="totals-box">
      <table class="totals-table">
        <tbody>${tableRows}</tbody>
      </table>
      <div class="total-due-card">
        <span class="due-lbl">${lblTotalDue}</span>
        <span class="due-val">${money(inv.totalMinor)}</span>
      </div>
      ${paidAndBalance}
      ${stamp}
    </div>
  </div>
  `;
}

function splitInstructionLines(rawText: string | null | undefined): string[] {
  if (!rawText) return [];
  return rawText
    .split(/\r?\n|\|/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function instructionsBlock(input: InvoiceHtmlInput): string {
  const arRaw = input.invoice.paymentInstructionsAr?.trim();
  const enRaw = input.invoice.paymentInstructionsEn?.trim();
  const raw =
    input.lang === "ar"
      ? arRaw || enRaw
      : input.lang === "en"
        ? enRaw || arRaw
        : arRaw || enRaw;

  if (!raw) return "";

  const langCode = input.lang === "en" ? "en" : "ar";
  const cards = parsePaymentInstructionsToCards(raw, undefined, langCode);

  let contentHtml = "";

  if (cards.length > 0) {
    const beneficiaryLabel = langCode === "ar" ? "المستفيد" : "Beneficiary";
    const swiftLabel = langCode === "ar" ? "سويفت" : "SWIFT";

    const cardsHtml = cards
      .map((card) => {
        const logoUri = getBankLogoDataUri(card.provider);
        const logoHtml = logoUri
          ? `<img class="payment-card-logo" src="${esc(logoUri)}" alt="" />`
          : `<svg class="payment-card-logo" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 21h18"/><path d="M3 10h18"/><path d="M5 6l7-3 7 3"/><path d="M4 10v11"/><path d="M20 10v11"/><path d="M8 14v4"/><path d="M12 14v4"/><path d="M16 14v4"/></svg>`;

        return `
        <div class="payment-card">
          <div class="payment-card-header">
            ${logoHtml}
            <div class="payment-card-title-wrap">
              <div class="payment-card-title">${esc(card.bankName)}</div>
              ${
                card.accountHolder
                  ? `<div class="payment-card-holder">${esc(beneficiaryLabel)}: ${esc(card.accountHolder)}</div>`
                  : ""
              }
            </div>
          </div>
          ${
            card.binanceUid && card.binanceUid !== card.identifierValue
              ? `
            <div class="payment-card-id-row">
              <span class="payment-card-label">${esc(langCode === "ar" ? "معرف باينانس (UID)" : "Binance UID")}:</span>
              <span class="payment-card-mono" dir="ltr">${esc(card.binanceUid)}</span>
            </div>
          `
              : ""
          }
          ${
            card.paymentUrl
              ? `
            <div class="payment-card-id-row">
              <span class="payment-card-label">${esc(langCode === "ar" ? "رابط الدفع" : "Pay Link")}:</span>
              <span class="payment-card-mono" dir="ltr">${esc(card.paymentUrl)}</span>
            </div>
          `
              : ""
          }
          ${
            card.identifierValue
              ? `
            <div class="payment-card-id-row">
              <span class="payment-card-label">${esc(card.identifierLabel)}:</span>
              <span class="payment-card-mono" dir="ltr">${esc(card.identifierValue)}</span>
            </div>
          `
              : ""
          }
          ${
            card.swift
              ? `
            <div class="payment-card-id-row">
              <span class="payment-card-label">${esc(swiftLabel)}:</span>
              <span class="payment-card-mono" dir="ltr">${esc(card.swift)}</span>
            </div>
          `
              : ""
          }
        </div>
        `;
      })
      .join("");

    contentHtml = `<div class="payment-cards-grid${cards.length === 1 ? " single-card" : ""}">${cardsHtml}</div>`;
  } else {
    const lines = splitInstructionLines(stripPaymentMetadata(raw));
    contentHtml = `<div class="instructions-list">${lines
      .map((line) => `<div class="instruction-line">${esc(line)}</div>`)
      .join("")}</div>`;
  }

  if (!contentHtml) return "";

  const heading =
    input.lang === "ar"
      ? "تعليمات السداد"
      : input.lang === "en"
        ? "Payment Instructions"
        : '<span dir="ltr">Payment instructions</span> / <span dir="rtl">تعليمات السداد</span>';

  return `
  <div class="info-block">
    <h4>${heading}</h4>
    ${contentHtml}
  </div>
  `;
}

function notesBlock(input: InvoiceHtmlInput): string {
  const notes = pick(input.invoice.notesAr, input.invoice.notesEn, input.lang);
  if (!notes) return "";
  const heading =
    input.lang === "ar"
      ? "ملاحظات"
      : input.lang === "en"
        ? "Notes"
        : '<span dir="ltr">Notes</span> / <span dir="rtl">ملاحظات</span>';
  return `
  <div class="info-block">
    <h4>${heading}</h4>
    <p style="white-space: pre-line;">${notes}</p>
  </div>
  `;
}

function verificationBlock(input: InvoiceHtmlInput): string {
  const v = input.verification;
  if (!v) return "";
  const barcodeSvg = renderCode39Svg(v.code || input.invoice.number || "INV", 20);
  const title =
    input.lang === "ar"
      ? "التحقق · باركود"
      : input.lang === "en"
        ? "Verification · Barcode"
        : "Verification / التحقق · Barcode";
  const genNote =
    input.lang === "ar"
      ? "تم إنشاء الفاتورة عبر Dossier"
      : input.lang === "en"
        ? "Invoice generated by Dossier"
        : '<span dir="ltr">Invoice generated by Dossier</span> / <span dir="rtl">تم إنشاء الفاتورة عبر Dossier</span>';
  return `
  <div class="verify-card">
    <div class="qr-frame">
      <img class="qr" src="${esc(v.qrDataUri)}" alt="QR Code" />
    </div>
    <div class="barcode-details">
      <div class="verify-badge-title">${title}</div>
      <div class="barcode-svg-container">${barcodeSvg}</div>
      <div class="verify-code-str">${num(v.code)}</div>
      <div class="muted note-dossier" style="font-size: 6.8pt; color: #64748b;">${genNote}</div>
    </div>
  </div>
  `;
}

export function renderInvoiceHtml(input: InvoiceHtmlInput): string {
  const lang: SharedDocLang = input.lang;
  const watermark =
    input.invoice.status === "draft"
      ? lang === "ar"
        ? "مسودة"
        : lang === "en"
          ? "DRAFT"
          : "DRAFT / مسودة"
      : input.invoice.status === "void"
        ? lang === "ar"
          ? "ملغاة"
          : lang === "en"
            ? "VOID"
            : "VOID / ملغاة"
        : null;

  const stampTitle =
    lang === "ar"
      ? "الختم الرسمي"
      : lang === "en"
        ? "Official Stamp"
        : "Official Stamp / الختم الرسمي";

  const stampImg = input.stampDataUri
    ? `<div class="sig-box"><img class="stamp-img" src="${esc(
        input.stampDataUri,
      )}" alt="Stamp" /><div class="sig-title">${stampTitle}</div></div>`
    : "";

  const thankYouText =
    input.lang === "ar"
      ? "شكرا لتعاملكم معنا."
      : input.lang === "en"
        ? "Thank you for your business."
        : '<span dir="ltr">Thank you.</span> / <span dir="rtl">شكرا لتعاملكم معنا.</span>';
  const footerSystemName = "Dossier";

  const linePages = paginateInvoiceLines(input.lines);
  const pageCount = linePages.length;

  const body = linePages
    .map((chunk, pageIndex) => {
      const isFirstPage = pageIndex === 0;
      const isLastPage = pageIndex === pageCount - 1;

      const headerHtml = isFirstPage
        ? heroHeader(input)
        : subsequentHeader(input, pageIndex + 1, pageCount);

      const billToHtml = isFirstPage ? billToSection(input) : "";
      const tableHtml = linesTable(input, chunk);
      const totalsHtml = isLastPage ? totalsBlock(input) : "";

      let footerContentHtml = "";
      if (isLastPage) {
        footerContentHtml = `
        <div class="inv-footer-wrap">
          <div class="inv-footer">
            <div class="footer-info">
              ${instructionsBlock(input)}
              ${notesBlock(input)}
              <div class="thank-you">${thankYouText}</div>
            </div>
            <div class="footer-verification">
              ${verificationBlock(input)}
              ${stampImg}
            </div>
          </div>
        </div>
        `;
      } else {
        footerContentHtml = "";
      }

      return `
<div class="invoice-page">
  <div class="invoice-page-main">
    ${headerHtml}
    <div class="invoice-body">
      ${billToHtml}
      ${tableHtml}
      ${totalsHtml}
    </div>
  </div>

  ${footerContentHtml}

  <div class="bottom-red-bar">
    <span dir="ltr">${esc(footerSystemName)}</span>
    <span class="page-num-display" dir="ltr">${pageIndex + 1} / ${pageCount}</span>
  </div>
</div>
      `;
    })
    .join("\n");


  return documentShell({
    lang,
    title: input.invoice.number ?? "Invoice",
    fonts: input.fonts,
    watermark,
    body,
    extraCss: INVOICE_CSS,
  });
}
