// Dossier - Certificate Module
// https://github.com/red-shadows-rs/dossier

import { formatCode } from "@/lib/ids";
import { esc, num, type DocLang } from "./shared";

export type CertificateSignatory = {
  role: "provider" | "client";
  name: string;
  title: string | null;
  email: string | null;
  method: "drawn" | "typed" | null;
  signedAtMs: number | null;
  ip: string | null;
  otpVerified: boolean;
  userAgent: string | null;
};

export type CertificateData = {
  contentHash: string;
  generatedAtMs: number;
  timezone: string;
  signatories: CertificateSignatory[];
};

export type CertificateContext = {
  number: string | null;
  titleEn: string | null;
  titleAr: string | null;
  versionNo: number;
  projectCode: string;
  verification: { code: string; url: string; qrDataUri: string } | null;
};

function utcStamp(ms: number): string {
  return new Date(ms).toISOString().replace("T", " ").slice(0, 19);
}

function tzStamp(ms: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(ms));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

export function renderCertificateSection(
  ctx: CertificateContext,
  cert: CertificateData,
  lang: DocLang,
): string {
  const isArabic = lang !== "en";
  const statementEn =
    "This certificate summarizes the evidence recorded by Dossier when this document was signed electronically. The document hash above covers the exact content that was signed.";
  const statementAr =
    "توثق هذه الشهادة بيانات التوقيع الإلكتروني المسجلة في منصة Dossier، وتطابق البصمة الرقمية أعلاه محتوى المستند الموقع.";

  function infoTable(targetLang: "ar" | "en"): string {
    const isAr = targetLang === "ar";
    const rows = [
      [isAr ? "رقم العقد" : "Contract number", `<span dir="ltr">${esc(ctx.number ?? "—")}</span>`],
      [
        isAr ? "العنوان" : "Title",
        esc((isAr ? ctx.titleAr || ctx.titleEn : ctx.titleEn || ctx.titleAr) ?? ""),
      ],
      [isAr ? "الإصدار" : "Version", num(String(ctx.versionNo))],
      [isAr ? "المشروع" : "Project", `<span dir="ltr">${esc(ctx.projectCode)}</span>`],
    ];
    const body = rows
      .map(
        ([lbl, val]) =>
          `<tr><th style="width: 25%; text-align: start;">${lbl}</th><td style="text-align: start;">${val}</td></tr>`,
      )
      .join("");
    return `<table class="cert-table"><tbody>${body}</tbody></table>`;
  }

  function signatoriesTable(targetLang: "ar" | "en"): string {
    const isAr = targetLang === "ar";
    const thRole = isAr ? "الصفة" : "Role";
    const thName = isAr ? "الاسم" : "Name";
    const thEmail = isAr ? "البريد الإلكتروني" : "Email";
    const thMethod = isAr ? "طريقة التوقيع" : "Method";
    const thSignedAt = isAr ? "تاريخ ووقت التوقيع" : "Signed at";
    const thIp = isAr ? "عنوان IP" : "IP Address";
    const thOtp = isAr ? "رمز التحقق (OTP)" : "OTP";

    const rows = cert.signatories
      .map((s) => {
        const role =
          s.role === "provider"
            ? isAr
              ? "مزود الخدمة"
              : "Provider"
            : isAr
              ? "العميل"
              : "Client";
        const methodText =
          s.method === "drawn"
            ? isAr
              ? "رسم يدوي"
              : "Drawn"
            : s.method === "typed"
              ? isAr
                ? "نصي"
                : "Typed"
              : "—";
        const signedAt =
          s.signedAtMs !== null
            ? `<div style="white-space: nowrap; font-size: 7pt;"><span dir="ltr">${utcStamp(s.signedAtMs)}</span> <span class="muted">UTC</span></div><div class="muted" style="font-size: 6.6pt; white-space: nowrap;"><span dir="ltr">${esc(
                tzStamp(s.signedAtMs, cert.timezone),
              )}</span> <span dir="ltr">(${esc(cert.timezone)})</span></div>`
            : "—";
        const otpText = s.otpVerified
          ? isAr
            ? "نعم"
            : "Yes"
          : isAr
            ? "لا"
            : "No";
        const displayTitle =
          s.title &&
          s.title.trim() !== "العميل" &&
          s.title.trim().toLowerCase() !== "client" &&
          s.title.trim() !== role
            ? s.title
            : null;
        return `<tr>
          <td class="cert-col-role"><strong>${esc(role)}</strong></td>
          <td class="cert-col-name">${esc(s.name)}${displayTitle ? `<br><span class="muted">${esc(displayTitle)}</span>` : ""}</td>
          <td class="cert-col-email" style="font-size: 7.2pt;"><span dir="ltr">${esc(s.email ?? "—")}</span></td>
          <td class="cert-col-method">${esc(methodText)}</td>
          <td class="cert-col-signed">${signedAt}</td>
          <td class="cert-col-ip" style="font-size: 7.2pt;"><span dir="ltr" style="white-space: nowrap;">${esc(s.ip ?? "—")}</span></td>
          <td class="cert-col-otp">${otpText}</td>
        </tr>`;
      })
      .join("");

    return `
      <table class="cert-table">
        <thead>
          <tr>
            <th class="cert-col-role">${thRole}</th>
            <th class="cert-col-name">${thName}</th>
            <th class="cert-col-email">${thEmail}</th>
            <th class="cert-col-method">${thMethod}</th>
            <th class="cert-col-signed">${thSignedAt}</th>
            <th class="cert-col-ip">${thIp}</th>
            <th class="cert-col-otp">${thOtp}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  const verificationBlock = ctx.verification
    ? `
      <div class="verify" style="margin: 2mm 0 3mm;">
        <table style="width: 100%; border: none;">
          <tbody>
            <tr>
              <td style="width: 26mm; vertical-align: middle; border: none; padding-inline-end: 4mm;">
                <img class="qr" src="${esc(ctx.verification.qrDataUri)}" alt="QR" />
              </td>
              <td style="vertical-align: middle; border: none; text-align: start;">
                <div class="verify-badge">${isArabic ? "التحقق الرقمي المشفر" : "CRYPTOGRAPHIC VERIFICATION"}</div>
                <div style="margin: 0 0 1mm; font-size: 7.5pt; display: flex; align-items: center; gap: 4px;">
                  <span><strong>${isArabic ? "رمز التحقق:" : "Verification code:"}</strong></span>
                  <span dir="ltr" style="font-family: monospace; font-weight: 700;">${num(
                    formatCode(ctx.verification.code),
                  )}</span>
                </div>
                <div class="muted" style="margin: 0 0 1mm; font-size: 7.2pt; text-align: start;">
                  <span dir="ltr">${esc(ctx.verification.url)}</span>
                </div>
                <div class="hash" style="margin: 0; font-size: 6.8pt; display: flex; align-items: center; gap: 4px;">
                  <span>${isArabic ? "البصمة الرقمية (SHA-256):" : "SHA-256:"}</span>
                  <span dir="ltr" style="font-family: monospace;">${esc(cert.contentHash)}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `
    : "";

  const title = isArabic ? "شهادة إتمام التوقيع" : "Certificate of Completion";
  const statement = isArabic ? statementAr : statementEn;
  const genStamp = isArabic
    ? `تم إصدار الشهادة في <span dir="ltr">${esc(utcStamp(cert.generatedAtMs))}</span> UTC`
    : `Generated at ${esc(utcStamp(cert.generatedAtMs))} UTC`;

  return `
    <section class="cert" dir="${isArabic ? "rtl" : "ltr"}">
      <h1 style="font-size: 13pt; margin: 1mm 0 2mm;">${title}</h1>
      ${infoTable(isArabic ? "ar" : "en")}
      ${verificationBlock}
      ${signatoriesTable(isArabic ? "ar" : "en")}
      <p class="muted" style="margin-top: 2.5mm;">${esc(statement)}</p>
      <p class="muted" style="margin-top: 1mm;">${genStamp}</p>
    </section>
  `;
}
