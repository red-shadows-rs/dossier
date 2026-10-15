import { describe, expect, it } from "vitest";
import { renderInvoiceHtml, type InvoiceHtmlInput } from "./html/invoice";
import { renderReceiptHtml } from "./html/receipt";

function input(overrides: Partial<InvoiceHtmlInput> = {}): InvoiceHtmlInput {
  const base: InvoiceHtmlInput = {
    invoice: {
      id: "inv-1",
      number: "DOS-I-2026-0001",
      currency: "SAR",
      languageMode: "bilingual",
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
      paidMinor: 0,
      notesAr: null,
      notesEn: null,
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
      crNumber: "1010123456",
      taxNumber: "300012345600003",
      addressEn: "Riyadh, Saudi Arabia",
      email: "hello@example.com",
      phone: "+966500000000",
    },
    buyer: {
      nameAr: "شركة النور",
      nameEn: "Al-Noor Co.",
      taxNumber: "300099988800003",
    },
    payments: [],
    lang: "bilingual",
    isOverdue: false,
    fonts: "/*fonts*/",
    logoDataUri: null,
    verification: null,
  };
  return { ...base, ...overrides };
}

describe("renderInvoiceHtml — watermarks and stamps", () => {
  it("shows the DRAFT watermark for a draft", () => {
    const html = renderInvoiceHtml(
      input({ invoice: { ...input().invoice, status: "draft", number: null } }),
    );
    expect(html).toContain("DRAFT / مسودة");
    expect(html).toContain('class="watermark"');
  });

  it("shows the VOID watermark for a void invoice", () => {
    const html = renderInvoiceHtml(
      input({ invoice: { ...input().invoice, status: "void" } }),
    );
    expect(html).toContain("VOID / ملغاة");
  });

  it("shows a PAID stamp (not a watermark) when paid", () => {
    const html = renderInvoiceHtml(
      input({
        invoice: { ...input().invoice, status: "paid", paidMinor: 460001 },
      }),
    );
    expect(html).toContain("PAID / مدفوعة");
    expect(html).not.toContain('class="watermark"');
  });

  it("shows the overdue tag next to the due date", () => {
    const html = renderInvoiceHtml(input({ isOverdue: true }));
    expect(html).toContain("OVERDUE / متأخرة");
  });
});

describe("renderInvoiceHtml — money and totals", () => {
  it("prints money with the num span and tax percent", () => {
    const html = renderInvoiceHtml(input());
    expect(html).toContain("4,000.01 SAR");
    expect(html).toContain("600.00 SAR");
    expect(html).toContain("4,600.01 SAR");
    expect(html).toContain("Tax / الضريبة (15%)");
    expect(html).toContain('class="num"');
  });

  it("hides the discount row when zero and shows paid/balance in totals while omitting payments table from invoice", () => {
    const none = renderInvoiceHtml(input());
    expect(none).not.toContain("Discount / الخصم");

    const paidInput = input({
      invoice: { ...input().invoice, paidMinor: 100000 },
      payments: [
        {
          paidOn: "2026-10-25",
          amountMinor: 100000,
          method: "bank_transfer",
          reference: "TX1",
          voided: false,
        },
      ],
    });

    const paidInvoice = renderInvoiceHtml(paidInput);
    expect(paidInvoice).toContain("Paid / المدفوع");
    expect(paidInvoice).toContain("Balance due / المتبقي");
    expect(paidInvoice).not.toContain("Payments / الدفعات");

    const receiptHtml = renderReceiptHtml(paidInput);
    expect(receiptHtml).toContain("RECEIPT");
    expect(receiptHtml).toContain("TX1");
  });

  it("omits voided payments from the receipt voucher", () => {
    const receiptHtml = renderReceiptHtml(
      input({
        invoice: { ...input().invoice, paidMinor: 0 },
        payments: [
          {
            paidOn: "2026-10-25",
            amountMinor: 100000,
            method: "cash",
            reference: "VOIDED-REF",
            voided: true,
          },
        ],
      }),
    );
    expect(receiptHtml).not.toContain("VOIDED-REF");
  });
});

describe("renderInvoiceHtml — language", () => {
  it("bilingual shows both EN and AR line descriptions", () => {
    const html = renderInvoiceHtml(input({ lang: "bilingual" }));
    expect(html).toContain("On delivery");
    expect(html).toContain("عند التسليم");
  });

  it("ar mode is rtl", () => {
    const html = renderInvoiceHtml(input({ lang: "ar" }));
    expect(html).toContain('dir="rtl"');
  });

  it("en mode is strictly English without bilingual Arabic labels", () => {
    const html = renderInvoiceHtml(
      input({
        lang: "en",
        verification: {
          code: "ABCDEF001111",
          url: "https://dossier.example.com/v/ABCDEF001111",
          qrDataUri: "data:image/svg+xml;base64,QR",
        },
      }),
    );
    expect(html).toContain("Subtotal");
    expect(html).not.toContain("المجموع الفرعي");
    expect(html).toContain("Net");
    expect(html).not.toContain("الصافي");
    expect(html).toContain("TOTAL DUE");
    expect(html).not.toContain("الإجمالي");
    expect(html).toContain("Invoice to:");
    expect(html).not.toContain("الفاتورة إلى:");
    expect(html).toContain("Invoice generated by Dossier");
    expect(html).toContain("Verification · Barcode");
  });
});

describe("renderInvoiceHtml — escaping and legal", () => {
  it("escapes hostile values", () => {
    const html = renderInvoiceHtml(
      input({
        buyer: {
          nameEn: '<script>alert("x")</script>',
          nameAr: null,
        },
        lines: [
          {
            position: 1,
            descriptionAr: null,
            descriptionEn: "A & B < C",
            qtyMilli: 1000,
            unitPriceMinor: 100,
            lineTotalMinor: 100,
          },
        ],
      }),
    );
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("A &amp; B &lt; C");
  });

  it("never claims to be a tax invoice", () => {
    for (const lang of ["ar", "en", "bilingual"] as const) {
      const html = renderInvoiceHtml(input({ lang })).toLowerCase();
      expect(html).not.toContain("tax invoice");
      expect(html).not.toContain("فاتورة ضريبية");
    }
  });

  it("includes the verification block only when a code is present", () => {
    const withCode = renderInvoiceHtml(
      input({
        verification: {
          code: "ABCDEF001111",
          url: "https://dossier.example.com/v/ABCDEF001111",
          qrDataUri: "data:image/svg+xml;base64,QR",
        },
      }),
    );
    expect(withCode).toContain("Verification / التحقق");
    expect(withCode).toContain("Invoice generated by Dossier");

    const without = renderInvoiceHtml(input());
    expect(without).not.toContain("Verification / التحقق");
  });
});
