import type { CurrencyCode, Locale } from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import { FONT_STACK } from "@/server/pdf/fonts";
import type { ContractSnapshotV1 } from "@/server/templating/variables";

// 12.1 — single escaping helper used by every dynamic string.
export const esc = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export type DocLang = "ar" | "en" | "bilingual";

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

// 12.4 — normative base CSS.
export function baseCss(fonts: string): string {
  return `${fonts}
@page { size: A4; }
html { font-family: ${FONT_STACK}; font-size: 10.5pt; color: #111; }
body { margin: 0; line-height: 1.6; }
[lang="ar"], .ar { line-height: 1.85; }
h1 { font-size: 18pt; margin: 0 0 4mm; }
h2.clause { font-size: 11.5pt; margin: 6mm 0 2mm; break-after: avoid; color: #7f1d1d; }
p { margin: 0 0 2.2mm; orphans: 3; widows: 3; }
table { width: 100%; border-collapse: collapse; }
th, td { border: 0.3mm solid #d9d9de; padding: 1.6mm 2mm; vertical-align: top; }
thead { display: table-header-group; } tr { break-inside: avoid; }
.num { font-variant-numeric: tabular-nums; direction: ltr; unicode-bidi: isolate; text-align: end; }
.watermark { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 110px; font-weight: 800; color: rgba(0,0,0,.07); transform: rotate(-30deg); pointer-events: none; }
.clause-row > td { break-inside: auto; }
.clause-row { break-inside: auto; }
.block-row { break-inside: avoid; }
bdi { unicode-bidi: isolate; }
.header { display: flex; justify-content: space-between; gap: 8mm; align-items: flex-start; margin-bottom: 6mm; }
.header .logo { max-height: 14mm; }
.meta td { border: none; padding: 0.6mm 0; font-size: 9.5pt; }
.meta td:first-child { color: #555; padding-inline-end: 4mm; }
.muted { color: #555; }
.accent { color: #b91c1c; }
.sig-cell { height: 20mm; vertical-align: bottom; }
.sig-img { max-height: 18mm; }
.stamp { max-height: 24mm; }
.verify { margin-top: 8mm; border: 0.3mm solid #d9d9de; padding: 3mm; break-inside: avoid; }
.verify .qr { width: 30mm; height: 30mm; }
.verify .hash { font-family: monospace; font-size: 8pt; word-break: break-all; }
.cert { break-before: page; }
.cert h1 { color: #7f1d1d; }
.bilingual-clause { width: 100%; border-collapse: collapse; }
.bilingual-clause th { background: #f5f5f7; }
.bilingual-clause .en { text-align: start; }
.bilingual-clause .ar { text-align: start; direction: rtl; }
.divider { border-inline-end: 0.3mm solid #d9d9de; }
.unsigned-note { color: #b91c1c; font-weight: 600; }
.paid-stamp { border: 0.6mm solid #16a34a; color: #16a34a; padding: 1mm 3mm; font-weight: 700; display: inline-block; }`;
}

export function documentShell(input: {
  lang: DocLang;
  title: string;
  fonts: string;
  watermark?: string | null;
  body: string;
}): string {
  const dir = docDir(input.lang);
  const htmlLang = input.lang === "bilingual" ? "en" : input.lang;
  return `<!doctype html><html lang="${htmlLang}" dir="${dir}"><head><meta charset="utf-8"><title>${esc(input.title)}</title><style>${baseCss(input.fonts)}</style></head><body>${
    input.watermark
      ? `<div class="watermark">${esc(input.watermark)}</div>`
      : ""
  }${input.body}</body></html>`;
}

// 12.2 — footer template (Latin only; footer templates do not inherit page fonts).
export function buildFooterTemplate(meta: {
  docNumber: string;
  code: string | null;
}): string {
  const grouped = meta.code
    ? meta.code
        .toUpperCase()
        .replace(/[\s-]/g, "")
        .replace(/(.{4})(?=.)/g, "$1-")
    : "";
  return `<div style="font-size:8px;width:100%;padding:0 16mm;display:flex;justify-content:space-between;direction:ltr;color:#666;font-family:Arial,sans-serif;"><span>${esc(meta.docNumber)}</span><span>${esc(grouped)}</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>`;
}

// ───────── block renderers (12.4) ─────────

function pick(ar: string | null, en: string | null, lang: DocLang): string {
  if (lang === "ar") return ar ?? "";
  if (lang === "en") return en ?? "";
  const enText = en ?? "";
  const arText = ar ?? "";
  if (enText && arText && enText !== arText) {
    return `${esc(enText)}<br><span class="ar" dir="rtl">${esc(arText)}</span>`;
  }
  return esc(enText || arText);
}

export function renderPartiesBlock(
  snapshot: ContractSnapshotV1,
  lang: DocLang,
): string {
  const p = snapshot.provider;
  const c = snapshot.client;
  const rows: Array<[string, string, string]> = [
    ["Provider", "المزوّد", esc(p.nameEn ?? p.nameAr ?? "")],
    [
      "Legal name",
      "الاسم القانوني",
      esc((lang === "ar" ? p.legalNameAr : p.legalNameEn) ?? ""),
    ],
    ["CR", "السجل التجاري", esc(p.crNumber ?? "")],
    ["Tax no.", "الرقم الضريبي", esc(p.taxNumber ?? "")],
    [
      "Address",
      "العنوان",
      esc((lang === "ar" ? p.addressAr : p.addressEn) ?? ""),
    ],
    ["Email", "البريد", esc(p.email ?? "")],
    ["Client", "العميل", esc(c.nameEn ?? c.nameAr ?? "")],
    [
      "Client legal name",
      "الاسم القانوني للعميل",
      esc((lang === "ar" ? c.legalNameAr : c.legalNameEn) ?? ""),
    ],
    ["Client CR", "سجل العميل", esc(c.crNumber ?? "")],
    ["Client tax no.", "الرقم الضريبي للعميل", esc(c.taxNumber ?? "")],
    [
      "Client address",
      "عنوان العميل",
      esc((lang === "ar" ? c.addressAr : c.addressEn) ?? ""),
    ],
    [
      "Representative",
      "الممثل",
      esc((lang === "ar" ? c.repNameAr : c.repNameEn) ?? ""),
    ],
  ];
  const body = rows
    .filter(([, , value]) => value !== "")
    .map(
      ([enLabel, arLabel, value]) =>
        `<tr><th>${esc(enLabel)} / <span class="ar" dir="rtl">${esc(arLabel)}</span></th><td>${value}</td></tr>`,
    )
    .join("");
  return `<table><tbody>${body}</tbody></table>`;
}

export function renderPricingTableBlock(
  snapshot: ContractSnapshotV1,
  lang: DocLang,
): string {
  const currency = snapshot.contract.currency;
  const uiLang: Locale = lang === "ar" ? "ar" : "en";
  const rows = snapshot.items
    .map((item) => {
      const description = pick(item.descriptionAr, item.descriptionEn, lang);
      return `<tr><td>${num(String(item.position))}</td><td>${description}</td><td>${num(
        fmtQty(item.qtyMilli),
      )}</td><td>${money(item.unitPriceMinor, currency, uiLang)}</td><td>${money(
        item.lineTotalMinor,
        currency,
        uiLang,
      )}</td></tr>`;
    })
    .join("");
  return `<table><thead><tr><th>#</th><th>Description / <span class="ar" dir="rtl">الوصف</span></th><th>Qty / <span class="ar" dir="rtl">الكمية</span></th><th>Unit price / <span class="ar" dir="rtl">سعر الوحدة</span></th><th>Total / <span class="ar" dir="rtl">الإجمالي</span></th></tr></thead><tbody>${rows}</tbody></table>`;
}

export function renderPaymentScheduleBlock(
  snapshot: ContractSnapshotV1,
  lang: DocLang,
): string {
  const currency = snapshot.contract.currency;
  const uiLang: Locale = lang === "ar" ? "ar" : "en";
  const rows = snapshot.milestones
    .map((m) => {
      const title = pick(m.titleAr, m.titleEn, lang);
      const trigger = pick(m.triggerNoteAr, m.triggerNoteEn, lang);
      const percent =
        m.percentBp !== null ? num(`${(m.percentBp / 100).toFixed(2)}%`) : "";
      return `<tr><td>${num(String(m.position))}</td><td>${title}${
        trigger ? `<br><span class="muted">${trigger}</span>` : ""
      }</td><td>${percent}</td><td>${money(m.amountMinor, currency, uiLang)}</td><td>${money(
        m.taxMinor,
        currency,
        uiLang,
      )}</td><td>${money(m.totalMinor, currency, uiLang)}</td><td>${esc(
        m.dueDate ?? "",
      )}</td></tr>`;
    })
    .join("");
  return `<table><thead><tr><th>#</th><th>Milestone / <span class="ar" dir="rtl">الدفعة</span></th><th>%</th><th>Net / <span class="ar" dir="rtl">الصافي</span></th><th>Tax / <span class="ar" dir="rtl">الضريبة</span></th><th>Total / <span class="ar" dir="rtl">الإجمالي</span></th><th>Due / <span class="ar" dir="rtl">الاستحقاق</span></th></tr></thead><tbody>${rows}</tbody></table>`;
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
  function cell(
    sig: SignatureRender | undefined,
    role: "provider" | "client",
  ): string {
    const labelEn = role === "provider" ? "Provider" : "Client";
    const labelAr = role === "provider" ? "المزوّد" : "العميل";
    const heading = `${esc(labelEn)} / <span class="ar" dir="rtl">${esc(labelAr)}</span>`;
    if (!sig || sig.signedAtMs === null) {
      return `<td class="sig-cell"><strong>${heading}</strong><br><br><br></td>`;
    }
    let mark = "";
    if (sig.imageDataUri) {
      mark = `<img class="sig-img" src="${esc(sig.imageDataUri)}" alt="" />`;
    } else if (sig.method === "typed" && sig.typedName) {
      mark = `<em>${esc(sig.typedName)}</em>`;
    }
    const stamp =
      role === "provider" && stampDataUri
        ? ` <img class="stamp" src="${esc(stampDataUri)}" alt="" />`
        : "";
    return `<td class="sig-cell"><strong>${heading}</strong><br>${mark}${stamp}<br><span>${esc(
      sig.name,
    )}</span>${
      sig.title ? `<br><span class="muted">${esc(sig.title)}</span>` : ""
    }<br><span class="muted">Signed electronically on ${esc(
      formatSignedAt(sig.signedAtMs),
    )} UTC</span></td>`;
  }
  void lang;
  return `<table><tbody><tr class="block-row">${cell(provider, "provider")}${cell(
    client,
    "client",
  )}</tr></tbody></table>`;
}
