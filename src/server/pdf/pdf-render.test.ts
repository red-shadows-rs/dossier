import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { SAMPLE_SNAPSHOT } from "@/server/templating/sample-snapshot";
import type { ContractSnapshotV1 } from "@/server/templating/variables";
import { closeBrowser } from "./browser";
import { getFontCss } from "./fonts";
import { renderPdf } from "./render";
import { renderContractHtml } from "./html/contract";
import { renderInvoiceHtml } from "./html/invoice";
import type { SignatureRender } from "./html/shared";

const QA_DIR = join(process.cwd(), "tmp", "qa");

const SNAPSHOT: ContractSnapshotV1 = {
  ...SAMPLE_SNAPSHOT,
  clauses: [
    {
      position: 1,
      key: "parties",
      titleAr: "الأطراف",
      titleEn: "Parties",
      bodyAr: "{{block.parties}}",
      bodyEn: "{{block.parties}}",
    },
    {
      position: 2,
      key: "fees",
      titleAr: "الأتعاب والدفع",
      titleEn: "Fees and Payment",
      bodyAr:
        "إجمالي الأتعاب **{{contract.total}}**.\n\n- البند الأول\n- البند الثاني\n\n> {{contract.scope}}\n\n{{block.pricing_table}}\n\n{{block.payment_schedule}}",
      bodyEn:
        "The total fee is **{{contract.total}}**.\n\n- First item\n- Second item\n\n> {{contract.scope}}\n\n{{block.pricing_table}}\n\n{{block.payment_schedule}}",
    },
    {
      position: 3,
      key: "signatures",
      titleAr: "التوقيعات",
      titleEn: "Signatures",
      bodyAr: "{{block.signatures}}",
      bodyEn: "{{block.signatures}}",
    },
  ],
};

const SIGNATURES: SignatureRender[] = [
  {
    role: "provider",
    name: "RED SHADOWS | RS",
    title: "Owner",
    signedAtMs: Date.parse("2026-10-20T10:00:00Z"),
    method: "drawn",
    imageDataUri:
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    typedName: null,
  },
  {
    role: "client",
    name: "Khalid Al-Noor",
    title: "General Manager",
    signedAtMs: Date.parse("2026-10-20T11:00:00Z"),
    method: "typed",
    imageDataUri: null,
    typedName: "Khalid Al-Noor",
  },
];

afterAll(async () => {
  await closeBrowser();
});

describe("renderPdf smoke", () => {
  for (const lang of ["ar", "en"] as const) {
    it(`generates a ${lang} PDF`, { timeout: 60000 }, async () => {
      const html = renderContractHtml({
        snapshot: SNAPSHOT,
        lang,
        mode: "draft",
        fonts: getFontCss(),
        logoDataUri: null,
        stampDataUri: null,
        signatures: SIGNATURES,
        verification: null,
        certificate: null,
      });
      const pdf = await renderPdf(html, {
        docNumber: "DRAFT",
        code: null,
      });
      expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
      expect(pdf.length).toBeGreaterThan(2000);

      mkdirSync(QA_DIR, { recursive: true });
      writeFileSync(join(QA_DIR, `contract-${lang}.pdf`), pdf);
    });
  }

  it(
    "generates a sealed PDF with certificate",
    { timeout: 60000 },
    async () => {
      const html = renderContractHtml({
        snapshot: {
          ...SNAPSHOT,
          contract: { ...SNAPSHOT.contract, number: "DOS-C-2026-0001" },
        },
        lang: "ar",
        mode: "sealed",
        fonts: getFontCss(),
        logoDataUri: null,
        stampDataUri: null,
        signatures: SIGNATURES,
        verification: {
          code: "ABCDEF001111",
          url: "https://dossier.example.com/v/ABCDEF001111",
          qrDataUri: "data:image/svg+xml;base64,PHN2Zy8+",
        },
        certificate: {
          contentHash: "a".repeat(64),
          generatedAtMs: Date.parse("2026-10-20T12:00:00Z"),
          timezone: "Asia/Riyadh",
          signatories: [
            {
              role: "provider",
              name: "RED SHADOWS | RS",
              title: "Owner",
              email: "hello@example.com",
              method: "drawn",
              signedAtMs: Date.parse("2026-10-20T10:00:00Z"),
              ip: "1.2.3.4",
              otpVerified: false,
              userAgent: "vitest",
            },
          ],
        },
      });
      const pdf = await renderPdf(html, {
        docNumber: "DOS-C-2026-0001",
        code: "ABCDEF001111",
      });
      expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
      mkdirSync(QA_DIR, { recursive: true });
      writeFileSync(join(QA_DIR, "contract-sealed.pdf"), pdf);
    },
  );

  for (const lang of ["ar", "en"] as const) {
    it(`generates a ${lang} invoice PDF`, { timeout: 60000 }, async () => {
      const html = renderInvoiceHtml({
        invoice: {
          id: "inv-1",
          number: "DOS-I-2026-0001",
          currency: "SAR",
          languageMode: "ar",
          status: "issued",
          issueDate: "2026-10-20",
          dueDate: "2026-11-03",
          projectLabel: "P-0001 — Online Store",
          contractNumber: "DOS-C-2026-0001",
          subtotalMinor: 400001,
          discountMinor: 0,
          netMinor: 400001,
          taxRateBp: 1500,
          taxMinor: 60000,
          totalMinor: 460001,
          paidMinor: 100000,
          notesAr: "ملاحظات",
          notesEn: "Notes",
          paymentInstructionsAr: "البنك: بنك المثال | الآيبان: SA00",
          paymentInstructionsEn: "Bank: Example Bank | IBAN: SA00",
        },
        lines: [
          {
            position: 1,
            descriptionAr: "عند التسليم",
            descriptionEn: "On delivery",
            qtyMilli: 1000,
            unitPriceMinor: 400001,
            lineTotalMinor: 400001,
          },
        ],
        seller: {
          nameAr: "ريد شادوز",
          nameEn: "RED SHADOWS",
          email: "h@example.com",
        },
        buyer: { nameAr: "شركة النور", nameEn: "Al-Noor Co." },
        payments: [
          {
            paidOn: "2026-10-25",
            amountMinor: 100000,
            method: "bank_transfer",
            reference: "TX1",
            voided: false,
          },
        ],
        lang,
        isOverdue: false,
        fonts: getFontCss(),
        logoDataUri: null,
        verification: {
          code: "ABCDEF001111",
          url: "https://dossier.example.com/v/ABCDEF001111",
          qrDataUri: "data:image/svg+xml;base64,PHN2Zy8+",
        },
      });
      const pdf = await renderPdf(html, {
        docNumber: "DOS-I-2026-0001",
        code: null,
        kind: "invoice",
        lang,
      });
      expect(pdf.subarray(0, 5).toString("ascii")).toBe("%PDF-");
      mkdirSync(QA_DIR, { recursive: true });
      writeFileSync(join(QA_DIR, `invoice-${lang}.pdf`), pdf);
    });
  }
});
