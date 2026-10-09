import { readFileSync } from "node:fs";
import { join } from "node:path";

let cachedFontCss: string | null = null;

const FONT_FILE = join(process.cwd(), "assets", "fonts", "Cairo.ttf");

// 12.3 — read Cairo once, base64-encode, cache. Used by every document.
export function getFontCss(): string {
  if (cachedFontCss !== null) return cachedFontCss;
  const buffer = readFileSync(FONT_FILE);
  const base64 = buffer.toString("base64");
  cachedFontCss = `@font-face { font-family: 'DossierSans'; src: url(data:font/ttf;base64,${base64}) format('truetype'); font-weight: 200 1000; font-style: normal; }`;
  return cachedFontCss;
}

export const FONT_STACK =
  "'DossierSans', 'Noto Naskh Arabic', 'Noto Sans', Arial, sans-serif";
