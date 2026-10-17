import type { Locale } from "@/lib/constants";
import { formatDateLong } from "@/lib/dates";
import {
  numberedParagraphLabels,
  parseBody,
  renderInline,
  type Block,
  type SpecialBlockName,
} from "@/server/templating/render-body";
import {
  buildVariableMap,
  type ContractSnapshotV1,
} from "@/server/templating/variables";
import { renderCertificateSection, type CertificateData } from "./certificate";
import { renderCode39Svg } from "@/server/pdf/qr";
import {
  docDir,
  documentShell,
  esc,
  isRtl,
  num,
  renderPartiesBlock,
  renderPaymentScheduleBlock,
  renderPricingTableBlock,
  renderSignaturesBlock,
  type DocLang,
  type SignatureRender,
} from "./shared";

export type ContractHtmlInput = {
  snapshot: ContractSnapshotV1;
  lang: DocLang;
  mode: "draft" | "preview" | "unsigned" | "sealed";
  fonts: string;
  logoDataUri: string | null;
  stampDataUri: string | null;
  signatures: SignatureRender[];
  verification: { code: string; url: string; qrDataUri: string } | null;
  certificate: CertificateData | null;
};

function renderSpecial(
  name: SpecialBlockName,
  snapshot: ContractSnapshotV1,
  lang: DocLang,
  signatures: SignatureRender[],
  stampDataUri: string | null,
): string {
  switch (name) {
    case "parties":
      return renderPartiesBlock(snapshot, lang);
    case "pricing_table":
      return renderPricingTableBlock(snapshot, lang);
    case "payment_schedule":
      return renderPaymentScheduleBlock(snapshot, lang);
    case "signatures":
      return renderSignaturesBlock(signatures, stampDataUri, lang);
  }
}

function renderBlockHtml(
  block: Block,
  vars: Record<string, string>,
  clausePosition: number,
  labels: string[],
  labelIndex: { value: number },
  snapshot: ContractSnapshotV1,
  lang: DocLang,
  signatures: SignatureRender[],
  stampDataUri: string | null,
): string {
  switch (block.type) {
    case "paragraph": {
      const inner = renderInline(block.text, vars, () => {});
      if (!block.numbered) return `<p class="note">${inner}</p>`;
      const label = labels[labelIndex.value] ?? "";
      labelIndex.value += 1;
      return `<p><span class="clause-num">${esc(label)}</span> ${inner}</p>`;
    }
    case "bullets": {
      const items = block.items
        .map((item) => `<li>${renderInline(item, vars, () => {})}</li>`)
        .join("");
      return `<ul>${items}</ul>`;
    }
    case "special":
      return `<div class="block-row">${renderSpecial(
        block.name,
        snapshot,
        lang,
        signatures,
        stampDataUri,
      )}</div>`;
  }
  void clausePosition;
}

function renderClauseSingle(
  clause: ContractSnapshotV1["clauses"][number],
  snapshot: ContractSnapshotV1,
  lang: "ar" | "en",
  signatures: SignatureRender[],
  stampDataUri: string | null,
): string {
  const vars = buildVariableMap(snapshot, lang);
  const title = lang === "ar" ? clause.titleAr : clause.titleEn;
  const body = lang === "ar" ? clause.bodyAr : clause.bodyEn;
  const badgeLabel =
    lang === "ar"
      ? `المادة (${clause.position})`
      : `Article ${clause.position} —`;
  const blocks = parseBody(body);
  const labels = numberedParagraphLabels(clause.position, blocks);
  const labelIndex = { value: 0 };
  const inner = blocks
    .map((block) =>
      renderBlockHtml(
        block,
        vars,
        clause.position,
        labels,
        labelIndex,
        snapshot,
        lang,
        signatures,
        stampDataUri,
      ),
    )
    .join("");
  return `<section class="contract-single-clause" dir="${docDir(lang)}"><div class="article-header"><span class="article-badge">${esc(badgeLabel)}</span> <span class="article-title">${esc(title)}</span></div><div class="clause-body-single">${inner}</div></section>`;
}

type Segment =
  | { kind: "text"; blocks: Block[] }
  | { kind: "special"; name: SpecialBlockName };

function segmentBlocks(blocks: Block[]): Segment[] {
  const segments: Segment[] = [];
  let current: Block[] = [];
  const flush = () => {
    if (current.length > 0) {
      segments.push({ kind: "text", blocks: current });
      current = [];
    }
  };
  for (const block of blocks) {
    if (block.type === "special") {
      flush();
      segments.push({ kind: "special", name: block.name });
    } else {
      current.push(block);
    }
  }
  flush();
  return segments;
}

function renderTextBlocks(
  blocks: Block[],
  vars: Record<string, string>,
  clausePosition: number,
): string {
  const labels = numberedParagraphLabels(clausePosition, blocks);
  const labelIndex = { value: 0 };
  return blocks
    .map((block) => {
      if (block.type === "special") return "";
      if (block.type === "paragraph") {
        const inner = renderInline(block.text, vars, () => {});
        if (!block.numbered) return `<p class="note">${inner}</p>`;
        const label = labels[labelIndex.value] ?? "";
        labelIndex.value += 1;
        return `<p><span class="clause-num">${esc(label)}</span> ${inner}</p>`;
      }
      const items = block.items
        .map((item) => `<li>${renderInline(item, vars, () => {})}</li>`)
        .join("");
      return `<ul>${items}</ul>`;
    })
    .join("");
}

function renderClauseBilingual(
  clause: ContractSnapshotV1["clauses"][number],
  snapshot: ContractSnapshotV1,
  signatures: SignatureRender[],
  stampDataUri: string | null,
): string {
  const enVars = buildVariableMap(snapshot, "en");
  const arVars = buildVariableMap(snapshot, "ar");
  const enBlocks = parseBody(clause.bodyEn);
  const arBlocks = parseBody(clause.bodyAr);
  const enSegments = segmentBlocks(enBlocks);
  const arSegments = segmentBlocks(arBlocks);

  const rows: string[] = [];
  rows.push(
    `<tr class="clause-heading-row"><th class="col-en divider" dir="ltr" style="width: 50%;"><div class="article-header"><span class="article-badge">Article ${clause.position} —</span> <span class="article-title">${esc(clause.titleEn)}</span></div></th><th class="col-ar" dir="rtl" style="width: 50%;"><div class="article-header"><span class="article-badge">المادة (${clause.position}):</span> <span class="article-title">${esc(clause.titleAr)}</span></div></th></tr>`,
  );

  const count = Math.max(enSegments.length, arSegments.length);
  for (let i = 0; i < count; i += 1) {
    const enSeg = enSegments[i];
    const arSeg = arSegments[i];
    if (enSeg?.kind === "special" || arSeg?.kind === "special") {
      const name =
        enSeg?.kind === "special"
          ? enSeg.name
          : arSeg?.kind === "special"
            ? arSeg.name
            : "parties";
      rows.push(
        `<tr class="block-row"><td colspan="2" style="padding: 2mm 0; border: none;">${renderSpecial(
          name,
          snapshot,
          "bilingual",
          signatures,
          stampDataUri,
        )}</td></tr>`,
      );
      continue;
    }
    const enHtml = enSeg
      ? renderTextBlocks(enSeg.blocks, enVars, clause.position)
      : "";
    const arHtml = arSeg
      ? renderTextBlocks(arSeg.blocks, arVars, clause.position)
      : "";
    rows.push(
      `<tr class="clause-body-row"><td class="col-en divider" dir="ltr" style="width: 50%; vertical-align: top;">${enHtml}</td><td class="col-ar" dir="rtl" style="width: 50%; vertical-align: top;">${arHtml}</td></tr>`,
    );
  }

  const clauseClass = clause.key ? ` clause-${clause.key}` : "";
  return `<table class="bilingual-clause${clauseClass}"><tbody>${rows.join("")}</tbody></table>`;
}

function renderHeroHeader(
  snapshot: ContractSnapshotV1,
  lang: DocLang,
  logoDataUri: string | null,
): string {
  const c = snapshot.contract;
  const p = snapshot.provider;
  const isRtlDoc = isRtl(lang);
  const docNumber = c.number ?? "DRAFT";
  const uiLocale = lang === "ar" ? "ar" : "en";
  const issueDateFormatted = c.issueDate
    ? esc(formatDateLong(c.issueDate, uiLocale))
    : "—";
  const startDateFormatted = c.startDate
    ? esc(formatDateLong(c.startDate, uiLocale))
    : "—";
  const endDateFormatted = c.endDate
    ? esc(formatDateLong(c.endDate, uiLocale))
    : "—";

  const contractTitleAr = c.titleAr || c.titleEn || "عقد اتفاق";
  const contractTitleEn = c.titleEn || c.titleAr || "CONTRACT AGREEMENT";

  let titleHtml = "";
  let subtitleHtml = "";
  if (lang === "ar") {
    titleHtml = esc(contractTitleAr);
    subtitleHtml = "";
  } else if (lang === "en") {
    titleHtml = esc(contractTitleEn);
    subtitleHtml = "";
  } else {
    // Bilingual: secondary language title if different from primary title
    titleHtml = esc(contractTitleAr);
    subtitleHtml =
      contractTitleEn && contractTitleEn !== contractTitleAr
        ? `<div class="sub-title">${esc(contractTitleEn)}</div>`
        : "";
  }

  const providerName =
    lang === "ar"
      ? (p.nameAr || p.nameEn || "")
      : (p.nameEn || p.nameAr || "");
  const providerLegal =
    lang === "ar"
      ? (p.legalNameAr || p.legalNameEn || "")
      : (p.legalNameEn || p.legalNameAr || "");
  const address =
    lang === "ar"
      ? (p.addressAr || p.addressEn || "")
      : (p.addressEn || p.addressAr || "");

  const providerLines: string[] = [];
  if (address) providerLines.push(`<div>${esc(address)}</div>`);
  const contact: string[] = [];
  if (p.phone) contact.push(`<span dir="ltr">${esc(p.phone)}</span>`);
  if (p.email) contact.push(`<span dir="ltr">${esc(p.email)}</span>`);
  if (contact.length > 0) providerLines.push(`<div>${contact.join(" · ")}</div>`);
  const crVat: string[] = [];
  if (p.crNumber) crVat.push(lang === "ar" ? `س.ت: ${esc(p.crNumber)}` : `CR: ${esc(p.crNumber)}`);
  if (p.taxNumber) crVat.push(lang === "ar" ? `ض.ر: ${esc(p.taxNumber)}` : `VAT: ${esc(p.taxNumber)}`);
  if (crVat.length > 0) providerLines.push(`<div>${crVat.join(" · ")}</div>`);

  const brandSubHtml =
    providerLegal && providerLegal !== providerName
      ? `<div class="brand-sub">${esc(providerLegal)}</div>`
      : "";

  const brandMarkSvg = logoDataUri
    ? `
      <div class="brand-box">
        <div class="brand-text-col">
          <div class="brand-name">${esc(providerName)}</div>
          ${brandSubHtml}
        </div>
        <div class="brand-logo-frame">
          <img class="brand-logo-img" src="${esc(logoDataUri)}" alt="${esc(providerName)}" />
        </div>
      </div>
    `
    : `
      <div class="brand-box">
        <div class="brand-text-col">
          <div class="brand-name">${esc(providerName)}</div>
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

  const lblNo =
    lang === "ar"
      ? "رقم العقد"
      : lang === "bilingual"
        ? '<span dir="ltr">Contract No</span> / <span dir="rtl">رقم العقد</span>'
        : "Contract No";
  const lblIssue =
    lang === "ar"
      ? "تاريخ الإصدار"
      : lang === "bilingual"
        ? '<span dir="ltr">Issue date</span> / <span dir="rtl">تاريخ الإصدار</span>'
        : "Issue Date";
  const lblTerm =
    lang === "ar"
      ? "مدة العقد"
      : lang === "bilingual"
        ? '<span dir="ltr">Term</span> / <span dir="rtl">مدة العقد</span>'
        : "Term";
  const lblProject =
    lang === "ar"
      ? "المشروع"
      : lang === "bilingual"
        ? '<span dir="ltr">Project</span> / <span dir="rtl">المشروع</span>'
        : "Project";

  const projectTitle = `${snapshot.project.code} — ${
    lang === "ar"
      ? snapshot.project.nameAr || snapshot.project.nameEn || ""
      : snapshot.project.nameEn || snapshot.project.nameAr || ""
  }`;

  const termDisplay =
    c.startDate || c.endDate
      ? `${startDateFormatted} → ${endDateFormatted}`
      : "—";

  return `
  <header class="hero-header">
    <svg class="hero-svg-bg" viewBox="0 0 1000 240" preserveAspectRatio="none" style="overflow: visible;">
      <g ${svgTransform}>
        <polygon points="415,-30 1050,-30 1050,195 370,195" fill="#14141a" />
        <polygon points="370,195 470,195 370,260" fill="#9f1239" />
        <polygon points="-50,-30 425,-30 370,195 370,260 -50,260" fill="#e11d48" />
      </g>
    </svg>

    <div class="hero-content">
      <div class="hero-red-box">
        <div>
          <div class="inv-main-title">${titleHtml}</div>
          ${subtitleHtml}
        </div>
        <div class="seller-meta">
          ${providerLines.join("")}
        </div>
      </div>

      <div class="hero-dark-box">
        <table class="meta-table">
          <tbody>
            <tr>
              <td class="lbl">${lblNo}</td>
              <td class="val"><span class="doc-number" dir="ltr">${esc(docNumber)}</span></td>
            </tr>
            <tr>
              <td class="lbl">${lblIssue}</td>
              <td class="val-std">${issueDateFormatted}</td>
            </tr>
            <tr>
              <td class="lbl">${lblTerm}</td>
              <td class="val-std">${termDisplay}</td>
            </tr>
            <tr>
              <td class="lbl">${lblProject}</td>
              <td class="val-std">${esc(projectTitle)}</td>
            </tr>
            ${
              c.versionNo > 1
                ? `<tr><td class="lbl">v</td><td class="val-std">v${c.versionNo}</td></tr>`
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

function renderContractFooter(input: ContractHtmlInput): string {
  const { snapshot, lang, stampDataUri, verification } = input;
  const c = snapshot.contract;

  const thankYouText =
    lang === "ar"
      ? "شكرا لتعاملكم معنا."
      : lang === "en"
        ? "Thank you for your business."
        : '<span dir="ltr">Thank you for your business.</span> / <span dir="rtl">شكرا لتعاملكم معنا.</span>';

  const notesLines: string[] = [];
  if (c.governingLawAr || c.governingLawEn) {
    const govTitle =
      lang === "ar"
        ? "القانون الحاكم"
        : lang === "en"
          ? "Governing Law"
          : "Governing Law / القانون الحاكم";
    const govVal =
      lang === "ar"
        ? c.governingLawAr || c.governingLawEn
        : lang === "en"
          ? c.governingLawEn || c.governingLawAr
          : `${c.governingLawEn || "—"} / ${c.governingLawAr || "—"}`;
    notesLines.push(
      `<div class="info-block"><h4>${govTitle}</h4><p>${esc(govVal ?? "")}</p></div>`,
    );
  }
  if (c.jurisdictionAr || c.jurisdictionEn) {
    const jurTitle =
      lang === "ar"
        ? "الاختصاص القضائي"
        : lang === "en"
          ? "Jurisdiction"
          : "Jurisdiction / الاختصاص القضائي";
    const jurVal =
      lang === "ar"
        ? c.jurisdictionAr || c.jurisdictionEn
        : lang === "en"
          ? c.jurisdictionEn || c.jurisdictionAr
          : `${c.jurisdictionEn || "—"} / ${c.jurisdictionAr || "—"}`;
    notesLines.push(
      `<div class="info-block"><h4>${jurTitle}</h4><p>${esc(jurVal ?? "")}</p></div>`,
    );
  }

  const stampTitle =
    lang === "ar"
      ? "الختم الرسمي"
      : lang === "en"
        ? "Official Stamp"
        : "Official Stamp / الختم الرسمي";
  const stampImg = stampDataUri
    ? `<div class="sig-box"><img class="stamp-img" src="${esc(
        stampDataUri,
      )}" alt="Stamp" /><div class="sig-title">${stampTitle}</div></div>`
    : "";

  let verifyCardHtml = "";
  if (verification) {
    const docNumber = c.number ?? (c.id ? c.id.slice(0, 8) : "DRAFT");
    const barcodeSvg = renderCode39Svg(docNumber);
    const title =
      lang === "ar"
        ? "التحقق · باركود"
        : lang === "en"
          ? "Verification · Barcode"
          : "Verification / التحقق · Barcode";
    const genNote =
      lang === "ar"
        ? "تم إنشاء العقد عبر Dossier"
        : lang === "en"
          ? "Contract generated by Dossier"
          : '<span dir="ltr">Contract generated by Dossier</span> / <span dir="rtl">تم إنشاء العقد عبر Dossier</span>';

    verifyCardHtml = `
      <div class="verify-card">
        <div class="qr-frame">
          <img class="qr" src="${esc(verification.qrDataUri)}" alt="QR Code" />
        </div>
        <div class="barcode-details">
          <div class="verify-badge-title">${title}</div>
          <div class="barcode-svg-container">${barcodeSvg}</div>
          <div class="verify-code-str">${num(verification.code)}</div>
          <div class="muted note-dossier" style="font-size: 6.8pt; color: #64748b;">${genNote}</div>
        </div>
      </div>
    `;
  }

  const footerSystemName = "Dossier";

  return `
    <div class="inv-footer-wrap">
      <div class="inv-footer">
        <div class="footer-info">
          ${notesLines.join("")}
          <div class="thank-you">${thankYouText}</div>
        </div>
        <div class="footer-verification">
          ${verifyCardHtml}
          ${stampImg}
        </div>
      </div>
    </div>
    <div class="bottom-red-bar">
      <span dir="ltr">${esc(footerSystemName)}</span>
      <span class="page-num-display" dir="ltr">1 / 1</span>
    </div>
  `;
}

export function renderContractHtml(input: ContractHtmlInput): string {
  const { snapshot, lang, mode } = input;
  const c = snapshot.contract;

  const watermark =
    mode === "draft" || mode === "preview" ? "DRAFT / مسودة" : null;

  const header = renderHeroHeader(snapshot, lang, input.logoDataUri);

  const clausesHtml = snapshot.clauses
    .map((clause) =>
      lang === "bilingual"
        ? renderClauseBilingual(
            clause,
            snapshot,
            input.signatures,
            input.stampDataUri,
          )
        : renderClauseSingle(
            clause,
            snapshot,
            lang,
            input.signatures,
            input.stampDataUri,
          ),
    )
    .join("");

  const unsignedNote =
    mode === "unsigned"
      ? `<div class="unsigned-card"><span class="unsigned-badge">UNSIGNED</span> <span class="unsigned-badge ar" dir="rtl">غير موقع</span><p class="unsigned-desc">This contract document is currently unsigned and has no legal validity until fully executed by all parties.</p></div>`
      : "";

  const footerHtml = renderContractFooter(input);

  const certificateHtml =
    mode === "sealed" && input.certificate
      ? renderCertificateSection(
          {
            number: c.number,
            titleEn: c.titleEn,
            titleAr: c.titleAr,
            versionNo: c.versionNo,
            projectCode: snapshot.project.code,
            verification: input.verification,
          },
          input.certificate,
          lang,
        )
      : "";

  const title = (lang === "ar" ? c.titleAr : c.titleEn) ?? "Contract";
  return documentShell({
    lang,
    title,
    fonts: input.fonts,
    watermark,
    body: `<div class="contract-document">${header}<div class="contract-body">${clausesHtml}${unsignedNote}</div>${footerHtml}${certificateHtml}</div>`,
  });
}

export function localeForDoc(lang: DocLang): Locale {
  return lang === "ar" ? "ar" : "en";
}
