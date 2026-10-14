// Dossier - Receipt Module
// https://github.com/red-shadows-rs/dossier

import type { CurrencyCode, Locale } from "@/lib/constants";
import { formatDateLong } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { DocLang } from "@/lib/doc-lang";
import { renderCode39Svg } from "@/server/pdf/qr";
import { documentShell, esc, isRtl, num } from "./shared";
import { INVOICE_CSS, type InvoiceHtmlInput } from "./invoice";

export type ReceiptHtmlInput = InvoiceHtmlInput;

function uiLang(lang: DocLang): Locale {
  return lang === "ar" ? "ar" : "en";
}

function pick(
  ar: string | null | undefined,
  en: string | null | undefined,
  lang: DocLang,
): string {
  if (lang === "en") return esc(en || ar || "");
  return esc(ar || en || "");
}

function localizePaymentMethod(method: string, lang: DocLang): string {
  const methodMap: Record<string, { ar: string; en: string }> = {
    bank_transfer: { ar: "تحويل بنكي", en: "Bank Transfer" },
    cash: { ar: "نقدا", en: "Cash" },
    card: { ar: "بطاقة دفع / مدى", en: "Card / Mada" },
    cheque: { ar: "شيك مصدق", en: "Cheque" },
    other: { ar: "أخرى", en: "Other" },
  };
  const m = methodMap[method] ?? { ar: method, en: method };
  if (lang === "en") return esc(m.en);
  return esc(m.ar);
}

function heroHeader(input: ReceiptHtmlInput): string {
  const s = input.seller;
  const lang = input.lang;
  const inv = input.invoice;
  const ui = uiLang(lang);
  const isRtlDoc = isRtl(lang);

  const title = lang === "en" ? "RECEIPT" : "سند قبض";
  const subtitle = "";

  const sellerName = pick(s.nameAr, s.nameEn, lang);
  const address = pick(s.addressAr ?? null, s.addressEn ?? null, lang);

  const sellerLines: string[] = [];
  if (address) sellerLines.push(`<div>${address}</div>`);
  const contact: string[] = [];
  if (s.phone) contact.push(`<span dir="ltr">${esc(s.phone)}</span>`);
  if (s.email) contact.push(`<span dir="ltr">${esc(s.email)}</span>`);
  if (contact.length > 0) sellerLines.push(`<div>${contact.join(" · ")}</div>`);
  const crVat: string[] = [];
  if (s.crNumber) crVat.push(lang === "ar" ? `س.ت: ${esc(s.crNumber)}` : `CR: ${esc(s.crNumber)}`);
  if (s.taxNumber) crVat.push(lang === "ar" ? `ض.ر: ${esc(s.taxNumber)}` : `VAT: ${esc(s.taxNumber)}`);
  if (crVat.length > 0) sellerLines.push(`<div>${crVat.join(" · ")}</div>`);

  const activePayments = input.payments.filter((p) => !p.voided);
  const latestPayment = activePayments.at(-1);
  const receiptDateIso = latestPayment?.paidOn ?? inv.issueDate ?? "";
  const receiptDateFormatted = receiptDateIso
    ? esc(formatDateLong(receiptDateIso, ui))
    : "—";

  const brandMarkSvg = input.logoDataUri
    ? `<img class="brand-logo-img" src="${esc(input.logoDataUri)}" alt="" />`
    : `
      <div class="brand-box">
        <div>
          <div class="brand-name">${sellerName}</div>
        </div>
        <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
          <polygon points="16,2 30,10 16,18 2,10" fill="#e11d48" />
          <polygon points="2,10 16,18 16,30 2,22" fill="#9f1239" />
          <polygon points="30,10 16,18 16,30 30,22" fill="#fb7185" />
        </svg>
      </div>
    `;

  const svgTransform = isRtlDoc
    ? 'transform="scale(-1, 1) translate(-1000, 0)"'
    : "";

  const receiptNo = inv.number ? `REC-${inv.number}` : "REC-DRAFT";

  const lblNo = lang === "en" ? "Receipt No" : "رقم السند";
  const lblDate = lang === "en" ? "Receipt Date" : "تاريخ السند";
  const lblInvoice = lang === "en" ? "Invoice Ref" : "الفاتورة المرتبطة";
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
              <td class="val"><span class="doc-number" dir="ltr" style="white-space: nowrap;">${esc(receiptNo)}</span></td>
            </tr>
            <tr>
              <td class="lbl">${lblDate}</td>
              <td class="val-std">${receiptDateFormatted}</td>
            </tr>
            <tr>
              <td class="lbl">${lblInvoice}</td>
              <td class="val"><span dir="ltr">${esc(inv.number ?? "—")}</span></td>
            </tr>
            ${
              inv.projectLabel && inv.projectLabel !== "—"
                ? `<tr><td class="lbl">${lblProject}</td><td class="val-std">${esc(inv.projectLabel)}</td></tr>`
                : ""
            }
            ${
              inv.contractNumber
                ? `<tr><td class="lbl">${lblContract}</td><td class="val">${num(inv.contractNumber)}</td></tr>`
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

function receivedFromSection(input: ReceiptHtmlInput): string {
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

  const billToLabel = lang === "en" ? "RECEIVED FROM:" : "استلمنا من السادة:";

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

function paymentsTable(input: ReceiptHtmlInput): string {
  const currency = input.invoice.currency as CurrencyCode;
  const lang = uiLang(input.lang);
  const activePayments = input.payments.filter((p) => !p.voided);

  const rows = activePayments
    .map((p, idx) => {
      const methodText = localizePaymentMethod(p.method, input.lang);
      const refText = p.reference ? esc(p.reference) : "—";
      return `<tr>
        <td class="col-num">${num(String(idx + 1))}</td>
        <td class="col-desc" style="white-space: nowrap;">${esc(formatDateLong(p.paidOn, lang))}</td>
        <td class="col-desc"><div class="item-title">${methodText}</div></td>
        <td class="col-desc num" dir="ltr">${refText}</td>
        <td class="col-total">${num(formatMoney(p.amountMinor, currency, lang))}</td>
      </tr>`;
    })
    .join("");

  const thDate = input.lang === "ar" ? "تاريخ الاستلام" : "Date Received";
  const thMethod = input.lang === "ar" ? "طريقة الدفع" : "Payment Method";
  const thRef = input.lang === "ar" ? "المرجع / رقم العملية" : "Reference / Txn";
  const thAmount = input.lang === "ar" ? "المبلغ المقبوض" : "Amount Received";
  const emptyText = input.lang === "ar" ? "لا توجد دفعات مسجلة" : "No recorded payments";

  return `
  <table class="inv-items-table">
    <thead>
      <tr>
        <th class="col-num">#</th>
        <th class="col-desc" style="width: 25%;">${thDate}</th>
        <th class="col-desc" style="width: 25%;">${thMethod}</th>
        <th class="col-desc" style="width: 25%;">${thRef}</th>
        <th class="col-total" style="width: 25%;">${thAmount}</th>
      </tr>
    </thead>
    <tbody>${rows.length > 0 ? rows : `<tr><td colspan="5" style="text-align: center; padding: 6mm; color: #64748b;">${emptyText}</td></tr>`}</tbody>
  </table>
  `;
}

function totalsBlock(input: ReceiptHtmlInput): string {
  const inv = input.invoice;
  const currency = inv.currency as CurrencyCode;
  const lang = uiLang(input.lang);
  const money = (minor: number) => num(formatMoney(minor, currency, lang));
  const activePayments = input.payments.filter((p) => !p.voided);
  const totalReceivedMinor = activePayments.reduce((sum, p) => sum + p.amountMinor, 0);
  const remainingMinor = Math.max(0, inv.totalMinor - totalReceivedMinor);

  const lblInvTotal =
    input.lang === "ar"
      ? "إجمالي الفاتورة"
      : input.lang === "en"
        ? "Invoice Total"
        : "Invoice Total / إجمالي الفاتورة";
  const lblReceived =
    input.lang === "ar"
      ? "إجمالي المقبوض"
      : input.lang === "en"
        ? "TOTAL RECEIVED"
        : "TOTAL RECEIVED / إجمالي المقبوض";
  const lblBal =
    input.lang === "ar"
      ? "الرصيد المتبقي"
      : input.lang === "en"
        ? "Remaining Balance"
        : "Remaining Balance / الرصيد المتبقي";

  let remainingBlock = "";
  if (remainingMinor > 0) {
    remainingBlock = `
    <table class="totals-table" style="margin-top: 1.5mm;">
      <tbody>
        <tr>
          <td class="lbl" style="font-weight: 700; color: #14141a;">${lblBal}</td>
          <td class="val" style="font-weight: 800; color: #e11d48;">${money(remainingMinor)}</td>
        </tr>
      </tbody>
    </table>
    `;
  }

  const stamp =
    remainingMinor === 0
      ? `<div class="paid-stamp">${
          input.lang === "ar"
            ? "مكتمل السداد"
            : input.lang === "en"
              ? "FULLY PAID"
              : "FULLY PAID / مكتمل السداد"
        }</div>`
      : "";

  return `
  <div class="totals-wrap">
    <div class="totals-box">
      <table class="totals-table">
        <tbody>
          <tr>
            <td class="lbl">${lblInvTotal}</td>
            <td class="val">${money(inv.totalMinor)}</td>
          </tr>
        </tbody>
      </table>
      <div class="total-due-card">
        <span class="due-lbl">${lblReceived}</span>
        <span class="due-val">${money(totalReceivedMinor)}</span>
      </div>
      ${remainingBlock}
      ${stamp}
    </div>
  </div>
  `;
}

function acknowledgementBlock(input: ReceiptHtmlInput): string {
  const inv = input.invoice;
  const invNo = inv.number ?? "—";

  const heading =
    input.lang === "ar"
      ? "إقرار استلام الدفعة"
      : input.lang === "en"
        ? "Payment Acknowledgement"
        : '<span dir="ltr">Payment acknowledgement</span> / <span dir="rtl">إقرار استلام الدفعة</span>';

  let text = "";
  if (input.lang === "ar") {
    text = `نشهد بأننا استلمنا من السادة الموضح بياناتهم أعلاه المبالغ المبيّنة في هذا السند كسداد لحساب الفاتورة رقم <span dir="ltr">${esc(invNo)}</span>&rlm;.`;
  } else if (input.lang === "en") {
    text = `We acknowledge receipt of the payment(s) detailed in this voucher as settlement against invoice <span dir="ltr">${esc(invNo)}</span>.`;
  } else {
    text = `<span dir="ltr">We acknowledge receipt of the payment(s) detailed in this voucher as settlement against invoice <span dir="ltr">${esc(invNo)}</span>.</span><br><span dir="rtl" class="ar">نشهد بأننا استلمنا من السادة الموضح بياناتهم أعلاه المبالغ المبيّنة في هذا السند كسداد لحساب الفاتورة رقم <span dir="ltr">${esc(invNo)}</span>&rlm;.</span>`;
  }

  return `
  <div class="info-block">
    <h4>${heading}</h4>
    <p>${text}</p>
  </div>
  `;
}

function notesBlock(input: ReceiptHtmlInput): string {
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

function verificationBlock(input: ReceiptHtmlInput): string {
  const v = input.verification;
  if (!v) return "";
  const receiptNo = input.invoice.number ? `REC-${input.invoice.number}` : "REC";
  const barcodeSvg = renderCode39Svg(receiptNo, 20);
  const title =
    input.lang === "ar"
      ? "التحقق · باركود"
      : input.lang === "en"
        ? "Verification · Barcode"
        : "Verification / التحقق · Barcode";
  const genNote =
    input.lang === "ar"
      ? "تم إنشاء سند القبض عبر Dossier"
      : input.lang === "en"
        ? "Receipt generated by Dossier"
        : '<span dir="ltr">Receipt generated by Dossier</span> / <span dir="rtl">تم إنشاء سند القبض عبر Dossier</span>';
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

export function renderReceiptHtml(input: ReceiptHtmlInput): string {
  const lang = input.lang;
  const receiptNo = input.invoice.number ? `REC-${input.invoice.number}` : "REC-DRAFT";

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
    lang === "ar"
      ? "شاكرين ومقدرين حسن تعاونكم."
      : lang === "en"
        ? "Thank you for your business."
        : '<span dir="ltr">Thank you.</span> / <span dir="rtl">شاكرين ومقدرين حسن تعاونكم.</span>';
  const footerSystemName = "Dossier";

  const body = `
<div class="invoice-page">
  ${heroHeader(input)}
  <div class="invoice-body">
    ${receivedFromSection(input)}
    ${paymentsTable(input)}
    ${totalsBlock(input)}
  </div>

  <div class="inv-footer-wrap">
    <div class="inv-footer">
      <div class="footer-info">
        ${acknowledgementBlock(input)}
        ${notesBlock(input)}
        <div class="thank-you">${thankYouText}</div>
      </div>
      <div class="footer-verification">
        ${verificationBlock(input)}
        ${stampImg}
      </div>
    </div>
  </div>

  <div class="bottom-red-bar">
    <span dir="ltr">${esc(footerSystemName)}</span>
    <span class="page-num-display" dir="ltr">1 / 1</span>
  </div>
</div>
`;

  return documentShell({
    lang,
    title: receiptNo,
    fonts: input.fonts,
    watermark: null,
    body,
    extraCss: INVOICE_CSS,
  });
}
