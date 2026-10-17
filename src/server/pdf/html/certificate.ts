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
  const statementEn =
    "This certificate summarizes the evidence recorded by Dossier when this document was signed electronically. The document hash above covers the exact content that was signed.";
  const statementAr =
    "توثق هذه الشهادة بيانات التوقيع الإلكتروني المسجلة في منصة Dossier، وتطابق البصمة الرقمية أعلاه محتوى المستند الموقع.";

  function infoTable(targetLang: "ar" | "en"): string {
    const isArabic = targetLang === "ar";
    const rows = [
      [isArabic ? "رقم العقد" : "Contract number", esc(ctx.number ?? "—")],
      [
        isArabic ? "العنوان" : "Title",
        esc((isArabic ? ctx.titleAr || ctx.titleEn : ctx.titleEn || ctx.titleAr) ?? ""),
      ],
      [isArabic ? "الإصدار" : "Version", num(String(ctx.versionNo))],
      [isArabic ? "المشروع" : "Project", esc(ctx.projectCode)],
    ];
    const body = rows
      .map(
        ([lbl, val]) =>
          `<tr><th style="width: 35%;">${lbl}</th><td>${val}</td></tr>`,
      )
      .join("");
    return `<table class="contract-table"><tbody>${body}</tbody></table>`;
  }

  function signatoriesTable(targetLang: "ar" | "en"): string {
    const isArabic = targetLang === "ar";
    const thRole = isArabic ? "الصفة" : "Role";
    const thName = isArabic ? "الاسم" : "Name";
    const thEmail = isArabic ? "البريد" : "Email";
    const thMethod = isArabic ? "الطريقة" : "Method";
    const thSignedAt = isArabic ? "وقت التوقيع" : "Signed at";
    const thIp = "IP";
    const thOtp = "OTP";

    const rows = cert.signatories
      .map((s) => {
        const role =
          s.role === "provider"
            ? isArabic
              ? "مزود الخدمة"
              : "Provider"
            : isArabic
              ? "العميل"
              : "Client";
        const signedAt =
          s.signedAtMs !== null
            ? `${utcStamp(s.signedAtMs)} UTC<br><span class="muted" style="font-size: 6.8pt;">${esc(
                tzStamp(s.signedAtMs, cert.timezone),
              )} ${esc(cert.timezone)}</span>`
            : "—";
        const otpText = s.otpVerified
          ? isArabic
            ? "نعم"
            : "Yes"
          : isArabic
            ? "لا"
            : "No";
        return `<tr>
          <td><strong>${esc(role)}</strong></td>
          <td>${esc(s.name)}${s.title ? `<br><span class="muted">${esc(s.title)}</span>` : ""}</td>
          <td dir="ltr" style="font-size: 7.2pt;">${esc(s.email ?? "—")}</td>
          <td>${esc(s.method ?? "—")}</td>
          <td>${signedAt}</td>
          <td dir="ltr" style="font-size: 7.2pt;">${esc(s.ip ?? "—")}</td>
          <td>${otpText}</td>
        </tr>`;
      })
      .join("");

    return `
      <table class="contract-table">
        <thead>
          <tr>
            <th>${thRole}</th>
            <th>${thName}</th>
            <th>${thEmail}</th>
            <th>${thMethod}</th>
            <th>${thSignedAt}</th>
            <th>${thIp}</th>
            <th>${thOtp}</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  const verificationBlock = ctx.verification
    ? `
      <div class="verify" style="margin: 3mm 0 4mm;">
        <table style="width: 100%; border: none;">
          <tbody>
            <tr>
              <td style="width: 26mm; vertical-align: middle; border: none; padding-inline-end: 4mm;">
                <img class="qr" src="${esc(ctx.verification.qrDataUri)}" alt="QR" />
              </td>
              <td style="vertical-align: middle; border: none;">
                <div class="verify-badge">CRYPTOGRAPHIC VERIFICATION</div>
                <p style="margin: 0 0 1mm;"><strong>Verification code / رمز التحقق:</strong> ${num(
                  formatCode(ctx.verification.code),
                )}</p>
                <p class="muted" dir="ltr" style="margin: 0 0 1mm; font-size: 7.2pt;">${esc(
                  ctx.verification.url,
                )}</p>
                <p class="hash" style="margin: 0;">SHA-256: ${esc(cert.contentHash)}</p>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    `
    : "";

  if (lang === "bilingual") {
    return `
      <section class="cert">
        <table class="bilingual-clause" style="margin: 0; border: none;">
          <tbody>
            <tr>
              <td class="col-en divider" dir="ltr" style="width: 50%; vertical-align: top; border-bottom: none;">
                <div class="doc-badge">AUTHENTICATION CERTIFICATE</div>
                <h1 style="font-size: 13pt; margin: 1mm 0 2mm;">Certificate of Completion</h1>
                ${infoTable("en")}
              </td>
              <td class="col-ar" dir="rtl" style="width: 50%; vertical-align: top; border-bottom: none;">
                <div class="doc-badge">شهادة إثبات التوثيق</div>
                <h1 style="font-size: 13pt; margin: 1mm 0 2mm;">شهادة إتمام التوقيع</h1>
                ${infoTable("ar")}
              </td>
            </tr>
          </tbody>
        </table>

        ${verificationBlock}

        <div style="margin: 3mm 0;">
          <table class="bilingual-clause" style="margin: 0; border: none;">
            <tbody>
              <tr>
                <td class="col-en divider" dir="ltr" style="width: 50%; vertical-align: top; border-bottom: none;">
                  <div class="section-badge">SIGNATORIES & EVIDENCE</div>
                  ${signatoriesTable("en")}
                  <p class="muted" style="margin-top: 2mm;">${esc(statementEn)}</p>
                </td>
                <td class="col-ar" dir="rtl" style="width: 50%; vertical-align: top; border-bottom: none;">
                  <div class="section-badge">سجل الموقعين والأدلة</div>
                  ${signatoriesTable("ar")}
                  <p class="muted" style="margin-top: 2mm;">${esc(statementAr)}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="muted" style="text-align: center; margin-top: 3mm;">Generated at ${esc(
          utcStamp(cert.generatedAtMs),
        )} UTC</p>
      </section>
    `;
  }

  const isArabic = lang === "ar";
  const title = isArabic ? "شهادة إتمام التوقيع" : "Certificate of Completion";
  const badge = isArabic ? "شهادة إثبات التوثيق" : "AUTHENTICATION CERTIFICATE";
  const sigHeading = isArabic ? "سجل الموقعين والأدلة" : "SIGNATORIES & EVIDENCE";
  const statement = isArabic ? statementAr : statementEn;

  return `
    <section class="cert" dir="${isArabic ? "rtl" : "ltr"}">
      <div class="doc-badge">${badge}</div>
      <h1 style="font-size: 14pt; margin: 1mm 0 2mm;">${title}</h1>
      ${infoTable(isArabic ? "ar" : "en")}
      ${verificationBlock}
      <div class="section-badge" style="margin-top: 4mm;">${sigHeading}</div>
      ${signatoriesTable(isArabic ? "ar" : "en")}
      <p class="muted" style="margin-top: 3mm;">${esc(statement)}</p>
      <p class="muted">Generated at ${esc(utcStamp(cert.generatedAtMs))} UTC</p>
    </section>
  `;
}
