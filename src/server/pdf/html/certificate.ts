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

// 12.7 — appended to the sealed contract (break-before: page).
export function renderCertificateSection(
  ctx: CertificateContext,
  cert: CertificateData,
  lang: DocLang,
): string {
  const showEn = lang !== "ar";
  const showAr = lang !== "en";

  const titleCell =
    lang === "bilingual"
      ? `Certificate of Completion / <span class="ar" dir="rtl">شهادة إتمام التوقيع</span>`
      : lang === "ar"
        ? "شهادة إتمام التوقيع"
        : "Certificate of Completion";

  const infoRows = [
    ["Contract number / رقم العقد", esc(ctx.number ?? "—")],
    ["Title / العنوان", esc((showAr ? ctx.titleAr : ctx.titleEn) ?? "")],
    ["Version / الإصدار", num(String(ctx.versionNo))],
    ["Project / المشروع", esc(ctx.projectCode)],
  ]
    .map(([label, value]) => `<tr><th>${esc(label)}</th><td>${value}</td></tr>`)
    .join("");

  const verificationBlock = ctx.verification
    ? `<table><tbody><tr class="block-row"><td class="divider">
        <img class="qr" src="${esc(ctx.verification.qrDataUri)}" alt="QR" />
      </td><td>
        <p><strong>Verification code / رمز التحقق:</strong> ${num(formatCode(ctx.verification.code))}</p>
        <p class="muted" dir="ltr">${esc(ctx.verification.url)}</p>
        <p class="hash">SHA-256 (content): ${esc(cert.contentHash)}</p>
      </td></tr></tbody></table>`
    : "";

  const signatoryRows = cert.signatories
    .map((s) => {
      const roleEn = s.role === "provider" ? "Provider" : "Client";
      const roleAr = s.role === "provider" ? "المزوّد" : "العميل";
      const signedAt =
        s.signedAtMs !== null
          ? `${utcStamp(s.signedAtMs)} UTC<br><span class="muted">${esc(
              tzStamp(s.signedAtMs, cert.timezone),
            )} ${esc(cert.timezone)}</span>`
          : "—";
      const userAgent = s.userAgent ? s.userAgent.slice(0, 120) : "";
      return `<tr><td>${esc(roleEn)} / <span class="ar" dir="rtl">${esc(
        roleAr,
      )}</span></td><td>${esc(s.name)}${
        s.title ? `<br><span class="muted">${esc(s.title)}</span>` : ""
      }</td><td dir="ltr">${esc(s.email ?? "—")}</td><td>${esc(
        s.method ?? "—",
      )}</td><td>${signedAt}</td><td dir="ltr">${esc(
        s.ip ?? "—",
      )}</td><td>${s.otpVerified ? "Yes / نعم" : "No / لا"}</td><td class="muted" dir="ltr">${esc(
        userAgent,
      )}</td></tr>`;
    })
    .join("");

  const statementEn =
    "This certificate summarizes the evidence recorded by Dossier when this document was signed electronically. The document hash above covers the exact content that was signed.";
  const statementAr =
    "تلخّص هذه الشهادة الأدلة التي سجّلتها منصة Dossier عند توقيع هذا المستند إلكترونياً. ويغطي تجزئة المحتوى أعلاه المحتوى الموقّع بالضبط.";

  return `<section class="cert">
<h1>${titleCell}</h1>
<table><tbody>${infoRows}</tbody></table>
${verificationBlock}
<h2 class="clause">Signatories / <span class="ar" dir="rtl">الموقّعون</span></h2>
<table><thead><tr><th>Role / <span class="ar" dir="rtl">الصفة</span></th><th>Name / <span class="ar" dir="rtl">الاسم</span></th><th>Email / <span class="ar" dir="rtl">البريد</span></th><th>Method / <span class="ar" dir="rtl">الطريقة</span></th><th>Signed at / <span class="ar" dir="rtl">وقت التوقيع</span></th><th>IP</th><th>OTP</th><th>User agent</th></tr></thead><tbody>${signatoryRows}</tbody></table>
<p class="muted">${showEn ? esc(statementEn) : ""}${showEn && showAr ? "<br>" : ""}${showAr ? `<span class="ar" dir="rtl">${esc(statementAr)}</span>` : ""}</p>
<p class="muted">Generated at ${esc(utcStamp(cert.generatedAtMs))} UTC</p>
</section>`;
}
