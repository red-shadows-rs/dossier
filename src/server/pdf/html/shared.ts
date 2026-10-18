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
  margin: 0 0 8mm 0;
}
* {
  box-sizing: border-box;
}
html {
  font-family: ${FONT_STACK};
  font-size: 8.5pt;
  color: #18181b;
  background: #ffffff;
  margin: 0;
  padding: 0;
}
body {
  margin: 0;
  padding: 0;
  line-height: 1.55;
  background: #ffffff;
}
.contract-page, .invoice-page {
  width: 100%;
  max-width: 100%;
  height: 284mm;
  max-height: 284mm;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  position: relative;
  background: #ffffff;
  box-sizing: border-box;
  page-break-after: always;
  break-after: page;
  overflow: hidden;
}
.contract-page:last-child, .invoice-page:last-child {
  page-break-after: auto;
  break-after: auto;
}
.contract-page-main, .invoice-page-main {
  width: 100%;
  display: flex;
  flex-direction: column;
}
.contract-body {
  padding: 0 10mm;
  flex: 1;
}
@media screen {
  html, body {
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 transparent;
  }
  ::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }
  ::-webkit-scrollbar-track {
    background: transparent;
  }
  ::-webkit-scrollbar-thumb {
    background-color: #cbd5e1;
    border-radius: 9999px;
  }
  ::-webkit-scrollbar-thumb:hover {
    background-color: #94a3b8;
  }
}
[lang="ar"], .ar {
  line-height: 1.75;
}
p {
  margin: 0 0 1.4mm;
  orphans: 3;
  widows: 3;
  overflow-wrap: anywhere;
}
p.note {
  font-size: 8pt;
  color: #27272a;
  margin: 0.8mm 0 1.4mm 0;
  line-height: 1.7;
}
ul {
  margin: 1.5mm 0 2.5mm 0;
  margin-inline-start: 4.5mm;
  padding-inline-start: 4.5mm;
}
li {
  margin-bottom: 1.2mm;
  line-height: 1.65;
}
.num {
  font-variant-numeric: tabular-nums;
  font-family: monospace;
  direction: ltr;
  unicode-bidi: isolate;
  display: inline-block;
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

/* Angular 3D Geometric Brand Header — Matching Dossier Identity */
.hero-header {
  position: relative;
  min-height: 40mm;
  width: 100%;
  overflow: hidden;
  margin: 0 0 2mm 0;
}
.hero-svg-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 1;
}
.hero-content {
  position: relative;
  z-index: 2;
  display: flex;
  min-height: 40mm;
  width: 100%;
}
.hero-red-box {
  width: 44%;
  padding: 4.5mm 7mm;
  color: #ffffff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}
.inv-main-title {
  font-size: 18pt;
  font-weight: 900;
  letter-spacing: 0.02em;
  line-height: 1.15;
}
.sub-title {
  font-size: 9.5pt;
  font-weight: 700;
  margin-top: 1mm;
  opacity: 0.95;
}
.seller-meta {
  font-size: 7.4pt;
  line-height: 1.45;
  opacity: 0.95;
}
.hero-dark-box {
  width: 56%;
  min-height: 40mm;
  padding: 4.5mm 7mm;
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
  padding: 0.5mm 0;
  font-size: 7.6pt;
  color: #ffffff;
}
.meta-table td.lbl {
  color: #9a9aa6;
  padding-inline-end: 2.5mm;
  text-align: start;
  white-space: nowrap;
  font-size: 7pt;
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
  max-width: 42mm;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.contract-document {
  margin: 0;
  padding: 0;
  width: 100%;
  min-height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: #ffffff;
}
.contract-body {
  flex: 1 0 auto;
  padding: 0 10mm;
}
.doc-number {
  font-family: monospace;
  font-size: 8.5pt;
  font-weight: 700;
}
.brand-box {
  display: flex;
  align-items: center;
  gap: 2mm;
  text-align: start;
  max-width: 50mm;
  flex-shrink: 0;
}
.brand-text-col {
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 34mm;
  overflow: hidden;
}
.brand-name {
  font-size: 9pt;
  font-weight: 800;
  letter-spacing: 0.02em;
  line-height: 1.2;
  color: #ffffff;
  word-break: break-word;
}
.brand-sub {
  font-size: 6.5pt;
  color: #9a9aa6;
  line-height: 1.2;
  margin-top: 0.3mm;
  word-break: break-word;
}
.brand-logo-frame {
  width: 12mm;
  height: 12mm;
  min-width: 12mm;
  min-height: 12mm;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.brand-logo-img {
  max-height: 12mm;
  max-width: 12mm;
  width: auto;
  height: auto;
  object-fit: contain;
  display: block;
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
  width: 100% !important;
  max-width: 100% !important;
  table-layout: fixed !important;
  border-collapse: collapse !important;
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
  background: #f1f5f9;
  color: #0f172a;
  border: 0.25mm solid #cbd5e1;
  border-radius: 1mm;
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
  width: 50% !important;
  max-width: 50% !important;
  box-sizing: border-box !important;
  vertical-align: top;
  direction: ltr;
  text-align: left;
  padding: 1.5mm 3.5mm 2mm 0;
}
.col-ar {
  width: 50% !important;
  max-width: 50% !important;
  box-sizing: border-box !important;
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
  margin-bottom: 2mm;
  break-inside: auto;
}
.clause-body-single {
  padding-top: 0.8mm;
}

/* Cards & Tables */
.contract-card {
  background: #f8fafc;
  border: 0.35mm solid #e2e8f0;
  border-radius: 2mm;
  padding: 2.2mm 3mm;
  margin: 1.4mm 0;
  break-inside: avoid;
}
.section-badge {
  display: inline-block;
  background: #f1f5f9;
  color: #0f172a;
  border: 0.25mm solid #cbd5e1;
  border-radius: 1mm;
  padding: 0.5mm 2mm;
  font-size: 6.8pt;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  margin-bottom: 1.2mm;
}
.party-box {
  background: #ffffff;
  border: 0.25mm solid #e2e8f0;
  border-radius: 1.5mm;
  padding: 1.8mm 2.5mm;
  margin-bottom: 1.2mm;
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
  letter-spacing: 0.02em;
}
.party-name {
  font-size: 9pt;
  font-weight: 800;
  color: #14141a;
  margin-bottom: 0.5mm;
}
.party-meta {
  font-size: 7.2pt;
  color: #64748b;
  line-height: 1.4;
}
.party-lbl {
  color: #94a3b8;
  font-weight: 600;
}
.party-val {
  color: #1e293b;
  font-weight: 600;
}

/* Modern Contract Tables Matching Dossier Identity */
.contract-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  margin: 1.4mm 0;
  font-size: 7pt;
  border-radius: 1.5mm;
  overflow: hidden;
  break-inside: auto;
  word-break: break-word;
  overflow-wrap: anywhere;
}
.contract-table thead {
  display: table-header-group;
}
.contract-table th {
  background: #e11d48;
  color: #ffffff;
  font-size: 7pt;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  padding: 1.5mm 2.2mm;
  border: none;
  vertical-align: middle;
  line-height: 1.25;
}
.contract-table td {
  padding: 1.5mm 2.2mm;
  border: none;
  border-bottom: 0.25mm solid #f1f5f9;
  vertical-align: middle;
  color: #14141a;
  font-size: 7pt;
  line-height: 1.25;
  word-break: break-word;
  overflow-wrap: anywhere;
}
.contract-table td.num,
.contract-table .num-val {
  white-space: nowrap;
  font-family: monospace;
  font-weight: 700;
}

/* Pricing Table Columns */
.contract-table .col-num { width: 7%; text-align: center; }
.contract-table .col-desc { width: 39%; text-align: start; }
.contract-table .col-price { width: 20%; text-align: end; }
.contract-table .col-qty { width: 14%; text-align: center; }
.contract-table .col-total { width: 20%; text-align: end; }

/* Payment Schedule Columns */
.contract-table .c-num { width: 6%; text-align: center; }
.contract-table .c-title { width: 26%; text-align: start; }
.contract-table .c-pct { width: 10%; text-align: end; }
.contract-table .c-net { width: 15%; text-align: end; }
.contract-table .c-tax { width: 14%; text-align: end; }
.contract-table .c-total { width: 15%; text-align: end; }
.contract-table .c-due { width: 14%; text-align: center; }

/* Single-page continuous web preview */
.contract-preview-single-page {
  height: auto !important;
  max-height: none !important;
  min-height: 100% !important;
  overflow: visible !important;
  page-break-after: auto !important;
  break-after: auto !important;
}
.contract-preview-single-page .contract-body {
  padding-bottom: 6mm;
}
.bilingual-clause .contract-table th {
  padding: 1.5mm 1mm;
  font-size: 6.5pt;
  white-space: nowrap;
}
.bilingual-clause .contract-table td {
  padding: 1.6mm 1mm;
  font-size: 6.8pt;
}
.bilingual-clause .contract-table td.num {
  font-size: 6.6pt;
}
.contract-table tbody tr:nth-child(even) td {
  background: #f8fafc;
}
.contract-table tbody tr:nth-child(odd) td {
  background: #ffffff;
}
.contract-table tbody tr:last-child td {
  border-bottom: 1.2pt solid #14141a;
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
  gap: 3mm;
  margin-top: 1.5mm;
}
.sig-card {
  flex: 1;
  background: #fafafa;
  border: 0.3mm solid #e4e4e7;
  border-radius: 2mm;
  padding: 3mm 3.5mm;
  min-height: 32mm;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  break-inside: avoid;
}
.sig-role {
  font-size: 7.2pt;
  font-weight: 800;
  color: #e11d48;
  text-transform: uppercase;
  margin-bottom: 1.5mm;
}
.sig-mark-area {
  min-height: 18mm;
  display: flex;
  align-items: center;
  gap: 3mm;
  margin: 1.5mm 0;
}
.sig-img {
  max-height: 20mm;
  max-width: 55mm;
  object-fit: contain;
}
.stamp {
  max-height: 20mm;
  max-width: 30mm;
  object-fit: contain;
}
.sig-name {
  font-size: 8.8pt;
  font-weight: 800;
  color: #14141a;
}
.sig-title {
  font-size: 7.2pt;
  color: #71717a;
}
.sig-date {
  font-size: 6.8pt;
  color: #71717a;
  margin-top: 0.8mm;
}
.sig-pending {
  font-size: 7.5pt;
  color: #a1a1aa;
  font-style: italic;
}

/* Unsigned Note — styled to match Dossier form & site alert design */
.unsigned-card {
  margin: 3.5mm 0 2mm;
  background: rgba(225, 29, 72, 0.05);
  border: 0.25mm solid rgba(225, 29, 72, 0.25);
  border-radius: 1.8mm;
  padding: 2.2mm 3.2mm;
  display: flex;
  align-items: center;
  gap: 2.5mm;
  box-sizing: border-box;
  break-inside: avoid;
  page-break-inside: avoid;
}
.unsigned-icon {
  width: 4.2mm;
  height: 4.2mm;
  color: #e11d48;
  flex-shrink: 0;
}
.unsigned-text {
  flex: 1;
  font-size: 7.2pt;
  line-height: 1.45;
  color: #be123c;
}
.unsigned-title {
  font-weight: 800;
  color: #be123c;
  letter-spacing: 0.02em;
}
.unsigned-sep {
  margin: 0 1.2mm;
  opacity: 0.6;
}
.unsigned-desc {
  color: #9f1239;
  font-weight: 500;
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
  padding-top: 1mm;
}
.cert h1 {
  font-size: 12pt;
  font-weight: 900;
  color: #14141a;
  margin: 0 0 2mm;
  border-bottom: 0.4mm solid #e4e4e7;
  padding-bottom: 1.5mm;
}
.cert table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  margin: 1.5mm 0;
  border: 0.3mm solid #e4e4e7;
  border-radius: 1.5mm;
  overflow: hidden;
}
.cert th {
  background: #f8f9fa;
  color: #3f3f46;
  font-size: 6.8pt;
  font-weight: 700;
  padding: 1.4mm 2mm;
  border-bottom: 0.3mm solid #e4e4e7;
  vertical-align: middle;
}
.cert td {
  padding: 1.3mm 2mm;
  border-bottom: 0.25mm solid #f4f4f5;
  font-size: 7pt;
  color: #18181b;
  vertical-align: middle;
}
.cert tbody tr:last-child td {
  border-bottom: none;
}
.cert tbody tr:nth-child(even) td {
  background: #fafafa;
}
.cert-col-role { width: 14%; text-align: start; }
.cert-col-name { width: 17%; text-align: start; }
.cert-col-email { width: 22%; text-align: start; }
.cert-col-method { width: 10%; text-align: center; }
.cert-col-signed { width: 21%; text-align: center; }
.cert-col-ip { width: 10%; text-align: center; }
.cert-col-otp { width: 6%; text-align: center; }
.muted {
  color: #71717a;
  font-size: 7.2pt;
}

/* Full Bleed Footer Dividing Line & Section (Shared across Invoices & Contracts) */
.inv-footer-wrap {
  width: 100%;
  margin-top: auto !important;
  margin-bottom: 0 !important;
  border-top: 0.35mm solid #cbd5e1;
  break-inside: avoid;
  page-break-inside: avoid;
}
.inv-footer {
  display: flex;
  justify-content: space-between;
  gap: 8mm;
  padding: 4mm 10mm 3mm 10mm;
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

/* Signatory & Stamp */
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

/* Bottom Rose Brand Strip */
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
/* Subsequent Page Header (Page 2+) */
.subsequent-header {
  height: 12mm;
  padding: 2.5mm 10mm;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 0.45mm solid #e11d48;
  margin-bottom: 3.5mm;
  background: #ffffff;
  flex-shrink: 0;
}
.sub-header-left {
  display: flex;
  align-items: center;
}
.sub-doc-title-badge {
  display: inline-block;
  background: #fff1f2;
  color: #e11d48;
  font-weight: 800;
  font-size: 7.2pt;
  padding: 0.4mm 2.2mm;
  border-radius: 2px;
  border: 0.25mm solid #fecdd3;
  text-transform: uppercase;
  margin-inline-end: 2.5mm;
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
.sub-meta-project {
  color: #475569;
  font-weight: 600;
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

@media screen {
  body {
    background: #ffffff;
    padding: 0;
    margin: 0;
  }
  .contract-page, .invoice-page {
    box-shadow: none;
    margin: 0 auto;
    background: #ffffff;
    width: 100% !important;
    max-width: 100% !important;
  }
  .contract-preview-single-page {
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    box-shadow: none !important;
    height: auto !important;
    max-height: none !important;
    min-height: 100% !important;
    overflow: visible !important;
    page-break-after: auto !important;
    break-after: auto !important;
  }
}

@media print {
  html, body {
    height: 100% !important;
    min-height: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  .contract-page, .invoice-page {
    width: 210mm !important;
    height: 288mm !important;
    max-height: 288mm !important;
    page-break-after: always !important;
    break-after: page !important;
    display: flex !important;
    flex-direction: column !important;
    justify-content: space-between !important;
    overflow: hidden !important;
    background: #ffffff !important;
    margin: 0 !important;
    box-shadow: none !important;
  }
  .contract-page:last-child, .invoice-page:last-child {
    page-break-after: auto !important;
    break-after: auto !important;
  }
  .bottom-red-bar {
    display: none !important;
  }
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
  const htmlLang = input.lang === "en" ? "en" : "ar";
  return `<!doctype html><html lang="${htmlLang}" dir="${dir}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${esc(input.title)}</title><style>${baseCss(input.fonts)}${input.extraCss ?? ""}</style></head><body>${
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
  const isRtlDoc = meta.lang === "ar";
  return `
<style>
  * { box-sizing: border-box; }
  html, body {
    margin: 0 !important;
    padding: 0 !important;
    width: 100% !important;
    overflow: visible !important;
  }
</style>
<div style="position: absolute; bottom: -3mm; left: -5mm; width: calc(100% + 10mm); height: 11mm; margin: 0; padding: 0 calc(8mm + 5mm); padding-bottom: 3mm; background-color: #e11d48; -webkit-print-color-adjust: exact; color: #ffffff; font-family: 'IBM Plex Sans Arabic', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 7.2pt; font-weight: 700; display: flex; justify-content: space-between; align-items: center; box-sizing: border-box; direction: ${isRtlDoc ? "rtl" : "ltr"};">
  <span dir="ltr">Dossier</span>
  <span dir="ltr"><span class="pageNumber"></span> / <span class="totalPages"></span></span>
</div>`;
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
    email: string | null | undefined,
    phone: string | null | undefined,
    address: string | null | undefined,
    repLabel: string,
    repName: string | null | undefined,
    repTitle: string | null | undefined,
    labels: {
      legal: string;
      cr: string;
      tax: string;
      email: string;
      phone: string;
      addr: string;
      web?: string;
    },
    website?: string | null | undefined,
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
    if (email)
      lines.push(
        `<span class="party-lbl">${esc(labels.email)}:</span> <span class="party-val" dir="ltr">${esc(email)}</span>`,
      );
    if (website) {
      const cleanWeb = website.replace(/^https?:\/\//i, "").replace(/\/$/, "");
      const webLbl = labels.web || (labels.legal === "الاسم القانوني" ? "الموقع" : "Website");
      lines.push(
        `<span class="party-lbl">${esc(webLbl)}:</span> <span class="party-val" dir="ltr">${esc(cleanWeb)}</span>`,
      );
    }
    if (phone)
      lines.push(
        `<span class="party-lbl">${esc(labels.phone)}:</span> <span class="party-val" dir="ltr">${esc(phone)}</span>`,
      );
    if (address)
      lines.push(
        `<span class="party-lbl">${esc(labels.addr)}:</span> <span class="party-val">${esc(address)}</span>`,
      );
    if (repName) {
      const fullRep = repTitle ? `${repName} (${repTitle})` : repName;
      lines.push(
        `<span class="party-lbl">${esc(repLabel)}:</span> <span class="party-val">${esc(fullRep)}</span>`,
      );
    }
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
    p.email,
    p.phone,
    p.addressEn,
    "Rep",
    null,
    null,
    {
      legal: "Legal Name",
      cr: "CR",
      tax: "VAT",
      email: "Email",
      phone: "Phone",
      addr: "Address",
      web: "Website",
    },
    p.website,
  );
  const enClient = partyHtml(
    "Second Party (Client)",
    c.nameEn || c.nameAr || "",
    c.legalNameEn,
    c.crNumber,
    c.taxNumber,
    c.email,
    c.phone,
    c.addressEn,
    "Rep",
    c.repNameEn,
    c.repTitleEn,
    {
      legal: "Legal Name",
      cr: "CR",
      tax: "VAT",
      email: "Email",
      phone: "Phone",
      addr: "Address",
    },
  );

  const arProvider = partyHtml(
    "الطرف الأول (مزود الخدمة)",
    p.nameAr || p.nameEn || "",
    p.legalNameAr,
    p.crNumber,
    p.taxNumber,
    p.email,
    p.phone,
    p.addressAr,
    "الممثل",
    null,
    null,
    {
      legal: "الاسم القانوني",
      cr: "س.ت",
      tax: "الرقم الضريبي",
      email: "البريد",
      phone: "الهاتف",
      addr: "العنوان",
      web: "الموقع",
    },
    p.website,
  );
  const arClient = partyHtml(
    "الطرف الثاني (العميل)",
    c.nameAr || c.nameEn || "",
    c.legalNameAr,
    c.crNumber,
    c.taxNumber,
    c.email,
    c.phone,
    c.addressAr,
    "الممثل",
    c.repNameAr,
    c.repTitleAr,
    {
      legal: "الاسم القانوني",
      cr: "س.ت",
      tax: "الرقم الضريبي",
      email: "البريد",
      phone: "الهاتف",
      addr: "العنوان",
    },
  );

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
  if (!snapshot.items || snapshot.items.length === 0) {
    return "";
  }
  const currency = snapshot.contract.currency;

  function tableHtml(tableLang: Locale): string {
    const isArabic = tableLang === "ar";
    const thNum = "#";
    const thDesc = isArabic ? "الوصف" : "Description";
    const thPrice = isArabic ? "سعر الوحدة" : "Unit price";
    const thQty = isArabic ? "الكمية" : "Qty";
    const thTotal = isArabic ? "الإجمالي" : "Total";

    const rows = snapshot.items
      .map((item) => {
        const desc = isArabic
          ? esc(item.descriptionAr ?? item.descriptionEn ?? "")
          : esc(item.descriptionEn ?? item.descriptionAr ?? "");
        return `<tr>
          <td class="col-num">${esc(String(item.position))}</td>
          <td class="col-desc">${desc}</td>
          <td class="col-price">${money(item.unitPriceMinor, currency, tableLang)}</td>
          <td class="col-qty">${num(fmtQty(item.qtyMilli))}</td>
          <td class="col-total">${money(item.lineTotalMinor, currency, tableLang)}</td>
        </tr>`;
      })
      .join("");

    return `
      <table class="contract-table">
        <thead>
          <tr>
            <th class="col-num">${thNum}</th>
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
  if (!snapshot.milestones || snapshot.milestones.length === 0) {
    return "";
  }
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
          <td class="c-num">${esc(String(m.position))}</td>
          <td class="c-title">
            <strong>${title}</strong>
            ${trigger ? `<br><span class="muted" style="font-size: 6.8pt;">${trigger}</span>` : ""}
          </td>
          <td class="c-pct">${percent}</td>
          <td class="c-net">${money(m.amountMinor, currency, tableLang)}</td>
          <td class="c-tax">${money(m.taxMinor, currency, tableLang)}</td>
          <td class="c-total">${money(m.totalMinor, currency, tableLang)}</td>
          <td class="c-due">${dueDate}</td>
        </tr>`;
      })
      .join("");

    return `
      <table class="contract-table">
        <thead>
          <tr>
            <th class="c-num">${thNum}</th>
            <th class="c-title">${thMilestone}</th>
            <th class="c-pct">${thPercent}</th>
            <th class="c-net">${thNet}</th>
            <th class="c-tax">${thTax}</th>
            <th class="c-total">${thTotal}</th>
            <th class="c-due">${thDue}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
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
      mark = `<em style="font-family: serif; font-size: 16pt; color: #1e1b4b;">${esc(sig.typedName)}</em>`;
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


  const badge = lang === "ar" ? "التوقيع والاعتماد" : "EXECUTION & SIGNATURES";
  return `
    <div dir="${docDir(lang)}">
      <div class="section-badge">${badge}</div>
      ${lang === "ar" ? arCards : enCards}
    </div>
  `;
}
