import type { Locale } from "@/lib/constants";
import {
  numberedParagraphLabels,
  parseBody,
  renderInline,
  type Block,
} from "./render-body";
import { buildVariableMap, type ContractSnapshotV1 } from "./variables";

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
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
};

export function renderTemplatePreviewHtml(
  clauses: PreviewClause[],
  lang: Locale,
  snapshot: ContractSnapshotV1,
): string {
  const vars = buildVariableMap(snapshot, lang);
  const dir = lang === "ar" ? "rtl" : "ltr";
  const sections = clauses
    .map((clause, index) => {
      const position = index + 1;
      const title = lang === "ar" ? clause.titleAr : clause.titleEn;
      const body = lang === "ar" ? clause.bodyAr : clause.bodyEn;
      const heading = clauseHeading(position, title, lang);
      const html = renderClauseBodyHtml(body, vars, position);
      return `<section class="clause"><h2>${escapeHtml(heading)}</h2>${html}</section>`;
    })
    .join("\n");

  return `<!doctype html><html dir="${dir}" lang="${lang}"><head><meta charset="utf-8"><style>
body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;margin:0;padding:24px;color:#111;line-height:1.7;background:#fff}
.clause{margin-bottom:24px}
.clause h2{font-size:16px;margin:0 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}
.para{margin:0 0 8px}
.num{color:#666;font-weight:600;margin-inline-end:4px}
.note{margin:0 0 8px;padding-inline-start:16px;border-inline-start:2px solid #eee;color:#333}
.bullets{margin:0 0 8px;padding-inline-start:20px}
.bullets li{margin-bottom:4px}
.block{margin:12px 0;padding:12px;border:1px dashed #bbb;border-radius:6px;color:#666;font-size:13px;text-align:center}
bdi{unicode-bidi:isolate}
</style></head><body>${sections}</body></html>`;
}
