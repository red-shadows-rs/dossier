import { expect, test } from "@playwright/test";
import {
  contractVerificationCode,
  endDateIso,
  invoiceBalanceMinor,
  login,
  todayIso,
  waitForOutbox,
} from "./helpers";

// Shared across the serial tests below (workers: 1).
const state: { contractId?: string; verificationCode?: string } = {};

test.describe.serial("contract lifecycle (16.2 #1 + #2)", () => {
  test("contract signing then invoice payment", async ({ page }) => {
    test.setTimeout(180_000);
    await login(page);

    // 1. Client
    await page.goto("/clients/new");
    await page.locator("#client-nameAr").fill("عميل الاختبار");
    await page.locator("#client-nameEn").fill("E2E Client");
    await page.locator("#client-email").fill("client@e2e.test");
    // The client representative name is required to send (7.5 rule 7).
    await page.locator("#client-repNameAr").fill("ممثل العميل");
    await page.locator("#client-repNameEn").fill("E2E Client Rep");
    await page.getByRole("button", { name: "Save" }).click();
    // Negative lookahead: /clients/new also matches [^/]+, so exclude it.
    await page.waitForURL(/\/clients\/(?!new$)[^/]+$/);
    const clientId = page.url().split("/").pop() as string;

    // 2. Project
    await page.goto("/projects/new");
    await page.locator("#project-client").selectOption(clientId);
    await page.locator("#project-name-ar").fill("مشروع الاختبار");
    await page.locator("#project-name-en").fill("E2E Project");
    await page.getByRole("button", { name: "Save" }).click();
    await page.waitForURL(/\/projects\/(?!new$)[^/]+$/);
    const projectId = page.url().split("/").pop() as string;

    // 3. Contract draft from the first system template
    await page.goto("/contracts/new");
    await page.locator("#nc-project").selectOption(projectId);
    await page.locator("#nc-template").selectOption({ index: 1 });
    await page.getByRole("button", { name: "Create draft" }).click();
    await expect(page).toHaveURL(/\/contracts\/[^/]+\/edit$/);
    const contractId = new URL(page.url()).pathname.split("/")[2];
    state.contractId = contractId;

    // 4. Basics — scope (both languages) + start date
    await page.locator("#cb-scope-ar").fill("نطاق العمل: تصميم وتطوير الموقع.");
    await page
      .locator("#cb-scope-en")
      .fill("Scope: design and build the website.");
    await page.locator("#cb-start").fill(todayIso());
    // An end date is required by template clauses ({{contract.end_date}}).
    await page.locator("#cb-end").fill(endDateIso());
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Contract saved").first()).toBeVisible();

    // 5. Pricing — one item with a unit price
    await page.getByRole("button", { name: "Pricing" }).click();
    await page.locator("#item-ar-0").fill("خدمة التطوير");
    await page.locator("#item-en-0").fill("Development service");
    await page.locator("#item-unit-0").fill("1000");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Contract saved").first()).toBeVisible();

    // 6. Review + send
    await page.getByRole("button", { name: "Review & Send" }).click();
    const send = page.getByRole("button", { name: "Send contract" });
    await expect(send).toBeEnabled();
    await send.click();

    const dialog = page.getByRole("dialog");
    await dialog.locator("#send-client-name").fill("E2E Client Signatory");
    await dialog.locator("#send-client-email").fill("signer@e2e.test");
    await dialog.getByRole("button", { name: "Type", exact: true }).click();
    await dialog.locator("#send-typed").fill("E2E Owner");
    await dialog.locator('input[type="checkbox"]').check();
    await dialog.getByRole("button", { name: "Send", exact: true }).click();
    await expect(page.getByText("Contract sent").first()).toBeVisible();
    await expect(page.getByText("Sent", { exact: true }).first()).toBeVisible();

    // 7. Signing link from the outbox
    const link = await waitForOutbox("contract_signing_link");
    const token = link.payload.token as string;

    // 8. Open the public signing page (forced English UI), request + verify OTP
    await page.goto(`/s/${token}?lang=en`);
    await expect(
      page.getByRole("heading", { name: "Verify your email" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Send me a code" }).click();
    await expect(page.getByText("Code sent")).toBeVisible();

    const otp = await waitForOutbox("contract_otp");
    await page.locator("#otp-code").fill(otp.payload.otp as string);
    await page.getByRole("button", { name: "Verify", exact: true }).click();

    // 9. Sign (typed) with consent
    await page.getByRole("button", { name: "Type", exact: true }).click();
    await page.locator("#sign-typed").fill("E2E Client Signatory");
    await page.locator('input[type="checkbox"]').check();
    await page.getByRole("button", { name: "Sign contract" }).click();
    await expect(
      page.getByText("Thank you, your signature was recorded"),
    ).toBeVisible();

    // 10. Contract is signed and the sealed PDF downloads
    await page.goto(`/contracts/${contractId}`);
    await expect(
      page.getByText("Signed", { exact: true }).first(),
    ).toBeVisible();
    const pdf = await page.request.get(`/api/contracts/${contractId}/pdf`);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toContain("pdf");

    // 11. Create an invoice from the first milestone
    await page.goto(`/projects/${projectId}`);
    await page.getByRole("button", { name: "Create invoice" }).first().click();
    await expect(page).toHaveURL(/\/invoices\/[^/]+\/edit$/);
    const invoiceId = new URL(page.url()).pathname.split("/")[2];

    // 12. Issue the invoice
    await page.goto(`/invoices/${invoiceId}`);
    await page.getByRole("button", { name: "Issue invoice" }).click();
    await expect(page.getByText("Invoice issued").first()).toBeVisible();

    // 13. Record a payment covering the balance → Paid
    const balance = invoiceBalanceMinor(invoiceId);
    expect(balance).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Record payment" }).click();
    const payDialog = page.getByRole("dialog");
    await payDialog.locator("#pay-amount").fill((balance / 100).toFixed(2));
    await payDialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("Payment recorded").first()).toBeVisible();
    await expect(page.getByText("Paid", { exact: true }).first()).toBeVisible();

    state.verificationCode = contractVerificationCode(contractId);
  });

  test("verification page: valid code and not-found (16.2 #3)", async ({
    page,
  }) => {
    expect(state.verificationCode).toBeTruthy();
    await page.goto(`/v/${state.verificationCode}`);
    await expect(page.getByText("Valid", { exact: true })).toBeVisible();

    await page.goto("/v/ZZZZ-ZZZZ-ZZZZ");
    await expect(
      page.getByText("No document matches this code"),
    ).toBeVisible();
  });
});
