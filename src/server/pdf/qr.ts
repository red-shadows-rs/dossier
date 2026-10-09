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
