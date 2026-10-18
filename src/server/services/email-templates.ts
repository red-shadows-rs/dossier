import { env } from "@/lib/env";
import type { Locale } from "@/lib/constants";
import { formatInstant } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import type { EmailTemplateKey } from "@/server/services/email";

export type RenderedEmail = {
  subject: string;
  html: string;
  text: string;
};

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function readText(payload: Record<string, unknown>, key: string): string {
  const value = payload[key];
  if (value === undefined || value === null) return "";
  return String(value);
}

function pickTitle(
  payload: Record<string, unknown>,
  locale: Locale,
): string {
  const ar = readText(payload, "titleAr");
  const en = readText(payload, "titleEn");
  if (locale === "ar") return ar || en;
  return en || ar;
}

function greeting(locale: Locale, name: string): string {
  if (locale === "ar") return name ? `مرحبا ${name}،` : "مرحبا،";
  return name ? `Hello ${name},` : "Hello,";
}

function shell(
  locale: Locale,
  inner: string,
  companyName: string,
): string {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const align = locale === "ar" ? "right" : "left";
  const fontStack =
    locale === "ar"
      ? "'Tajawal', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Arabic', 'Geeza Pro', Arial, sans-serif"
      : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";

  const footer =
    locale === "ar"
      ? `أرسلت من ${escapeHtml(companyName)} عبر نظام Dossier`
      : `Sent by ${escapeHtml(companyName)} via Dossier`;

  const footerTagline =
    locale === "ar"
      ? "نظام Dossier لإدارة الفواتير والعقود الرقمية"
      : "Dossier — Digital Invoicing & Contracts Management";

  return `<!doctype html>
<html dir="${dir}" lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Dossier</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:${fontStack};-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:32px 12px;">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border:1px solid #e4e4e7;border-radius:12px;overflow:hidden;box-shadow:0 4px 16px rgba(0,0,0,0.06);">
  <!-- Brand Header -->
  <tr>
    <td style="background-color:#14141a;padding:20px 24px;border-bottom:3px solid #e11d48;direction:${dir};">
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;display:table;">
        <tr>
          <td style="vertical-align:middle;padding:0;line-height:0;">
            <img src="${env.APP_URL}/apple-touch-icon.png" width="30" height="30" alt="Dossier" style="display:block;width:30px;height:30px;border-radius:6px;border:0;outline:0;text-decoration:none;" />
          </td>
          <td style="vertical-align:middle;padding-${locale === "ar" ? "right" : "left"}:10px;">
            <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:0.5px;line-height:1;">Dossier</span>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- Main Content Body -->
  <tr>
    <td style="padding:32px 28px;font-family:${fontStack};font-size:15px;line-height:1.7;color:#18181b;direction:${dir};text-align:${align};">
${inner}
    </td>
  </tr>

  <!-- Branded Footer -->
  <tr>
    <td style="padding:20px 28px;background-color:#fafafa;border-top:1px solid #e4e4e7;font-family:${fontStack};direction:${dir};text-align:${align};">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td align="${align}">
            <div style="font-size:13px;font-weight:500;color:#52525b;margin-bottom:4px;">
              ${footer}
            </div>
            <div style="font-size:11px;color:#a1a1aa;">
              ${footerTagline}
            </div>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function button(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;">
<tr>
  <td style="border-radius:8px;background-color:#e11d48;">
    <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 32px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:8px;background-color:#e11d48;letter-spacing:0.3px;">${escapeHtml(label)}</a>
  </td>
</tr>
</table>`;
}

function codeBlock(code: string): string {
  return `<div style="margin:20px 0;padding:18px;background-color:#f4f4f5;border:1px dashed #d4d4d8;border-radius:8px;text-align:center;">
<span style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:32px;font-weight:bold;letter-spacing:8px;color:#18181b;">${escapeHtml(code)}</span>
</div>`;
}

function renderBankCard(bankLine: string, locale: Locale): string {
  if (!bankLine) return "";
  const ar = locale === "ar";
  const parts = bankLine
    .split(/\r?\n|\|/)
    .map((s) => s.trim())
    .filter(Boolean);

  const title = ar ? "بيانات الحساب البنكي للسداد" : "Bank Transfer Details";

  const rowsHtml = parts
    .map((part) => {
      const isIban = /IBAN|الآيبان|آيبان/i.test(part);
      const isSwift = /SWIFT|سويفت/i.test(part);
      const colonIdx = part.indexOf(":");

      if (isIban) {
        if (colonIdx !== -1) {
          const lbl = part.slice(0, colonIdx + 1);
          const val = part.slice(colonIdx + 1).trim();
          return `<div style="margin:8px 0;padding:8px 12px;background:#ffffff;border:1px solid #e4e4e7;border-radius:6px;font-size:13px;direction:${
            ar ? "rtl" : "ltr"
          };text-align:${ar ? "right" : "left"};"><span style="color:#71717a;font-weight:500;">${escapeHtml(
            lbl,
          )}</span> <strong dir="ltr" style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;color:#18181b;letter-spacing:1px;margin:0 4px;">${escapeHtml(
            val,
          )}</strong></div>`;
        }
        return `<div style="margin:8px 0;padding:8px 12px;background:#ffffff;border:1px solid #e4e4e7;border-radius:6px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;font-weight:600;color:#18181b;direction:ltr;text-align:${
          ar ? "right" : "left"
        };">${escapeHtml(part)}</div>`;
      }

      if (isSwift && colonIdx !== -1) {
        const lbl = part.slice(0, colonIdx + 1);
        const val = part.slice(colonIdx + 1).trim();
        return `<div style="margin:4px 0;font-size:13px;color:#3f3f46;direction:${
          ar ? "rtl" : "ltr"
        };text-align:${ar ? "right" : "left"};"><span style="color:#71717a;">${escapeHtml(
          lbl,
        )}</span> <strong dir="ltr" style="font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;color:#18181b;">${escapeHtml(
          val,
        )}</strong></div>`;
      }

      return `<div style="margin:4px 0;font-size:13px;color:#3f3f46;direction:${
        ar ? "rtl" : "ltr"
      };text-align:${ar ? "right" : "left"};">${escapeHtml(part)}</div>`;
    })
    .join("\n");

  return `<div style="margin:20px 0;padding:16px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;direction:${
    ar ? "rtl" : "ltr"
  };text-align:${ar ? "right" : "left"};">
<div style="font-size:12px;font-weight:700;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;">${escapeHtml(
    title,
  )}</div>
${rowsHtml}
</div>`;
}

function renderSigningLink(
  locale: Locale,
  payload: Record<string, unknown>,
  companyName: string,
): RenderedEmail {
  const ar = locale === "ar";
  const title = pickTitle(payload, locale);
  const number = readText(payload, "number");
  const url = readText(payload, "url");
  const name = readText(payload, "recipientName");
  const expiresAt = payload.expiresAt;
  const expiry =
    typeof expiresAt === "number"
      ? formatInstant(expiresAt, "UTC", locale, "utc")
      : "";

  const subject = ar
    ? `يرجى مراجعة العقد وتوقيعه: ${title} (${number})`
    : `Please review and sign: ${title} (${number})`;

  const greetingRaw = greeting(locale, name);
  const leadRaw = ar
    ? `${companyName} أرسل إليك عقدا للمراجعة والتوقيع.`
    : `${companyName} has sent you a contract to review and sign.`;
  const validRaw = expiry
    ? ar
      ? `الرابط صالح حتى ${expiry}.`
      : `The link is valid until ${expiry}.`
    : "";
  const ignoreRaw = ar
    ? "إذا لم تكن تتوقع هذا البريد، يمكنك تجاهله بأمان."
    : "If you were not expecting this email, you can safely ignore it.";

  const html = shell(
    locale,
    [
      `<div style="font-size:16px;font-weight:600;color:#18181b;margin-bottom:12px;">${escapeHtml(greetingRaw)}</div>`,
      `<div style="font-size:14px;color:#52525b;margin-bottom:20px;line-height:1.6;">${escapeHtml(leadRaw)}</div>`,
      `<div style="background:#fcfcfc;border:1px solid #e4e4e7;border-radius:10px;padding:20px;margin-bottom:20px;">`,
      `  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:14px;">`,
      `    <tr>`,
      `      <td align="${ar ? "right" : "left"}" style="vertical-align:middle;">`,
      `        <span style="display:inline-block;background:#18181b;color:#ffffff;font-size:13px;font-weight:700;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;padding:5px 12px;border-radius:6px;letter-spacing:0.5px;">${escapeHtml(number)}</span>`,
      `      </td>`,
      expiry
        ? `      <td align="${ar ? "left" : "right"}" style="vertical-align:middle;font-size:12px;color:#71717a;">` +
          `        <span style="color:#a1a1aa;">${ar ? "صالح حتى:" : "Valid until:"}</span> <strong style="color:#18181b;">${escapeHtml(expiry)}</strong>` +
          `      </td>`
        : "",
      `    </tr>`,
      `  </table>`,
      `  <div style="font-size:16px;font-weight:700;color:#18181b;margin-bottom:6px;">${escapeHtml(title)}</div>`,
      `  <div style="font-size:13px;color:#71717a;line-height:1.6;">${ar ? "يرجى الضغط على الزر أدناه لمعاينة بنود العقد والتوقيع عليه إلكترونياً." : "Please click the button below to review contract terms and sign electronically."}</div>`,
      `</div>`,
      button(url, ar ? "المراجعة والتوقيع" : "Review and sign"),
      url
        ? `<div style="margin:12px 0 20px;font-size:12px;color:#71717a;word-break:break-all;">` +
          `  <span style="color:#a1a1aa;">${ar ? "أو يمكنك نسخ الرابط وفتحه مباشرة في المتصفح:" : "Or copy and open the link directly in your browser:"}</span><br />` +
          `  <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="color:#e11d48;text-decoration:underline;">${escapeHtml(url)}</a>` +
          `</div>`
        : "",
      `<div style="background:#f4f4f5;border-radius:6px;padding:10px 14px;font-size:12px;color:#71717a;">${escapeHtml(ignoreRaw)}</div>`,
    ]
      .filter(Boolean)
      .join("\n"),
    companyName,
  );

  const text = [
    greetingRaw,
    "",
    leadRaw,
    `${title} (${number})`,
    url,
    validRaw,
    ignoreRaw,
  ]
    .filter((line) => line !== "")
    .join("\n");

  return { subject, html, text };
}

function renderOtp(
  locale: Locale,
  payload: Record<string, unknown>,
  companyName: string,
): RenderedEmail {
  const ar = locale === "ar";
  const otp = readText(payload, "otp");
  const name = readText(payload, "recipientName");
  const title = pickTitle(payload, locale);
  const number = readText(payload, "number");

  const subject = ar
    ? `رمز التحقق: ${otp}`
    : `Your verification code: ${otp}`;

  const greetingRaw = greeting(locale, name);
  const leadRaw = ar
    ? "رمز التحقق الخاص بك هو:"
    : "Your verification code is:";
  const expiresRaw = ar ? "ينتهي خلال 10 دقائق." : "It expires in 10 minutes.";
  const shareRaw = ar
    ? "لا تشارك هذا الرمز مع أي شخص."
    : "Do not share this code with anyone.";

  const docCard =
    title || number
      ? `<div style="background:#fcfcfc;border:1px solid #e4e4e7;border-radius:10px;padding:16px 20px;margin-bottom:20px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
    <tr>
      <td align="${ar ? "right" : "left"}" style="vertical-align:middle;">
        ${number ? `<span style="display:inline-block;background:#18181b;color:#ffffff;font-size:13px;font-weight:700;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;padding:5px 12px;border-radius:6px;letter-spacing:0.5px;">${escapeHtml(number)}</span>` : ""}
      </td>
    </tr>
  </table>
  <div style="font-size:15px;font-weight:700;color:#18181b;margin-bottom:4px;">${escapeHtml(title)}</div>
  <div style="font-size:13px;color:#71717a;">${ar ? "رمز التحقق المطلوب لاعتماد وتوقيع العقد إلكترونياً." : "The verification code required to review and sign the contract."}</div>
</div>`
      : "";

  const html = shell(
    locale,
    [
      `<div style="font-size:16px;font-weight:600;color:#18181b;margin-bottom:12px;">${escapeHtml(greetingRaw)}</div>`,
      docCard,
      `<div style="font-size:14px;color:#52525b;margin-bottom:12px;">${escapeHtml(leadRaw)}</div>`,
      codeBlock(otp),
      `<div style="margin:16px 0 6px;color:#71717a;font-size:13px;"><span style="display:inline-block;background:#fef3c7;color:#92400e;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;margin-${ar ? "left" : "right"}:6px;">${ar ? "المدة" : "Validity"}</span>${escapeHtml(expiresRaw)}</div>`,
      `<div style="margin:0;color:#e11d48;font-size:13px;font-weight:500;"><span style="display:inline-block;background:#fee2e2;color:#991b1b;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;margin-${ar ? "left" : "right"}:6px;">${ar ? "تنبيه" : "Security"}</span>${escapeHtml(shareRaw)}</div>`,
    ]
      .filter(Boolean)
      .join("\n"),
    companyName,
  );

  const text = [
    greetingRaw,
    "",
    title ? `${title} (${number})` : "",
    leadRaw,
    otp,
    expiresRaw,
    shareRaw,
  ]
    .filter((line) => line !== "")
    .join("\n");

  return { subject, html, text };
}

function renderSignedCopy(
  locale: Locale,
  payload: Record<string, unknown>,
  companyName: string,
): RenderedEmail {
  const ar = locale === "ar";
  const title = pickTitle(payload, locale);
  const number = readText(payload, "number");
  const code = readText(payload, "code");
  const url = readText(payload, "url");
  const name = readText(payload, "recipientName");

  const subject = ar
    ? `العقد الموقع ${number}`
    : `Signed contract ${number}`;

  const greetingRaw = greeting(locale, name);
  const leadRaw = ar
    ? "وقع جميع الأطراف على العقد. تجد النسخة الموقعة مرفقة بهذا البريد."
    : "All parties have signed the contract. The signed copy is attached to this email.";
  const verifyRaw = code
    ? ar
      ? `رمز التحقق: ${code}`
      : `Verification code: ${code}`
    : "";

  const attachmentNote = ar
    ? "تم إرفاق النسخة الرسمية الموقعة (PDF) مع هذا البريد."
    : "The official signed copy (PDF) is attached to this email.";

  const html = shell(
    locale,
    [
      `<div style="font-size:16px;font-weight:600;color:#18181b;margin-bottom:12px;">${escapeHtml(greetingRaw)}</div>`,
      `<div style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;font-size:13px;font-weight:600;padding:6px 12px;border-radius:6px;margin-bottom:16px;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#16a34a;margin-${ar ? "left" : "right"}:8px;vertical-align:middle;"></span>${escapeHtml(leadRaw)}</div>`,
      `<div style="background:#fcfcfc;border:1px solid #e4e4e7;border-radius:10px;padding:20px;margin-bottom:20px;">`,
      `  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">`,
      `    <tr>`,
      `      <td align="${ar ? "right" : "left"}" style="vertical-align:middle;">`,
      `        <span style="display:inline-block;background:#18181b;color:#ffffff;font-size:13px;font-weight:700;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;padding:5px 12px;border-radius:6px;letter-spacing:0.5px;">${escapeHtml(number)}</span>`,
      `      </td>`,
      `      <td align="${ar ? "left" : "right"}" style="vertical-align:middle;">`,
      `        <span style="display:inline-block;background:#dcfce7;color:#15803d;font-size:11px;font-weight:700;padding:3px 10px;border-radius:4px;">${ar ? "مكتمل التوقيع" : "Fully Signed"}</span>`,
      `      </td>`,
      `    </tr>`,
      `  </table>`,
      `  <div style="font-size:16px;font-weight:700;color:#18181b;margin-bottom:6px;">${escapeHtml(title)}</div>`,
      verifyRaw ? `  <div style="font-size:13px;color:#52525b;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${escapeHtml(verifyRaw)}</div>` : "",
      `</div>`,
      url ? button(url, ar ? "معاينة العقد" : "View Contract") : "",
      url ? `<div style="margin:12px 0;font-size:12px;color:#71717a;" dir="ltr"><a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" style="color:#e11d48;text-decoration:underline;">${escapeHtml(url)}</a></div>` : "",
      `<div style="background:#f4f4f5;border-radius:6px;padding:10px 14px;font-size:13px;color:#52525b;margin-top:16px;"><span style="display:inline-block;background:#e4e4e7;color:#27272a;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;margin-${ar ? "left" : "right"}:8px;">PDF</span>${escapeHtml(attachmentNote)}</div>`,
    ]
      .filter(Boolean)
      .join("\n"),
    companyName,
  );

  const text = [greetingRaw, "", leadRaw, `${title} (${number})`, verifyRaw, url]
    .filter((line) => line !== "")
    .join("\n");

  return { subject, html, text };
}

function renderDeclinedNotice(
  locale: Locale,
  payload: Record<string, unknown>,
  companyName: string,
): RenderedEmail {
  const ar = locale === "ar";
  const title = pickTitle(payload, locale);
  const number = readText(payload, "number");
  const reason = readText(payload, "reason");
  const declinedBy = readText(payload, "declinedByName");
  const name = readText(payload, "recipientName");

  const subject = ar
    ? `تم رفض العقد ${number}`
    : `Contract ${number} was declined`;

  const greetingRaw = greeting(locale, name);
  const whoRaw = declinedBy
    ? ar
      ? `رفض ${declinedBy} العقد.`
      : `${declinedBy} declined the contract.`
    : ar
      ? "تم رفض العقد من قبل أحد الأطراف."
      : "A party declined the contract.";
  const reasonRaw = reason
    ? ar
      ? `السبب: ${reason}`
      : `Reason: ${reason}`
    : "";

  const html = shell(
    locale,
    [
      `<div style="font-size:16px;font-weight:600;color:#18181b;margin-bottom:12px;">${escapeHtml(greetingRaw)}</div>`,
      `<div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:10px;padding:18px 20px;margin-bottom:20px;">`,
      `  <div style="font-size:15px;font-weight:700;color:#9f1239;margin-bottom:8px;">${escapeHtml(title)} <span style="display:inline-block;background:#be123c;color:#ffffff;font-size:12px;font-weight:700;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;padding:3px 8px;border-radius:4px;letter-spacing:0.5px;margin-right:6px;margin-left:6px;">${escapeHtml(number)}</span></div>`,
      `  <div style="font-size:14px;color:#881337;font-weight:500;margin-bottom:6px;">${escapeHtml(whoRaw)}</div>`,
      reasonRaw ? `  <div style="font-size:13px;color:#9f1239;">${escapeHtml(reasonRaw)}</div>` : "",
      `</div>`,
    ]
      .filter(Boolean)
      .join("\n"),
    companyName,
  );

  const text = [greetingRaw, "", `${title} (${number})`, whoRaw, reasonRaw]
    .filter((line) => line !== "")
    .join("\n");

  return { subject, html, text };
}

function renderInvoiceIssued(
  locale: Locale,
  payload: Record<string, unknown>,
  companyName: string,
): RenderedEmail {
  const ar = locale === "ar";
  const number = readText(payload, "number");
  const amount = readText(payload, "amountFormatted");
  const dueDate = readText(payload, "dueDate");
  const bankLine = readText(payload, "bankLine");
  const name = readText(payload, "recipientName");

  const subject = ar
    ? `فاتورة ${number} من ${companyName}`
    : `Invoice ${number} from ${companyName}`;

  const greetingRaw = greeting(locale, name);
  const leadRaw = ar
    ? "تجد مرفقا فاتورة جديدة."
    : "Please find your invoice attached.";
  const amountRaw = amount
    ? ar
      ? `المبلغ: ${amount}`
      : `Amount: ${amount}`
    : "";
  const dueRaw = dueDate
    ? ar
      ? `تاريخ الاستحقاق: ${dueDate}`
      : `Due date: ${dueDate}`
    : "";

  const bankCardHtml = renderBankCard(bankLine, locale);
  const attachmentNote = ar
    ? "تم إرفاق نسخة الفاتورة الرسمية (PDF) مع هذا البريد."
    : "The official invoice (PDF) is attached to this email.";

  const html = shell(
    locale,
    [
      `<div style="font-size:16px;font-weight:600;color:#18181b;margin-bottom:12px;">${escapeHtml(greetingRaw)}</div>`,
      `<div style="font-size:14px;color:#52525b;margin-bottom:20px;line-height:1.6;">${escapeHtml(leadRaw)}</div>`,
      `<div style="background:#fcfcfc;border:1px solid #e4e4e7;border-radius:10px;padding:20px;margin-bottom:20px;">`,
      `  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">`,
      `    <tr>`,
      `      <td align="${ar ? "right" : "left"}" style="vertical-align:middle;">`,
      `        <span style="display:inline-block;background:#18181b;color:#ffffff;font-size:13px;font-weight:700;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;padding:5px 12px;border-radius:6px;letter-spacing:0.5px;">${escapeHtml(number)}</span>`,
      `      </td>`,
      dueDate
        ? `      <td align="${ar ? "left" : "right"}" style="vertical-align:middle;font-size:13px;color:#71717a;">` +
          `        <span style="color:#a1a1aa;">${ar ? "تاريخ الاستحقاق:" : "Due date:"}</span> <strong style="color:#18181b;">${escapeHtml(dueDate)}</strong>` +
          `      </td>`
        : `      <td align="${ar ? "left" : "right"}" style="vertical-align:middle;font-size:13px;color:#71717a;">` +
          `        <span style="color:#a1a1aa;">${ar ? "تاريخ الاستحقاق:" : "Due date:"}</span> <strong style="color:#18181b;">—</strong>` +
          `      </td>`,
      `    </tr>`,
      `  </table>`,
      amount
        ? [
            `  <div style="background:#fff1f2;border:1px solid #ffe4e6;border-radius:8px;padding:16px;text-align:${ar ? "right" : "left"};">`,
            `    <div style="font-size:12px;font-weight:700;color:#e11d48;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${ar ? "إجمالي المبلغ المستحق" : "Total Amount Due"}</div>`,
            `    <div style="font-size:26px;font-weight:800;color:#be123c;line-height:1.2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${escapeHtml(amount)}</div>`,
            `  </div>`,
          ].join("\n")
        : "",
      `</div>`,
      bankCardHtml,
      `<div style="background:#f4f4f5;border-radius:6px;padding:10px 14px;font-size:13px;color:#52525b;"><span style="display:inline-block;background:#e4e4e7;color:#27272a;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;margin-${ar ? "left" : "right"}:8px;">PDF</span>${escapeHtml(attachmentNote)}</div>`,
    ]
      .filter(Boolean)
      .join("\n"),
    companyName,
  );

  const text = [
    greetingRaw,
    "",
    leadRaw,
    number,
    amountRaw,
    dueRaw,
    bankLine,
  ]
    .filter((line) => line !== "")
    .join("\n");

  return { subject, html, text };
}

function renderInvoiceOverdueReminder(
  locale: Locale,
  payload: Record<string, unknown>,
  companyName: string,
): RenderedEmail {
  const ar = locale === "ar";
  const number = readText(payload, "number");
  const balance = readText(payload, "balanceFormatted");
  const dueDate = readText(payload, "dueDate");
  const bankLine = readText(payload, "bankLine");
  const name = readText(payload, "recipientName");

  const subject = ar
    ? `تذكير: الفاتورة ${number} متأخرة السداد`
    : `Reminder: invoice ${number} is overdue`;

  const greetingRaw = greeting(locale, name);
  const leadRaw = ar
    ? "نود تذكيركم بأن الفاتورة التالية متأخرة السداد."
    : "This is a reminder that the following invoice is overdue.";
  const balanceRaw = balance
    ? ar
      ? `الرصيد المستحق: ${balance}`
      : `Outstanding balance: ${balance}`
    : "";
  const dueRaw = dueDate
    ? ar
      ? `تاريخ الاستحقاق: ${dueDate}`
      : `Due date: ${dueDate}`
    : "";

  const bankCardHtml = renderBankCard(bankLine, locale);

  const html = shell(
    locale,
    [
      `<div style="font-size:16px;font-weight:600;color:#18181b;margin-bottom:12px;">${escapeHtml(greetingRaw)}</div>`,
      `<div style="font-size:14px;color:#e11d48;font-weight:600;margin-bottom:20px;line-height:1.6;"><span style="display:inline-block;background:#fee2e2;color:#991b1b;font-size:11px;font-weight:700;padding:2px 8px;border-radius:4px;margin-${ar ? "left" : "right"}:8px;">${ar ? "تنبيه" : "Alert"}</span>${escapeHtml(leadRaw)}</div>`,
      `<div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:10px;padding:20px;margin-bottom:20px;">`,
      `  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">`,
      `    <tr>`,
      `      <td align="${ar ? "right" : "left"}" style="vertical-align:middle;">`,
      `        <span style="display:inline-block;background:#be123c;color:#ffffff;font-size:13px;font-weight:700;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;padding:5px 12px;border-radius:6px;letter-spacing:0.5px;">${escapeHtml(number)}</span>`,
      `      </td>`,
      dueDate
        ? `      <td align="${ar ? "left" : "right"}" style="vertical-align:middle;font-size:13px;color:#9f1239;">` +
          `        <span>${ar ? "تاريخ الاستحقاق:" : "Due date:"}</span> <strong>${escapeHtml(dueDate)}</strong>` +
          `      </td>`
        : "",
      `    </tr>`,
      `  </table>`,
      balance
        ? [
            `  <div style="background:#ffffff;border:1px solid #fecdd3;border-radius:8px;padding:16px;text-align:${ar ? "right" : "left"};">`,
            `    <div style="font-size:12px;font-weight:700;color:#9f1239;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">${ar ? "الرصيد المستحق للسداد" : "Outstanding Balance Due"}</div>`,
            `    <div style="font-size:26px;font-weight:800;color:#be123c;line-height:1.2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">${escapeHtml(balance)}</div>`,
            `  </div>`,
          ].join("\n")
        : "",
      `</div>`,
      bankCardHtml,
    ]
      .filter(Boolean)
      .join("\n"),
    companyName,
  );

  const text = [
    greetingRaw,
    "",
    leadRaw,
    number,
    balanceRaw,
    dueRaw,
    bankLine,
  ]
    .filter((line) => line !== "")
    .join("\n");

  return { subject, html, text };
}

function renderTestEmail(
  locale: Locale,
  payload: Record<string, unknown>,
  companyName: string,
): RenderedEmail {
  const ar = locale === "ar";
  const name = readText(payload, "recipientName");

  const subject = ar ? "رسالة اختبار من Dossier" : "Dossier test email";
  const greetingRaw = greeting(locale, name);
  const bodyRaw = ar
    ? "هذه رسالة اختبار للتأكد من أن إعداد البريد الإلكتروني (SMTP) يعمل بنجاح."
    : "This is a test email confirming that your email (SMTP) configuration works.";
  const noteRaw = ar
    ? "إذا تلقيت هذه الرسالة، فهذا يعني أن نظام Dossier جاهز لإرسال الفواتير والعقود للعملاء."
    : "If you received this email, the Dossier system is configured and ready to send invoices and contracts.";

  const html = shell(
    locale,
    [
      `<div style="font-size:16px;font-weight:600;color:#18181b;margin-bottom:12px;">${escapeHtml(greetingRaw)}</div>`,
      `<div style="display:inline-block;background:#f0fdf4;border:1px solid #bbf7d0;color:#166534;font-size:13px;font-weight:600;padding:6px 12px;border-radius:6px;margin-bottom:16px;"><span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#16a34a;margin-${ar ? "left" : "right"}:8px;vertical-align:middle;"></span>${escapeHtml(bodyRaw)}</div>`,
      `<div style="background:#fcfcfc;border:1px solid #e4e4e7;border-radius:8px;padding:16px;color:#52525b;font-size:13px;line-height:1.6;">${escapeHtml(noteRaw)}</div>`,
    ].join("\n"),
    companyName,
  );

  const text = [greetingRaw, "", bodyRaw].join("\n");

  return { subject, html, text };
}

export function renderEmail(
  templateKey: EmailTemplateKey,
  locale: Locale,
  payload: Record<string, unknown>,
  companyName: string,
): RenderedEmail {
  switch (templateKey) {
    case "contract_signing_link":
      return renderSigningLink(locale, payload, companyName);
    case "contract_otp":
      return renderOtp(locale, payload, companyName);
    case "contract_signed_copy":
      return renderSignedCopy(locale, payload, companyName);
    case "contract_declined_notice":
      return renderDeclinedNotice(locale, payload, companyName);
    case "invoice_issued":
      return renderInvoiceIssued(locale, payload, companyName);
    case "invoice_overdue_reminder":
      return renderInvoiceOverdueReminder(locale, payload, companyName);
    case "test_email":
      return renderTestEmail(locale, payload, companyName);
    default:
      throw new AppError(
        "EMAIL_FAILED",
        `Email template not implemented: ${templateKey}`,
      );
  }
}
