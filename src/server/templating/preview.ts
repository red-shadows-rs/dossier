// Dossier - Preview Module
// https://github.com/red-shadows-rs/dossier

import type { Locale } from "@/lib/constants";
import type { DocLang } from "@/server/pdf/html/shared";
import { renderContractHtml } from "@/server/pdf/html/contract";
import { getFontCss } from "@/server/pdf/fonts";
import { makeQrDataUri } from "@/server/pdf/qr";
import { getSettings } from "@/server/services/settings";
import { getFileRow, readFile } from "@/server/services/files";
import { SAMPLE_SNAPSHOT } from "./sample-snapshot";

function toDataUri(mime: string, buffer: Buffer): string {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}
import {
  numberedParagraphLabels,
  parseBody,
  renderInline,
  renderScopeBlock,
  type Block,
} from "./render-body";
import { type ContractSnapshotV1 } from "./variables";

const SPECIAL_LABELS: Record<string, string> = {
  parties: "{{block.parties}}",
  pricing_table: "{{block.pricing_table}}",
  payment_schedule: "{{block.payment_schedule}}",
  signatures: "{{block.signatures}}",
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderBlock(
  block: Block,
  vars: Record<string, string>,
  clausePosition: number,
  labels: string[],
  labelIndex: { value: number },
  onMissing: (key: string) => void,
): string {
  switch (block.type) {
    case "paragraph": {
      const isScope =
        block.text.trim() === "{{contract.scope}}" ||
        block.text.trim() === "{{ contract.scope }}" ||
        block.text.trim() === "> {{contract.scope}}" ||
        block.text.trim() === "> {{ contract.scope }}";
      if (isScope) {
        return renderScopeBlock(vars["contract.scope"], vars, onMissing);
      }
      const inner = renderInline(block.text, vars, onMissing);
      if (!block.numbered) {
        return `<p class="note">${inner}</p>`;
      }
      const label = labels[labelIndex.value] ?? "";
      labelIndex.value += 1;
      return `<p class="para"><span class="num">${escapeHtml(label)}</span> ${inner}</p>`;
    }
    case "bullets": {
      const items = block.items
        .map((item) => `<li>${renderInline(item, vars, onMissing)}</li>`)
        .join("");
      return `<ul class="bullets">${items}</ul>`;
    }
    case "special":
      return `<div class="block">${escapeHtml(SPECIAL_LABELS[block.name] ?? block.name)}</div>`;
  }
}

export function renderClauseBodyHtml(
  body: string,
  vars: Record<string, string>,
  clausePosition: number,
  onMissing: (key: string) => void = () => {},
): string {
  const blocks = parseBody(body);
  const labels = numberedParagraphLabels(clausePosition, blocks);
  const labelIndex = { value: 0 };
  return blocks
    .map((block) =>
      renderBlock(block, vars, clausePosition, labels, labelIndex, onMissing),
    )
    .join("\n");
}

export function clauseHeading(
  clausePosition: number,
  title: string,
  lang: Locale,
): string {
  return lang === "ar"
    ? `المادة (${clausePosition}): ${title}`
    : `Article ${clausePosition} — ${title}`;
}

export type PreviewClause = {
  key?: string | null;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
};

export type TemplatePreviewOptions = {
  templateTitleAr?: string;
  templateTitleEn?: string;
  hasFees?: boolean;
  paymentTermsDays?: number;
};

function imageByFileId(fileId: string | null): string | null {
  if (!fileId) return null;
  const row = getFileRow(fileId);
  if (!row) return null;
  try {
    const file = readFile(row.id);
    return toDataUri(file.mime, file.buffer);
  } catch {
    return null;
  }
}

export async function renderTemplatePreviewHtml(
  clauses: PreviewClause[],
  lang: DocLang | Locale = "ar",
  snapshot: ContractSnapshotV1 = SAMPLE_SNAPSHOT,
  options?: TemplatePreviewOptions,
): Promise<string> {
  const docLang: DocLang = lang === "en" ? "en" : "ar";

  let company: ReturnType<typeof getSettings<"company">> | null = null;
  try {
    company = getSettings("company");
  } catch {
    company = null;
  }

  const logoDataUri = company ? imageByFileId(company.logoFileId ?? null) : null;
  const stampDataUri = company ? imageByFileId(company.stampFileId ?? null) : null;

  let fonts = "";
  try {
    fonts = getFontCss();
  } catch {
    fonts = "";
  }

  let qrDataUri = "";
  try {
    qrDataUri = await makeQrDataUri("https://red-shadows-rs.com");
  } catch {
    qrDataUri = "";
  }

  const effectiveClauses =
    clauses && clauses.length > 0 ? clauses : snapshot.clauses;

  const mergedSnapshot: ContractSnapshotV1 = {
    ...snapshot,
    contract: {
      ...snapshot.contract,
      number: "DOS-TPL-PREVIEW",
      titleAr: options?.templateTitleAr?.trim() || snapshot.contract.titleAr,
      titleEn: options?.templateTitleEn?.trim() || snapshot.contract.titleEn,
      languageMode: docLang,
      hasFees:
        options?.hasFees !== undefined
          ? options.hasFees
          : snapshot.contract.hasFees,
      paymentTermsDays:
        options?.paymentTermsDays ?? snapshot.contract.paymentTermsDays,
    },
    provider: {
      ...snapshot.provider,
      nameAr: company?.legalNameAr || snapshot.provider.nameAr,
      nameEn: company?.legalNameEn || snapshot.provider.nameEn,
      crNumber: company?.crNumber || snapshot.provider.crNumber,
      taxNumber: company?.taxNumber || snapshot.provider.taxNumber,
      addressAr: company?.addressAr || snapshot.provider.addressAr,
      addressEn: company?.addressEn || snapshot.provider.addressEn,
      email: company?.email || snapshot.provider.email,
      phone: company?.phone || snapshot.provider.phone,
      website: company?.website || snapshot.provider.website,
    },
    clauses: effectiveClauses.map((clause, index) => ({
      id: `clause-${index + 1}`,
      position: index + 1,
      key: clause.key ?? null,
      titleAr: clause.titleAr,
      titleEn: clause.titleEn,
      bodyAr: clause.bodyAr,
      bodyEn: clause.bodyEn,
    })),
  };

  return renderContractHtml({
    snapshot: mergedSnapshot,
    lang: docLang,
    mode: "preview",
    fonts,
    logoDataUri,
    stampDataUri,
    signatures: [],
    verification: {
      code: "DOS-TPL-PREVIEW",
      url: "https://red-shadows-rs.com",
      qrDataUri,
    },
    certificate: null,
  });
}
