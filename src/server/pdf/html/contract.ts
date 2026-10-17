import type { Locale } from "@/lib/constants";
import { formatDateLong } from "@/lib/dates";
import {
  numberedParagraphLabels,
  parseBody,
  renderInline,
  renderScopeBlock,
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
      const isScope =
        block.text.trim() === "{{contract.scope}}" ||
        block.text.trim() === "{{ contract.scope }}" ||
        block.text.trim() === "> {{contract.scope}}" ||
        block.text.trim() === "> {{ contract.scope }}";
      if (isScope) {
        return renderScopeBlock(vars["contract.scope"], vars, () => {});
      }
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
  const title = lang === "ar" ? (clause.titleAr || clause.titleEn) : (clause.titleEn || clause.titleAr);
  const body = lang === "ar" ? (clause.bodyAr || clause.bodyEn) : (clause.bodyEn || clause.bodyAr);
  const badgeLabel =
    lang === "ar"
      ? `المادة ${clause.position} —`
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

  const titleHtml = esc(lang === "en" ? contractTitleEn : contractTitleAr);
  const subtitleHtml = "";

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
  if (p.website) {
    const cleanWeb = p.website.replace(/^https?:\/\//i, "").replace(/\/$/, "");
    contact.push(`<span dir="ltr">${esc(cleanWeb)}</span>`);
  }
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

  const lblNo = lang === "en" ? "Contract No" : "رقم العقد";
  const lblIssue = lang === "en" ? "Issue Date" : "تاريخ الإصدار";
  const lblTerm = lang === "en" ? "Term" : "مدة العقد";
  const lblProject = lang === "en" ? "Project" : "المشروع";

  const projectTitle = `${snapshot.project.code} — ${
    lang === "ar"
      ? snapshot.project.nameAr || snapshot.project.nameEn || ""
      : snapshot.project.nameEn || snapshot.project.nameAr || ""
  }`;

  const arrow = isRtlDoc ? "←" : "→";
  const termDisplay =
    startDateFormatted && endDateFormatted
      ? `${startDateFormatted} ${arrow} ${endDateFormatted}`
      : startDateFormatted || endDateFormatted || "—";

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

export function renderSubsequentHeader(
  snapshot: ContractSnapshotV1,
  lang: DocLang,
  logoDataUri: string | null,
): string {
  const isArabic = lang === "ar";
  const p = snapshot.provider;
  const c = snapshot.contract;
  const providerName = esc(
    isArabic
      ? p.nameAr || p.nameEn || ""
      : p.nameEn || p.nameAr || "",
  );
  const docNoLabel = isArabic ? "رقم العقد:" : "Contract No:";
  const docNumber = c.number ?? (isArabic ? "قيد الإصدار" : "Draft");

  const projectTitle = `${snapshot.project.code} — ${
    isArabic
      ? snapshot.project.nameAr || snapshot.project.nameEn || ""
      : snapshot.project.nameEn || snapshot.project.nameAr || ""
  }`;

  const logoHtml = logoDataUri
    ? `<img class="sub-brand-logo" src="${esc(logoDataUri)}" alt="${providerName}" />`
    : "";

  return `
  <header class="subsequent-header">
    <div class="sub-header-left">
      <div class="sub-doc-meta">
        <span class="sub-meta-lbl">${docNoLabel}</span>
        <span class="sub-meta-val" dir="ltr">${esc(docNumber)}</span>
        <span class="sub-meta-sep">·</span>
        <span class="sub-meta-project">${esc(projectTitle)}</span>
      </div>
    </div>
    <div class="sub-header-right">
      <div class="sub-brand-name">${providerName}</div>
      ${logoHtml}
    </div>
  </header>
  `;
}

type ContractClause = ContractSnapshotV1["clauses"][number];

export function paginateContractClauses(
  snapshot: ContractSnapshotV1,
): { pages: ContractClause[][]; separateFooterPage: boolean } {
  const clauses = snapshot.clauses;
  if (!clauses || clauses.length === 0) {
    return { pages: [[]], separateFooterPage: false };
  }

  const P1_BUDGET = 190;
  const PSUB_BUDGET = 140;
  const FOOTER_MM = 48;

  function estimateClauseMm(clause: ContractClause): number {
    let mm = 8;
    const body = clause.bodyAr || clause.bodyEn || "";
    if (body.includes("{{block.parties}}")) {
      mm += 32;
    }
    if (body.includes("{{block.pricing_table}}")) {
      const itemsCount = snapshot.items?.length ?? 2;
      mm += 18 + itemsCount * 5.8;
    }
    if (body.includes("{{block.payment_schedule}}")) {
      const mCount = snapshot.milestones?.length ?? 2;
      mm += 18 + mCount * 5.8;
    }
    if (body.includes("{{block.signatures}}")) {
      mm += 28;
    }
    const textOnly = body.replace(/\{\{block\.[^}]+\}\}/g, "").trim();
    const approxLines = Math.ceil(textOnly.length / 95);
    mm += approxLines * 4.0;
    return Math.max(mm, 12);
  }

  const heights = clauses.map(estimateClauseMm);
  const totalMm = heights.reduce((a, b) => a + b, 0);

  if (totalMm + FOOTER_MM <= P1_BUDGET) {
    return { pages: [clauses], separateFooterPage: false };
  }

  const pages: ContractClause[][] = [];
  let currentPage: ContractClause[] = [];
  let currentMm = 0;
  let isFirst = true;

  for (let i = 0; i < clauses.length; i++) {
    const clause = clauses[i];
    const clMm = heights[i];
    const budget = isFirst ? P1_BUDGET : PSUB_BUDGET;

    if (currentPage.length > 0 && currentMm + clMm > budget) {
      pages.push(currentPage);
      currentPage = [clause];
      currentMm = clMm;
      isFirst = false;
    } else {
      currentPage.push(clause);
      currentMm += clMm;
    }
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  // Prevent empty footer page: if last page has no room for footer,
  // redistribute so that the last page has content as well.
  const lastPageBudget = pages.length === 1 ? P1_BUDGET : 220;
  const lastPageClauseMm = pages[pages.length - 1].reduce(
    (acc, cl) => acc + estimateClauseMm(cl),
    0,
  );

  if (lastPageClauseMm + FOOTER_MM > lastPageBudget && pages[pages.length - 1].length > 1) {
    const popped = pages[pages.length - 1].pop()!;
    pages.push([popped]);
  }

  return { pages, separateFooterPage: false };
}

function renderContractFooter(input: ContractHtmlInput): string {
  const { snapshot, lang, stampDataUri, verification } = input;
  const c = snapshot.contract;

  const thankYouText =
    lang === "en"
      ? "Thank you for your business."
      : "شكرا لتعاملكم معنا.";

  const notesLines: string[] = [];
  if (c.governingLawAr || c.governingLawEn) {
    const govTitle = lang === "en" ? "Governing Law" : "القانون الحاكم";
    const govVal =
      lang === "en"
        ? c.governingLawEn || c.governingLawAr
        : c.governingLawAr || c.governingLawEn;
    notesLines.push(
      `<div class="info-block"><h4>${govTitle}</h4><p>${esc(govVal ?? "")}</p></div>`,
    );
  }
  if (c.jurisdictionAr || c.jurisdictionEn) {
    const jurTitle = lang === "en" ? "Jurisdiction" : "الاختصاص القضائي";
    const jurVal =
      lang === "en"
        ? c.jurisdictionEn || c.jurisdictionAr
        : c.jurisdictionAr || c.jurisdictionEn;
    notesLines.push(
      `<div class="info-block"><h4>${jurTitle}</h4><p>${esc(jurVal ?? "")}</p></div>`,
    );
  }

  const stampTitle = lang === "en" ? "Official Stamp" : "الختم الرسمي";
  const stampImg = stampDataUri
    ? `<div class="sig-box"><img class="stamp-img" src="${esc(
        stampDataUri,
      )}" alt="Stamp" /><div class="sig-title">${stampTitle}</div></div>`
    : "";

  let verifyCardHtml = "";
  if (verification) {
    const docNumber = c.number ?? (c.id ? c.id.slice(0, 8) : "DRAFT");
    const barcodeSvg = renderCode39Svg(docNumber);
    const title = lang === "en" ? "Verification · Barcode" : "التحقق · باركود";
    const genNote =
      lang === "en"
        ? "Contract generated by Dossier"
        : "تم إنشاء العقد عبر Dossier";

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
  `;
}

export function renderContractHtml(input: ContractHtmlInput): string {
  const { snapshot, lang, mode } = input;
  const c = snapshot.contract;

  const watermark =
    mode === "draft" || mode === "preview"
      ? (lang === "en" ? "DRAFT" : "مسودة")
      : null;

  const unsignedNote =
    mode === "unsigned"
      ? `<div class="unsigned-card"><span class="unsigned-badge">${
          lang === "en" ? "UNSIGNED" : "غير موقع"
        }</span><p class="unsigned-desc">${
          lang === "en"
            ? "This contract document is currently unsigned and has no legal validity until fully executed by all parties."
            : "هذا العقد غير موقع حالياً ولا يعد نافذاً أو معتمداً حتى يتم توقيعه رسمياً من جميع الأطراف."
        }</p></div>`
      : "";

  const footerHtml = renderContractFooter(input);

  // When previewed on screen (dashboard / editor / review), render as a single continuous page
  if (mode === "preview") {
    const headerHtml = renderHeroHeader(snapshot, lang, input.logoDataUri);
    const clausesHtml = snapshot.clauses
      .map((clause) =>
        renderClauseSingle(
          clause,
          snapshot,
          lang === "en" ? "en" : "ar",
          input.signatures,
          input.stampDataUri,
        ),
      )
      .join("");

    const pageContent = `
      <div class="contract-page contract-preview-single-page">
        <div class="contract-page-main">
          ${headerHtml}
          <div class="contract-body">
            ${clausesHtml}
            ${unsignedNote}
          </div>
        </div>
        ${footerHtml}
        <div class="bottom-red-bar">
          <span dir="ltr">Dossier</span>
        </div>
      </div>
    `;

    const title = (lang === "ar" ? c.titleAr : c.titleEn) ?? "Contract";
    return documentShell({
      lang,
      title,
      fonts: input.fonts,
      watermark,
      body: `<div class="contract-document contract-document-continuous">${pageContent}</div>`,
    });
  }

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

  const { pages: clausePages, separateFooterPage } = paginateContractClauses(snapshot);
  const hasCertPage = !!certificateHtml;
  const totalPages =
    clausePages.length +
    (separateFooterPage ? 1 : 0) +
    (hasCertPage ? 1 : 0);

  const renderedPages: string[] = [];

  clausePages.forEach((chunk, pageIndex) => {
    const isFirstPage = pageIndex === 0;
    const isLastClausePage = pageIndex === clausePages.length - 1;
    const headerHtml = isFirstPage
      ? renderHeroHeader(snapshot, lang, input.logoDataUri)
      : renderSubsequentHeader(snapshot, lang, input.logoDataUri);

    const clausesHtml = chunk
      .map((clause) =>
        renderClauseSingle(
          clause,
          snapshot,
          lang === "en" ? "en" : "ar",
          input.signatures,
          input.stampDataUri,
        ),
      )
      .join("");

    const pageFooter = isLastClausePage && !separateFooterPage ? footerHtml : "";
    const noteHtml = isLastClausePage ? unsignedNote : "";

    renderedPages.push(`
      <div class="contract-page">
        <div class="contract-page-main">
          ${headerHtml}
          <div class="contract-body">
            ${clausesHtml}
            ${noteHtml}
          </div>
        </div>
        ${pageFooter}
        <div class="bottom-red-bar">
          <span dir="ltr">Dossier</span>
          <span class="page-num-display" dir="ltr">${pageIndex + 1} / ${totalPages}</span>
        </div>
      </div>
    `);
  });

  if (separateFooterPage) {
    const footerPageIndex = clausePages.length;
    const headerHtml = renderSubsequentHeader(snapshot, lang, input.logoDataUri);
    renderedPages.push(`
      <div class="contract-page">
        <div class="contract-page-main">
          ${headerHtml}
          <div class="contract-body"></div>
        </div>
        ${footerHtml}
        <div class="bottom-red-bar">
          <span dir="ltr">Dossier</span>
          <span class="page-num-display" dir="ltr">${footerPageIndex + 1} / ${totalPages}</span>
        </div>
      </div>
    `);
  }

  if (hasCertPage) {
    const certPageIndex = totalPages - 1;
    const headerHtml = renderSubsequentHeader(snapshot, lang, input.logoDataUri);
    renderedPages.push(`
      <div class="contract-page cert-page">
        <div class="contract-page-main">
          ${headerHtml}
          <div class="contract-body">
            ${certificateHtml}
          </div>
        </div>
        <div class="bottom-red-bar">
          <span dir="ltr">Dossier</span>
          <span class="page-num-display" dir="ltr">${certPageIndex + 1} / ${totalPages}</span>
        </div>
      </div>
    `);
  }

  const title = (lang === "ar" ? c.titleAr : c.titleEn) ?? "Contract";
  return documentShell({
    lang,
    title,
    fonts: input.fonts,
    watermark,
    body: `<div class="contract-document">${renderedPages.join("")}</div>`,
  });
}

export function localeForDoc(lang: DocLang): Locale {
  return lang === "ar" ? "ar" : "en";
}
