import { formatDateLong } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { CurrencyCode, Locale } from "@/lib/constants";
import type { DocLang } from "@/lib/doc-lang";
import type { InvoiceStatus } from "@/server/services/invoices";
import {
  documentShell,
  esc,
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
};

export type InvoiceHtmlInput = {
  invoice: {
    id: string;
    number: string | null;
    currency: string;
    languageMode: "ar" | "en" | "bilingual";
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
  verification: { code: string; url: string; qrDataUri: string } | null;
};

function pick(
  ar: string | null | undefined,
  en: string | null | undefined,
  lang: DocLang,
): string {
  if (lang === "ar") return esc(ar ?? "");
  if (lang === "en") return esc(en ?? "");
  const enText = en ?? "";
  const arText = ar ?? "";
  if (enText && arText && enText !== arText) {
    return `${esc(enText)}<br><span class="ar" dir="rtl">${esc(arText)}</span>`;
  }
  return esc(enText || arText);
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

function sellerHeader(input: InvoiceHtmlInput): string {
  const s = input.seller;
  const lang = input.lang;
  const name = pick(s.nameAr, s.nameEn, lang);
  const legal = pick(s.legalNameAr ?? null, s.legalNameEn ?? null, lang);
  const address = pick(s.addressAr ?? null, s.addressEn ?? null, lang);
  const logo = input.logoDataUri
    ? `<img class="logo" src="${esc(input.logoDataUri)}" alt="" />`
    : "";
  const details: string[] = [];
  if (legal) details.push(legal);
  if (s.crNumber) details.push(`CR / س.ت: ${esc(s.crNumber)}`);
  if (s.taxNumber) details.push(`VAT / ض.ر: ${esc(s.taxNumber)}`);
  if (address) details.push(address);
  if (s.email) details.push(`<span dir="ltr">${esc(s.email)}</span>`);
  if (s.phone) details.push(`<span dir="ltr">${esc(s.phone)}</span>`);
  return `<header class="header"><div>${logo}<div><strong>${name}</strong></div><div class="muted">${details.join("<br>")}</div></div></header>`;
}

function metaBlock(input: InvoiceHtmlInput): string {
  const inv = input.invoice;
  const lang = uiLang(input.lang);
  const rows: Array<[string, string]> = [
    [
      "Issue date / تاريخ الإصدار",
      inv.issueDate ? esc(formatDateLong(inv.issueDate, lang)) : "—",
    ],
    [
      "Due date / تاريخ الاستحقاق",
      `${inv.dueDate ? esc(formatDateLong(inv.dueDate, lang)) : "—"}${
        input.isOverdue
          ? ` <span class="overdue-tag">OVERDUE / متأخرة</span>`
          : ""
      }`,
    ],
    ["Project / المشروع", esc(inv.projectLabel)],
  ];
  if (inv.contractNumber) {
    rows.push(["Contract / العقد", num(inv.contractNumber)]);
  }
  const body = rows
    .map(
      ([label, value]) =>
        `<tr><td class="muted">${esc(label)}</td><td>${value}</td></tr>`,
    )
    .join("");
  return `<table class="meta"><tbody>${body}</tbody></table>`;
}

function billTo(input: InvoiceHtmlInput): string {
  const b = input.buyer;
  const lang = input.lang;
  const name = pick(b.nameAr, b.nameEn, lang);
  const legal = pick(b.legalNameAr ?? null, b.legalNameEn ?? null, lang);
  const address = pick(b.addressAr ?? null, b.addressEn ?? null, lang);
  const rows: string[] = [];
  if (legal) rows.push(legal);
  if (b.crNumber) rows.push(`CR / س.ت: ${esc(b.crNumber)}`);
  if (b.taxNumber) rows.push(`VAT / ض.ر: ${esc(b.taxNumber)}`);
  if (address) rows.push(address);
  return `<section class="card"><h2>Bill to / إلى</h2><p><strong>${name}</strong></p><p class="muted">${rows.join("<br>")}</p></section>`;
}

function linesTable(input: InvoiceHtmlInput): string {
  const currency = input.invoice.currency as CurrencyCode;
  const lang = uiLang(input.lang);
  const rows = input.lines
    .map((line) => {
      const description = pick(
        line.descriptionAr,
        line.descriptionEn,
        input.lang,
      );
      return `<tr><td>${num(String(line.position))}</td><td>${description}</td><td>${num(
        fmtQty(line.qtyMilli),
      )}</td><td>${num(formatMoney(line.unitPriceMinor, currency, lang))}</td><td>${num(
        formatMoney(line.lineTotalMinor, currency, lang),
      )}</td></tr>`;
    })
    .join("");
  return `<table><thead><tr><th>#</th><th>Description / الوصف</th><th>Qty / الكمية</th><th>Unit price / سعر الوحدة</th><th>Total / الإجمالي</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function totalsBlock(input: InvoiceHtmlInput): string {
  const inv = input.invoice;
  const currency = inv.currency as CurrencyCode;
  const lang = uiLang(input.lang);
  const money = (minor: number) => num(formatMoney(minor, currency, lang));
  const rows: Array<[string, string, boolean]> = [
    ["Subtotal / المجموع الفرعي", money(inv.subtotalMinor), false],
  ];
  if (inv.discountMinor > 0) {
    rows.push(["Discount / الخصم", money(inv.discountMinor), false]);
  }
  rows.push(["Net / الصافي", money(inv.netMinor), false]);
  if (inv.taxMinor > 0) {
    const percent = (inv.taxRateBp / 100).toFixed(2).replace(/\.?0+$/, "");
    rows.push([`Tax / الضريبة (${percent}%)`, money(inv.taxMinor), false]);
  }
  rows.push(["Total / الإجمالي", money(inv.totalMinor), true]);
  if (inv.paidMinor > 0) {
    rows.push(["Paid / المدفوع", money(inv.paidMinor), false]);
    rows.push([
      "Balance due / المتبقي",
      money(inv.totalMinor - inv.paidMinor),
      true,
    ]);
  }
  const body = rows
    .map(
      ([label, value, strong]) =>
        `<tr${strong ? ' class="total-row"' : ""}><td>${esc(label)}</td><td>${value}</td></tr>`,
    )
    .join("");
  const stamp =
    inv.status === "paid" ? `<div class="paid-stamp">PAID / مدفوعة</div>` : "";
  return `<div class="totals-wrap"><table class="totals"><tbody>${body}</tbody></table>${stamp}</div>`;
}

function paymentsBlock(input: InvoiceHtmlInput): string {
  const active = input.payments.filter((p) => !p.voided);
  if (active.length === 0) return "";
  const currency = input.invoice.currency as CurrencyCode;
  const lang = uiLang(input.lang);
  const rows = active
    .map(
      (p) =>
        `<tr><td>${esc(p.paidOn)}</td><td>${num(
          formatMoney(p.amountMinor, currency, lang),
        )}</td><td>${esc(p.method)}</td><td>${p.reference ? esc(p.reference) : "—"}</td></tr>`,
    )
    .join("");
  return `<section><h2>Payments / الدفعات</h2><table><thead><tr><th>Date / التاريخ</th><th>Amount / المبلغ</th><th>Method / الطريقة</th><th>Reference / المرجع</th></tr></thead><tbody>${rows}</tbody></table></section>`;
}

function instructionsBlock(input: InvoiceHtmlInput): string {
  const instructions = pick(
    input.invoice.paymentInstructionsAr,
    input.invoice.paymentInstructionsEn,
    input.lang,
  );
  if (!instructions) return "";
  return `<section class="card"><h2>Payment instructions / تعليمات السداد</h2><p>${instructions}</p></section>`;
}

function notesBlock(input: InvoiceHtmlInput): string {
  const notes = pick(input.invoice.notesAr, input.invoice.notesEn, input.lang);
  if (!notes) return "";
  return `<section><h2>Notes / ملاحظات</h2><p>${notes}</p></section>`;
}

function verificationBlock(input: InvoiceHtmlInput): string {
  const v = input.verification;
  if (!v) return "";
  return `<div class="verify"><table><tbody><tr><td class="divider"><img class="qr" src="${esc(
    v.qrDataUri,
  )}" alt="QR" /></td><td><p><strong>Verification / التحقق:</strong> ${num(
    v.code,
  )}</p><p class="muted" dir="ltr">${esc(
    v.url,
  )}</p></td></tr></tbody></table><p class="muted">Invoice generated by Dossier</p></div>`;
}

// 12.6 — invoice HTML.
export function renderInvoiceHtml(input: InvoiceHtmlInput): string {
  const lang: SharedDocLang = input.lang;
  const watermark =
    input.invoice.status === "draft"
      ? "DRAFT / مسودة"
      : input.invoice.status === "void"
        ? "VOID / ملغاة"
        : null;

  const title = input.lang === "ar" ? "فاتورة" : "Invoice";
  const number = input.invoice.number
    ? `<span class="doc-number" dir="ltr">${esc(input.invoice.number)}</span>`
    : "";

  const body = `
${sellerHeader(input)}
<div class="doc-title"><h1>${esc(title)} / ${
    input.lang === "ar" ? "Invoice" : "فاتورة"
  }</h1>${number}</div>
${metaBlock(input)}
${billTo(input)}
${linesTable(input)}
${totalsBlock(input)}
${paymentsBlock(input)}
${instructionsBlock(input)}
${notesBlock(input)}
${verificationBlock(input)}
`;

  return documentShell({
    lang,
    title: input.invoice.number ?? "Invoice",
    fonts: input.fonts,
    watermark,
    body,
  });
}
