import { describe, expect, it } from "vitest";
import { SAMPLE_SNAPSHOT } from "@/server/templating/sample-snapshot";
import type { ContractSnapshotV1 } from "@/server/templating/variables";
import { renderContractHtml, type ContractHtmlInput } from "./html/contract";
import type { SignatureRender } from "./html/shared";

function fixture(
  overrides: Partial<ContractSnapshotV1> = {},
): ContractSnapshotV1 {
  return {
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
        titleAr: "الأتعاب",
        titleEn: "Fees",
        bodyAr:
          "الإجمالي **{{contract.total}}**.\n\n{{block.pricing_table}}\n\n{{block.payment_schedule}}",
        bodyEn:
          "Total **{{contract.total}}**.\n\n{{block.pricing_table}}\n\n{{block.payment_schedule}}",
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
    ...overrides,
  };
}

const SIGNATURES: SignatureRender[] = [
  {
    role: "provider",
    name: "RED SHADOWS | RS",
    title: "Owner",
    signedAtMs: Date.parse("2026-10-20T10:00:00Z"),
    method: "drawn",
    imageDataUri: "data:image/png;base64,AAAA",
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

function input(overrides: Partial<ContractHtmlInput> = {}): ContractHtmlInput {
  return {
    snapshot: fixture(),
    lang: "en",
    mode: "draft",
    fonts: "/*fonts*/",
    logoDataUri: "data:image/png;base64,LOGO",
    stampDataUri: "data:image/png;base64,STAMP",
    signatures: SIGNATURES,
    verification: null,
    certificate: null,
    ...overrides,
  };
}

describe("renderContractHtml — escaping", () => {
  it("escapes hostile snapshot values", () => {
    const snapshot = fixture({
      client: {
        ...SAMPLE_SNAPSHOT.client,
        nameEn: '<script>alert("x")</script>',
        addressEn: "A & B < C",
      },
    });
    const html = renderContractHtml(input({ snapshot }));
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("A &amp; B &lt; C");
  });

  it("escapes clause body literal text", () => {
    const snapshot = fixture({
      clauses: [
        {
          position: 1,
          key: null,
          titleAr: "بند",
          titleEn: "Clause",
          bodyAr: "نص",
          bodyEn: "Danger <img src=x onerror=alert(1)> end",
        },
      ],
    });
    const html = renderContractHtml(input({ snapshot }));
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
  });

  it("escapes item/milestone descriptions in single-language mode", () => {
    const snapshot = fixture({
      items: [
        {
          position: 1,
          descriptionAr: null,
          descriptionEn: "Evil <b>bold</b> item",
          qtyMilli: 1000,
          unitPriceMinor: 100,
          lineTotalMinor: 100,
        },
      ],
      milestones: [
        {
          position: 1,
          titleAr: "",
          titleEn: "Milestone <script>x</script>",
          percentBp: 10000,
          amountMinor: 100,
          taxMinor: 0,
          totalMinor: 100,
          dueDate: null,
          triggerNoteAr: null,
          triggerNoteEn: null,
        },
      ],
    });
    const html = renderContractHtml(input({ snapshot, lang: "en" }));
    expect(html).not.toContain("<b>bold</b>");
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;b&gt;bold&lt;/b&gt;");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("renderContractHtml — modes", () => {
  it("draft/preview show the watermark and no number when null", () => {
    const snapshot = fixture({
      contract: { ...SAMPLE_SNAPSHOT.contract, number: null },
    });
    const draft = renderContractHtml(input({ snapshot, mode: "draft" }));
    expect(draft).toContain("DRAFT / مسودة");
    expect(draft).toContain('class="watermark"');

    const preview = renderContractHtml(input({ snapshot, mode: "preview" }));
    expect(preview).toContain("DRAFT / مسودة");
  });

  it("unsigned has no watermark but shows the unsigned note", () => {
    const html = renderContractHtml(input({ mode: "unsigned" }));
    expect(html).not.toContain('class="watermark"');
    expect(html).toContain("UNSIGNED");
    expect(html).toContain("غير موقع");
  });

  it("sealed includes the verification block, hash and certificate", () => {
    const html = renderContractHtml(
      input({
        mode: "sealed",
        lang: "bilingual",
        verification: {
          code: "ABCDEF001111",
          url: "https://dossier.example.com/v/ABCDEF001111",
          qrDataUri: "data:image/svg+xml;base64,QR",
        },
        certificate: {
          contentHash: "deadbeef".repeat(8),
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
      }),
    );
    expect(html).toContain("Certificate of Completion");
    expect(html).toContain("شهادة إتمام التوقيع");
    expect(html).toContain("SHA-256");
    expect(html).toContain("deadbeef");
    expect(html).toContain("ABCD-EF00-1111");
    expect(html).toContain('class="cert"');
  });

  it("renders the stamp near the provider signature", () => {
    const html = renderContractHtml(
      input({ mode: "sealed", signatures: SIGNATURES }),
    );
    expect(html).toContain("data:image/png;base64,STAMP");
    expect(html).toContain("Signed electronically on 2026-10-20 10:00 UTC");
  });
});

describe("renderContractHtml — language modes", () => {
  it("ar mode sets rtl and Arabic headings", () => {
    const html = renderContractHtml(input({ lang: "ar" }));
    expect(html).toContain('dir="rtl"');
    expect(html).toContain("المادة (1)");
  });

  it("en mode sets ltr and English headings", () => {
    const html = renderContractHtml(input({ lang: "en" }));
    expect(html).toContain('dir="ltr"');
    expect(html).toContain("Article 1 —");
  });

  it("bilingual mode renders two-cell clause rows with both languages", () => {
    const html = renderContractHtml(input({ lang: "bilingual" }));
    expect(html).toContain('class="bilingual-clause"');
    expect(html).toContain("Article 2 —");
    expect(html).toContain("المادة (2):");
    expect(html).toContain("Description");
    expect(html).toContain("الوصف");
  });
});

describe("renderContractHtml — tables and money", () => {
  it("renders pricing rows with money and tabular numbers", () => {
    const html = renderContractHtml(input({ lang: "en" }));
    expect(html).toContain("UI/UX design");
    expect(html).toContain("8,000.00 SAR");
    expect(html).toContain("21,850.00 SAR");
    expect(html).toContain('class="num"');
  });

  it("renders the payment schedule with percent and amounts", () => {
    const html = renderContractHtml(input({ lang: "en" }));
    expect(html).toContain("Advance upon signing");
    expect(html).toContain("40.00%");
    expect(html).toContain("7,600.00 SAR");
  });

  it("repeats table headers via thead", () => {
    const html = renderContractHtml(input({ lang: "en" }));
    expect((html.match(/<thead>/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
});
