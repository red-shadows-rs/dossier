// Dossier - Email Templates Tests
// https://github.com/red-shadows-rs/dossier

import { describe, expect, it } from "vitest";
import { AppError } from "@/lib/errors";
import { renderEmail } from "./email-templates";

const COMPANY = "RED SHADOWS";

describe("renderEmail — contract_signing_link", () => {
  it("renders Arabic RTL HTML with the expected tokens", () => {
    const email = renderEmail(
      "contract_signing_link",
      "ar",
      {
        titleAr: "عقد تطوير",
        titleEn: "Development Agreement",
        number: "DOS-C-2026-0001",
        url: "https://example.test/s/tok_123",
        recipientName: "أحمد",
        expiresAt: 1_800_000_000_000,
      },
      COMPANY,
    );

    expect(email.html).toContain('dir="rtl"');
    expect(email.html).toContain("عقد تطوير");
    expect(email.html).toContain("DOS-C-2026-0001");
    expect(email.html).toContain("https://example.test/s/tok_123");
    expect(email.subject).toContain("عقد تطوير");
    expect(email.subject).toContain("DOS-C-2026-0001");
    expect(email.text).toContain("https://example.test/s/tok_123");
  });

  it("renders English LTR HTML with the expected tokens", () => {
    const email = renderEmail(
      "contract_signing_link",
      "en",
      {
        titleAr: "عقد تطوير",
        titleEn: "Development Agreement",
        number: "DOS-C-2026-0002",
        url: "https://example.test/s/tok_456",
        recipientName: "Jane",
        expiresAt: 1_800_000_000_000,
      },
      COMPANY,
    );

    expect(email.html).toContain('dir="ltr"');
    expect(email.subject).toBe(
      "Please review and sign: Development Agreement (DOS-C-2026-0002)",
    );
    expect(email.html).toContain("Review and sign");
    expect(email.text).toContain("Development Agreement (DOS-C-2026-0002)");
  });

  it("escapes hostile values in the HTML but keeps them in the text body", () => {
    const email = renderEmail(
      "contract_signing_link",
      "en",
      {
        titleEn: "<script>alert(1)</script>",
        number: "DOS-C-2026-0003",
        url: "https://example.test/s/tok",
        recipientName: "Eve",
      },
      COMPANY,
    );

    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.text).toContain("<script>alert(1)</script>");
  });
});

describe("renderEmail — contract_otp", () => {
  it("renders the code and the do-not-share warning", () => {
    const en = renderEmail("contract_otp", "en", { otp: "123456" }, COMPANY);
    expect(en.subject).toBe("Your verification code: 123456");
    expect(en.text).toContain("123456");
    expect(en.text).toContain("10 minutes");
    expect(en.html).toContain('dir="ltr"');

    const ar = renderEmail(
      "contract_otp",
      "ar",
      { otp: "654321" },
      COMPANY,
    );
    expect(ar.subject).toBe("رمز التحقق: 654321");
    expect(ar.html).toContain('dir="rtl"');
    expect(ar.text).toContain("10 دقائق");
  });
});

describe("renderEmail — test_email", () => {
  it("renders both languages with the fixed subjects", () => {
    const en = renderEmail("test_email", "en", {}, COMPANY);
    expect(en.subject).toBe("Dossier test email");
    expect(en.html).toContain("Sent by RED SHADOWS");

    const ar = renderEmail("test_email", "ar", {}, COMPANY);
    expect(ar.subject).toBe("رسالة اختبار من Dossier");
    expect(ar.html).toContain('dir="rtl"');
    expect(ar.html).toContain("أرسلت من RED SHADOWS");
  });
});

describe("renderEmail — contract_signed_copy", () => {
  it("renders the number, code and URL in both languages", () => {
    const en = renderEmail(
      "contract_signed_copy",
      "en",
      {
        titleEn: "Development Agreement",
        number: "DOS-C-2026-0001",
        code: "ABCDEFGH1234",
        url: "https://example.test/v/ABCDEFGH1234",
        recipientName: "Jane",
      },
      COMPANY,
    );
    expect(en.subject).toBe("Signed contract DOS-C-2026-0001");
    expect(en.text).toContain("All parties have signed");
    expect(en.text).toContain("ABCDEFGH1234");
    expect(en.html).toContain('dir="ltr"');

    const ar = renderEmail(
      "contract_signed_copy",
      "ar",
      {
        titleAr: "عقد تطوير",
        number: "DOS-C-2026-0001",
        code: "ABCDEFGH1234",
        url: "https://example.test/v/ABCDEFGH1234",
        recipientName: "خالد",
      },
      COMPANY,
    );
    expect(ar.subject).toBe("العقد الموقع DOS-C-2026-0001");
    expect(ar.html).toContain('dir="rtl"');
    expect(ar.text).toContain("ABCDEFGH1234");
  });
});

describe("renderEmail — invoice_issued", () => {
  it("renders the amount, due date and bank line in both languages", () => {
    const en = renderEmail(
      "invoice_issued",
      "en",
      {
        number: "DOS-I-2026-0001",
        amountFormatted: "5,750.00 SAR",
        dueDate: "2026-10-30",
        bankLine: "IBAN: SA0000000000000000000000",
        recipientName: "Jane",
      },
      COMPANY,
    );
    expect(en.subject).toBe("Invoice DOS-I-2026-0001 from RED SHADOWS");
    expect(en.text).toContain("5,750.00 SAR");
    expect(en.text).toContain("2026-10-30");
    expect(en.text).toContain("IBAN: SA0000000000000000000000");
    expect(en.html).toContain('dir="ltr"');

    const ar = renderEmail(
      "invoice_issued",
      "ar",
      {
        number: "DOS-I-2026-0001",
        amountFormatted: "5,750.00 SAR",
        dueDate: "2026-10-30",
        bankLine: "رقم الآيبان: SA0000000000000000000000",
        recipientName: "خالد",
      },
      COMPANY,
    );
    expect(ar.subject).toBe("فاتورة DOS-I-2026-0001 من RED SHADOWS");
    expect(ar.html).toContain('dir="rtl"');
    expect(ar.text).toContain("5,750.00 SAR");
  });

  it("escapes hostile values in the HTML", () => {
    const email = renderEmail(
      "invoice_issued",
      "en",
      {
        number: "<script>x</script>",
        amountFormatted: "1.00 SAR",
        bankLine: "<b>bank</b>",
      },
      COMPANY,
    );
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
  });
});

describe("renderEmail — invoice_overdue_reminder", () => {
  it("renders the balance and due date in both languages", () => {
    const en = renderEmail(
      "invoice_overdue_reminder",
      "en",
      {
        number: "DOS-I-2026-0002",
        balanceFormatted: "2,000.00 SAR",
        dueDate: "2026-09-01",
        recipientName: "Jane",
      },
      COMPANY,
    );
    expect(en.subject).toBe("Reminder: invoice DOS-I-2026-0002 is overdue");
    expect(en.text).toContain("2,000.00 SAR");
    expect(en.text).toContain("2026-09-01");

    const ar = renderEmail(
      "invoice_overdue_reminder",
      "ar",
      {
        number: "DOS-I-2026-0002",
        balanceFormatted: "2,000.00 SAR",
        dueDate: "2026-09-01",
        recipientName: "خالد",
      },
      COMPANY,
    );
    expect(ar.subject).toBe("تذكير: الفاتورة DOS-I-2026-0002 متأخرة السداد");
    expect(ar.html).toContain('dir="rtl"');
  });
});

describe("renderEmail — contract_declined_notice", () => {
  it("renders who declined and the reason in both languages", () => {
    const en = renderEmail(
      "contract_declined_notice",
      "en",
      {
        titleEn: "Development Agreement",
        number: "DOS-C-2026-0001",
        reason: "Price too high",
        declinedByName: "Jane Doe",
        recipientName: "Owner",
      },
      COMPANY,
    );
    expect(en.subject).toBe("Contract DOS-C-2026-0001 was declined");
    expect(en.text).toContain("Jane Doe declined the contract.");
    expect(en.text).toContain("Reason: Price too high");

    const ar = renderEmail(
      "contract_declined_notice",
      "ar",
      {
        titleAr: "عقد تطوير",
        number: "DOS-C-2026-0001",
        reason: "السعر مرتفع",
        declinedByName: "خالد النور",
        recipientName: "المالك",
      },
      COMPANY,
    );
    expect(ar.subject).toBe("تم رفض العقد DOS-C-2026-0001");
    expect(ar.html).toContain('dir="rtl"');
    expect(ar.text).toContain("خالد النور");
    expect(ar.text).toContain("السعر مرتفع");
  });
});

describe("renderEmail — unimplemented templates", () => {
  it("throws EMAIL_FAILED for keys not built yet", () => {
    try {
      renderEmail("internal_notice", "en", {}, COMPANY);
      throw new Error("expected throw");
    } catch (error) {
      expect((error as AppError).code).toBe("EMAIL_FAILED");
    }
  });
});
