export const SPECIAL_BLOCKS = [
  "parties",
  "pricing_table",
  "payment_schedule",
  "signatures",
] as const;
export type SpecialBlockName = (typeof SPECIAL_BLOCKS)[number];

export type Block =
  | { type: "paragraph"; numbered: true; text: string }
  | { type: "paragraph"; numbered: false; text: string }
  | { type: "bullets"; items: string[] }
  | { type: "special"; name: SpecialBlockName };

const BLOCK_TOKEN = new RegExp(
  `^\\{\\{\\s*block\\.(${SPECIAL_BLOCKS.join("|")})\\s*\\}\\}$`,
);
const BLOCK_TOKEN_ANYWHERE = new RegExp(
  `\\{\\{\\s*block\\.(${SPECIAL_BLOCKS.join("|")})\\s*\\}\\}`,
  "g",
);
const VARIABLE_TOKEN = /\{\{\s*([^{}]*?)\s*\}\}/g;
const SLOT = "\u0001";

function normalize(src: string): string {
  return src
    .replace(/\r\n?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function stripSlot(text: string): string {
  return text.split(SLOT).join("");
}

export function parseBody(src: string): Block[] {
  const blocks: Block[] = [];
  for (const raw of normalize(src).split(/\n{2,}/)) {
    const block = raw.trim();
    if (block === "") continue;

    const special = BLOCK_TOKEN.exec(block);
    if (special) {
      blocks.push({ type: "special", name: special[1] as SpecialBlockName });
      continue;
    }

    const lines = block.split("\n");
    if (lines.every((line) => line.startsWith("- "))) {
      blocks.push({
        type: "bullets",
        items: lines.map((line) => line.slice(2).trim()),
      });
      continue;
    }

    if (lines[0].startsWith("> ")) {
      blocks.push({
        type: "paragraph",
        numbered: false,
        text: lines
          .map((line) => (line.startsWith("> ") ? line.slice(2) : line))
          .join("\n"),
      });
      continue;
    }

    blocks.push({ type: "paragraph", numbered: true, text: block });
  }
  return blocks;
}

export function extractVariables(src: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const match of src.matchAll(VARIABLE_TOKEN)) {
    const name = match[1];
    if (name.startsWith("block.")) continue;
    if (seen.has(name)) continue;
    seen.add(name);
    result.push(name);
  }
  return result;
}

export function findMisplacedBlocks(src: string): SpecialBlockName[] {
  const found: SpecialBlockName[] = [];
  for (const raw of normalize(src).split(/\n{2,}/)) {
    const block = raw.trim();
    if (block === "") continue;
    if (BLOCK_TOKEN.test(block)) continue;
    for (const match of block.matchAll(BLOCK_TOKEN_ANYWHERE)) {
      found.push(match[1] as SpecialBlockName);
    }
  }
  return found;
}

export function specialBlockSequence(src: string): SpecialBlockName[] {
  return parseBody(src)
    .filter(
      (block): block is Extract<Block, { type: "special" }> =>
        block.type === "special",
    )
    .map((block) => block.name);
}

export function numberedParagraphLabels(
  clausePosition: number,
  blocks: Block[],
): string[] {
  const labels: string[] = [];
  let index = 0;
  for (const block of blocks) {
    if (block.type === "paragraph" && block.numbered) {
      index += 1;
      labels.push(`${clausePosition}.${index}`);
    }
  }
  return labels;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeLiteral(text: string): string {
  return escapeHtml(stripSlot(text)).replace(/\n/g, "<br>");
}

function renderValue(value: string): string {
  const escaped = escapeHtml(stripSlot(value)).replace(/\n/g, "<br>");
  return `<bdi>${escaped}</bdi>`;
}

function missingMarker(name: string): string {
  return `<span style="color:#ef4444">⟦missing: ${escapeHtml(name)}⟧</span>`;
}

export function renderInline(
  raw: string,
  vars: Record<string, string>,
  onMissing: (key: string) => void,
): string {
  const slots: string[] = [];
  const slot = (html: string): string => {
    slots.push(html);
    return `${SLOT}${slots.length - 1}${SLOT}`;
  };

  let out = "";
  let last = 0;
  VARIABLE_TOKEN.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = VARIABLE_TOKEN.exec(raw)) !== null) {
    out += escapeLiteral(raw.slice(last, match.index));
    const name = match[1];
    const value = name.startsWith("block.") ? undefined : vars[name];
    if (value === undefined || value === "") {
      onMissing(name);
      out += slot(missingMarker(name));
    } else {
      out += slot(renderValue(value));
    }
    last = VARIABLE_TOKEN.lastIndex;
  }
  out += escapeLiteral(raw.slice(last));

  const bolded = out.replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>");
  return bolded.replace(
    new RegExp(`${SLOT}(\\d+)${SLOT}`, "g"),
    (_full, index: string) => slots[Number(index)],
  );
}
