import QRCode from "qrcode";

// 12.8 — SVG QR as a base64 data URI (no network).
export async function makeQrDataUri(url: string): Promise<string> {
  const svg = await QRCode.toString(url, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
  });
  return `data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")}`;
}

export function verificationUrl(appUrl: string, code: string): string {
  return `${appUrl}/v/${code.replace(/-/g, "")}`;
}

const CODE39_PATTERNS: Record<string, string> = {
  "0": "000110100",
  "1": "100100001",
  "2": "001100001",
  "3": "101100000",
  "4": "000110001",
  "5": "100110000",
  "6": "001110000",
  "7": "000100101",
  "8": "100100100",
  "9": "001100100",
  A: "100001001",
  B: "001001001",
  C: "101001000",
  D: "000011001",
  E: "100011000",
  F: "001011000",
  G: "000001101",
  H: "100001100",
  I: "001001100",
  J: "000011100",
  K: "100000011",
  L: "001000011",
  M: "101000010",
  N: "000010011",
  O: "100010010",
  P: "001010010",
  Q: "000000111",
  R: "100000110",
  S: "001000110",
  T: "000010110",
  U: "110000001",
  V: "011000001",
  W: "111000000",
  X: "010010001",
  Y: "110010000",
  Z: "011010000",
  "-": "010000101",
  ".": "110000100",
  " ": "011000100",
  $: "010101000",
  "/": "010100010",
  "+": "010001010",
  "%": "000101010",
  "*": "010010100",
};

export function renderCode39Svg(text: string, height = 24): string {
  const clean = (
    "*" +
    (text || "INV")
      .toUpperCase()
      .replace(/[^0-9A-Z-. $/+%]/g, "") +
    "*"
  ).split("");
  const narrow = 1.1;
  const wide = 2.6;
  const gap = 1.1;
  let x = 0;
  const rects: string[] = [];

  for (let charIdx = 0; charIdx < clean.length; charIdx++) {
    const ch = clean[charIdx];
    const pattern = CODE39_PATTERNS[ch] ?? CODE39_PATTERNS["-"];
    for (let i = 0; i < 9; i++) {
      const isBar = i % 2 === 0;
      const isWide = pattern[i] === "1";
      const w = isWide ? wide : narrow;
      if (isBar) {
        rects.push(
          `<rect x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="${height}" fill="#0f172a" />`,
        );
      }
      x += w;
    }
    if (charIdx < clean.length - 1) {
      x += gap;
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.ceil(
    x,
  )} ${height}" width="${Math.ceil(
    x,
  )}" height="${height}" style="display:block;max-width:100%;height:${height}px;">${rects.join(
    "",
  )}</svg>`;
}

