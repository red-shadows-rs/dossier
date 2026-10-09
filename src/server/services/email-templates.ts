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
  if (locale === "ar") return name ? `مرحباً ${name}،` : "مرحباً،";
  return name ? `Hello ${name},` : "Hello,";
}

function shell(
  locale: Locale,
  inner: string,
  companyName: string,
): string {
  const dir = locale === "ar" ? "rtl" : "ltr";
  const align = locale === "ar" ? "right" : "left";
  const footer =
    locale === "ar"
      ? `أُرسلت من ${escapeHtml(companyName)}`
      : `Sent by ${escapeHtml(companyName)}`;
  return `<!doctype html>
<html dir="${dir}" lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(companyName)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:8px;overflow:hidden;">
<tr><td style="padding:32px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.7;color:#18181b;direction:${dir};text-align:${align};">
${inner}
</td></tr>
<tr><td style="padding:16px 32px;border-top:1px solid #e4e4e7;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#71717a;direction:${dir};text-align:${align};">
${footer}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function button(url: string, label: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0;"><tr><td style="border-radius:6px;background:#18181b;">
<a href="${escapeHtml(url)}" style="display:inline-block;padding:12px 24px;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a>
</td></tr></table>`;
}

function codeBlock(code: string): string {
  return `<p style="margin:16px 0;font-family:'Courier New',monospace;font-size:28px;font-weight:bold;letter-spacing:6px;">${escapeHtml(code)}</p>`;
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
    ? `${companyName} أرسل إليك عقداً للمراجعة والتوقيع.`
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
      `<p style="margin:0 0 16px;">${escapeHtml(greetingRaw)}</p>`,
      `<p style="margin:0 0 16px;">${escapeHtml(leadRaw)}</p>`,
      `<p style="margin:0 0 8px;font-weight:bold;">${escapeHtml(title)} (${escapeHtml(number)})</p>`,
      button(url, ar ? "المراجعة والتوقيع" : "Review and sign"),
      validRaw
        ? `<p style="margin:0 0 8px;color:#71717a;font-size:13px;">${escapeHtml(validRaw)}</p>`
        : "",
      `<p style="margin:0;color:#71717a;font-size:13px;">${escapeHtml(ignoreRaw)}</p>`,
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

  const html = shell(
    locale,
    [
      `<p style="margin:0 0 16px;">${escapeHtml(greetingRaw)}</p>`,
      `<p style="margin:0 0 8px;">${escapeHtml(leadRaw)}</p>`,
      codeBlock(otp),
      `<p style="margin:0 0 8px;color:#71717a;font-size:13px;">${escapeHtml(expiresRaw)}</p>`,
      `<p style="margin:0;color:#71717a;font-size:13px;">${escapeHtml(shareRaw)}</p>`,
    ].join("\n"),
    companyName,
  );

  const text = [greetingRaw, "", leadRaw, otp, expiresRaw, shareRaw].join("\n");

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
    ? `العقد الموقّع ${number}`
    : `Signed contract ${number}`;

  const greetingRaw = greeting(locale, name);
  const leadRaw = ar
    ? "وقّع جميع الأطراف على العقد. تجد النسخة الموقّعة مرفقة بهذا البريد."
    : "All parties have signed the contract. The signed copy is attached to this email.";
  const verifyRaw = code
    ? ar
      ? `رمز التحقق: ${code}`
      : `Verification code: ${code}`
    : "";

  const html = shell(
    locale,
    [
      `<p style="margin:0 0 16px;">${escapeHtml(greetingRaw)}</p>`,
      `<p style="margin:0 0 16px;">${escapeHtml(leadRaw)}</p>`,
      `<p style="margin:0 0 8px;font-weight:bold;">${escapeHtml(title)} (${escapeHtml(number)})</p>`,
      verifyRaw
        ? `<p style="margin:0 0 8px;color:#71717a;font-size:13px;">${escapeHtml(verifyRaw)}</p>`
        : "",
      url
        ? `<p style="margin:0;color:#71717a;font-size:13px;" dir="ltr">${escapeHtml(url)}</p>`
        : "",
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
      `<p style="margin:0 0 16px;">${escapeHtml(greetingRaw)}</p>`,
      `<p style="margin:0 0 8px;font-weight:bold;">${escapeHtml(title)} (${escapeHtml(number)})</p>`,
      `<p style="margin:0 0 8px;">${escapeHtml(whoRaw)}</p>`,
      reasonRaw
        ? `<p style="margin:0;color:#71717a;font-size:13px;">${escapeHtml(reasonRaw)}</p>`
        : "",
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
    ? "تجد مرفقاً فاتورة جديدة."
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

  const html = shell(
    locale,
    [
      `<p style="margin:0 0 16px;">${escapeHtml(greetingRaw)}</p>`,
      `<p style="margin:0 0 8px;">${escapeHtml(leadRaw)}</p>`,
      `<p style="margin:0 0 8px;font-weight:bold;">${escapeHtml(number)}</p>`,
      amountRaw
        ? `<p style="margin:0 0 8px;">${escapeHtml(amountRaw)}</p>`
        : "",
      dueRaw
        ? `<p style="margin:0 0 8px;">${escapeHtml(dueRaw)}</p>`
        : "",
      bankLine
        ? `<p style="margin:0;color:#71717a;font-size:13px;">${escapeHtml(bankLine)}</p>`
        : "",
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
  const name = readText(payload, "recipientName");

  const subject = ar
    ? `تذكير: الفاتورة ${number} متأخرة السداد`
    : `Reminder: invoice ${number} is overdue`;

  const greetingRaw = greeting(locale, name);
  const leadRaw = ar
    ? "نودّ تذكيركم بأن الفاتورة التالية متأخرة السداد."
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

  const html = shell(
    locale,
    [
      `<p style="margin:0 0 16px;">${escapeHtml(greetingRaw)}</p>`,
      `<p style="margin:0 0 8px;">${escapeHtml(leadRaw)}</p>`,
      `<p style="margin:0 0 8px;font-weight:bold;">${escapeHtml(number)}</p>`,
      balanceRaw
        ? `<p style="margin:0 0 8px;">${escapeHtml(balanceRaw)}</p>`
        : "",
      dueRaw
        ? `<p style="margin:0;color:#71717a;font-size:13px;">${escapeHtml(dueRaw)}</p>`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
    companyName,
  );

  const text = [greetingRaw, "", leadRaw, number, balanceRaw, dueRaw]
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

  const html = shell(
    locale,
    [
      `<p style="margin:0 0 16px;">${escapeHtml(greetingRaw)}</p>`,
      `<p style="margin:0;">${escapeHtml(bodyRaw)}</p>`,
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
