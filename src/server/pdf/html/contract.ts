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
import {
  docDir,
  documentShell,
  esc,
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

function renderHeader(
  snapshot: ContractSnapshotV1,
  lang: DocLang,
  logoDataUri: string | null,
): string {
  const c = snapshot.contract;
  const p = snapshot.provider;
  const isBilingual = lang === "bilingual";
  const isArabic = lang === "ar";
  const docNumber = c.number ?? "DRAFT";
  const issueDateFormatted = formatDateLong(c.issueDate, "en");

  const logoMarkup = logoDataUri
    ? `<img class="header-logo" src="${esc(logoDataUri)}" alt="Logo" />`
    : `
      <div class="brand-logo-fallback">
        <svg width="22" height="22" viewBox="0 0 32 32" fill="none">
          <polygon points="16,2 30,10 16,18 2,10" fill="#e11d48" />
          <polygon points="2,10 16,18 16,30 2,22" fill="#9f1239" />
          <polygon points="30,10 16,18 16,30 30,22" fill="#fb7185" />
        </svg>
        <span class="brand-title">${esc(p.nameEn || p.nameAr || "DOSSIER")}</span>
      </div>
    `;

  if (isBilingual) {
    return `
      <header class="contract-hero-header">
        <div class="header-top-bar">
          <div class="header-logo-container">${logoMarkup}</div>
          <div class="header-pills-container">
            <span class="header-pill doc-number-pill"><span class="pill-lbl">NO:</span> ${esc(docNumber)}</span>
            <span class="header-pill"><span class="pill-lbl">DATE:</span> ${esc(issueDateFormatted)}</span>
            ${c.versionNo > 1 ? `<span class="header-pill"><span class="pill-lbl">VER:</span> v${c.versionNo}</span>` : ""}
          </div>
        </div>

        <table class="bilingual-clause" style="margin: 0; border: none;">
          <tbody>
            <tr>
              <td class="col-en divider" dir="ltr" style="width: 50%; vertical-align: top; border-bottom: none;">
                <div class="doc-badge">LEGAL AGREEMENT</div>
                <h1 class="contract-main-title">${esc(c.titleEn || c.titleAr || "Contract Agreement")}</h1>
                <div class="contract-meta-sub">
                  <span>Project: <strong>${esc(snapshot.project.code)}</strong> — ${esc(snapshot.project.nameEn || snapshot.project.nameAr || "")}</span>
                </div>
              </td>
              <td class="col-ar" dir="rtl" style="width: 50%; vertical-align: top; border-bottom: none;">
                <div class="doc-badge">عقد اتفاق قانوني</div>
                <h1 class="contract-main-title">${esc(c.titleAr || c.titleEn || "عقد اتفاق")}</h1>
                <div class="contract-meta-sub">
                  <span>المشروع: <strong>${esc(snapshot.project.code)}</strong> — ${esc(snapshot.project.nameAr || snapshot.project.nameEn || "")}</span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </header>
    `;
  }

  // Single language (ar or en)
  const docBadgeText = isArabic ? "عقد اتفاق قانوني" : "LEGAL AGREEMENT";
  const mainTitle = isArabic
    ? esc(c.titleAr || c.titleEn || "عقد اتفاق")
    : esc(c.titleEn || c.titleAr || "Contract Agreement");
  const projectLabel = isArabic ? "المشروع" : "Project";
  const projectName = isArabic
    ? esc(snapshot.project.nameAr || snapshot.project.nameEn || "")
    : esc(snapshot.project.nameEn || snapshot.project.nameAr || "");
  const numLabel = isArabic ? "رقم العقد" : "NO";
  const dateLabel = isArabic ? "التاريخ" : "DATE";

  return `
    <header class="contract-hero-header" dir="${docDir(lang)}">
      <div class="header-top-bar">
        <div class="header-logo-container">${logoMarkup}</div>
        <div class="header-pills-container">
          <span class="header-pill doc-number-pill"><span class="pill-lbl">${numLabel}:</span> ${esc(docNumber)}</span>
          <span class="header-pill"><span class="pill-lbl">${dateLabel}:</span> ${esc(issueDateFormatted)}</span>
          ${c.versionNo > 1 ? `<span class="header-pill"><span class="pill-lbl">v:</span> ${c.versionNo}</span>` : ""}
        </div>
      </div>

      <div class="contract-title-wrap">
        <div class="doc-badge">${docBadgeText}</div>
        <h1 class="contract-main-title">${mainTitle}</h1>
        <div class="contract-meta-sub">
          <span>${projectLabel}: <strong>${esc(snapshot.project.code)}</strong> — ${projectName}</span>
        </div>
      </div>
    </header>
  `;
}

// 12.5
export function renderContractHtml(input: ContractHtmlInput): string {
  const { snapshot, lang, mode } = input;
  const c = snapshot.contract;

  const watermark =
    mode === "draft" || mode === "preview" ? "DRAFT / مسودة" : null;

  const header = renderHeader(snapshot, lang, input.logoDataUri);

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

  const verificationBlock =
    mode === "sealed" && input.verification
      ? `<div class="verify">
          <table style="width: 100%; border: none;">
            <tbody>
              <tr>
                <td style="width: 30mm; vertical-align: middle; border: none; padding-inline-end: 4mm;">
                  <img class="qr" src="${esc(input.verification.qrDataUri)}" alt="QR" />
                </td>
                <td style="vertical-align: middle; border: none;">
                  <div class="verify-badge">CRYPTOGRAPHIC VERIFICATION</div>
                  <p style="margin: 0 0 1.5mm;"><strong>Verification code / رمز التحقق:</strong> ${num(
                    input.verification.code,
                  )}</p>
                  <p class="muted" dir="ltr" style="margin: 0 0 1.5mm;">${esc(
                    input.verification.url,
                  )}</p>
                  <p class="hash" style="margin: 0;">SHA-256 (content): ${esc(
                    input.certificate?.contentHash ?? "",
                  )}</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>`
      : "";

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
    body: `${header}${clausesHtml}${unsignedNote}${verificationBlock}${certificateHtml}`,
  });
}

export function localeForDoc(lang: DocLang): Locale {
  return lang === "ar" ? "ar" : "en";
}
