import Database from "better-sqlite3";
import { expect, type Page } from "@playwright/test";
import { E2E_DB_PATH, OWNER_EMAIL, OWNER_PASSWORD } from "./config";

// The e2e stack runs with a temp DATA_DIR and no worker, so emails accumulate
// in the outbox. Tests read that table directly to get the signing link and
// the OTP code (16.2).
export type OutboxRow = {
  rowid: number;
  templateKey: string;
  payload: Record<string, unknown>;
  status: string;
};

function openDb(): Database.Database {
  return new Database(E2E_DB_PATH, { readonly: true, fileMustExist: true });
}

export function outboxRows(templateKey?: string): OutboxRow[] {
  const db = openDb();
  try {
    const rows = db
      .prepare(
        templateKey
          ? "SELECT rowid, template_key, payload_json, status FROM email_outbox WHERE template_key = ? ORDER BY rowid ASC"
          : "SELECT rowid, template_key, payload_json, status FROM email_outbox ORDER BY rowid ASC",
      )
      .all(...(templateKey ? [templateKey] : [])) as Array<{
      rowid: number;
      template_key: string;
      payload_json: string;
      status: string;
    }>;
    return rows.map((row) => ({
      rowid: row.rowid,
      templateKey: row.template_key,
      payload: JSON.parse(row.payload_json) as Record<string, unknown>,
      status: row.status,
    }));
  } finally {
    db.close();
  }
}

export async function waitForOutbox(
  templateKey: string,
  options: { afterRowid?: number; timeout?: number } = {},
): Promise<OutboxRow> {
  const after = options.afterRowid ?? 0;
  const deadline = Date.now() + (options.timeout ?? 15_000);
  let last: OutboxRow | undefined;
  while (Date.now() < deadline) {
    last = outboxRows(templateKey)
      .filter((row) => row.rowid > after)
      .at(-1);
    if (last) return last;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for outbox template ${templateKey}`);
}

export function latestRowid(): number {
  const rows = outboxRows();
  return rows.length ? (rows.at(-1)?.rowid ?? 0) : 0;
}

export function invoiceBalanceMinor(invoiceId: string): number {
  const db = openDb();
  try {
    const row = db
      .prepare("SELECT total_minor, paid_minor FROM invoices WHERE id = ?")
      .get(invoiceId) as { total_minor: number; paid_minor: number } | undefined;
    if (!row) throw new Error(`invoice not found: ${invoiceId}`);
    return row.total_minor - row.paid_minor;
  } finally {
    db.close();
  }
}

export function contractVerificationCode(contractId: string): string {
  const db = openDb();
  try {
    const row = db
      .prepare("SELECT verification_code FROM contracts WHERE id = ?")
      .get(contractId) as { verification_code: string | null } | undefined;
    if (!row?.verification_code) {
      throw new Error(`contract has no verification code: ${contractId}`);
    }
    return row.verification_code;
  } finally {
    db.close();
  }
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function endDateIso(): string {
  const date = new Date();
  date.setUTCFullYear(date.getUTCFullYear() + 1);
  return date.toISOString().slice(0, 10);
}

export async function login(page: Page): Promise<void> {
  await page.goto("/login");
  await page.locator('input[name="email"]').fill(OWNER_EMAIL);
  await page.locator('input[name="password"]').fill(OWNER_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

// Pick a select option by value (supports both native <select> and custom dropdowns).
export async function pickSelect(
  page: Page,
  selector: string,
  value: string,
): Promise<void> {
  const loc = page.locator(selector);
  const tagName = await loc.evaluate((el) => el.tagName.toLowerCase()).catch(() => "");
  if (tagName === "select") {
    await loc.selectOption(value);
    await loc.dispatchEvent("change");
    return;
  }
  const select = loc.locator("select");
  if ((await select.count()) > 0) {
    await select.selectOption(value);
    await select.dispatchEvent("change");
    return;
  }
  await loc.click();
  await page.locator(`li[data-value="${value}"]`).click();
}

// Pick an option by position (0-based).
export async function pickSelectIndex(
  page: Page,
  selector: string,
  index: number,
): Promise<void> {
  const loc = page.locator(selector);
  const tagName = await loc.evaluate((el) => el.tagName.toLowerCase()).catch(() => "");
  if (tagName === "select") {
    await loc.selectOption({ index });
    await loc.dispatchEvent("change");
    return;
  }
  const select = loc.locator("select");
  if ((await select.count()) > 0) {
    await select.selectOption({ index });
    await select.dispatchEvent("change");
    return;
  }
  await loc.click();
  await page.getByRole("option").nth(index).click();
}
