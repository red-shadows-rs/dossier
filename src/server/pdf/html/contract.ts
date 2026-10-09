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
      return `<p><span class="num">${esc(label)}</span> ${inner}</p>`;
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
  const heading =
    lang === "ar"
      ? `المادة (${clause.position}): ${esc(title)}`
      : `Article ${clause.position} — ${esc(title)}`;
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
  return `<section><h2 class="clause">${heading}</h2>${inner}</section>`;
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
        return `<p><span class="num">${esc(label)}</span> ${inner}</p>`;
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
    `<tr class="clause-row"><th class="en" dir="ltr">${esc(
      `Article ${clause.position} — ${clause.titleEn}`,
    )}</th><th class="ar" dir="rtl">${esc(
      `المادة (${clause.position}): ${clause.titleAr}`,
    )}</th></tr>`,
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
        `<tr class="block-row"><td colspan="2">${renderSpecial(
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
      `<tr class="clause-row"><td class="en divider" dir="ltr">${enHtml}</td><td class="ar" dir="rtl">${arHtml}</td></tr>`,
    );
  }

  return `<table class="bilingual-clause"><tbody>${rows.join("")}</tbody></table>`;
}

function renderHeader(
  snapshot: ContractSnapshotV1,
  lang: DocLang,
  logoDataUri: string | null,
): string {
  const c = snapshot.contract;
  const p = snapshot.provider;
  const companyName =
    lang === "ar"
      ? esc(p.nameAr ?? p.nameEn ?? "")
      : lang === "en"
        ? esc(p.nameEn ?? p.nameAr ?? "")
        : `${esc(p.nameEn ?? "")}<br><span class="ar" dir="rtl">${esc(p.nameAr ?? "")}</span>`;
  const title =
    lang === "ar"
      ? esc(c.titleAr ?? c.titleEn ?? "")
      : lang === "en"
        ? esc(c.titleEn ?? c.titleAr ?? "")
        : `${esc(c.titleEn ?? "")}<br><span class="ar" dir="rtl">${esc(c.titleAr ?? "")}</span>`;
  const logo = logoDataUri
    ? `<img class="logo" src="${esc(logoDataUri)}" alt="" />`
    : "";
  const metaRows = [
    ["Number", "رقم", c.number ? num(c.number) : "—"],
    ["Date", "التاريخ", esc(formatDateLong(c.issueDate, "en"))],
    ...(c.versionNo > 1
      ? ([["Version", "الإصدار", num(String(c.versionNo))]] as Array<
          [string, string, string]
        >)
      : []),
    [
      "Project",
      "المشروع",
      `${esc(snapshot.project.code)} — ${esc(snapshot.project.nameEn ?? snapshot.project.nameAr ?? "")}`,
    ],
  ]
    .map(
      ([en, ar, value]) =>
        `<tr><td>${esc(en)} / <span class="ar" dir="rtl">${esc(ar)}</span></td><td>${value}</td></tr>`,
    )
    .join("");
  return `<header class="header"><div>${logo}<div>${companyName}</div></div><div><h1>${title}</h1><table class="meta"><tbody>${metaRows}</tbody></table></div></header>`;
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
      ? `<p class="unsigned-note">UNSIGNED / <span class="ar" dir="rtl">غير موقّع</span></p>`
      : "";

  const verificationBlock =
    mode === "sealed" && input.verification
      ? `<div class="verify"><table><tbody><tr><td class="divider"><img class="qr" src="${esc(
          input.verification.qrDataUri,
        )}" alt="QR" /></td><td><p><strong>Verification / التحقق:</strong> ${num(
          input.verification.code,
        )}</p><p class="muted" dir="ltr">${esc(
          input.verification.url,
        )}</p><p class="hash">SHA-256: ${esc(
          input.certificate?.contentHash ?? "",
        )}</p></td></tr></tbody></table></div>`
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
