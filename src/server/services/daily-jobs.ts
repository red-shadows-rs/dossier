// Dossier - Daily Jobs Service
// https://github.com/red-shadows-rs/dossier

import { and, eq, inArray, lt, sql } from "drizzle-orm";
import { db, withTx } from "@/db";
import { clients, invoices } from "@/db/schema";
import type { CurrencyCode } from "@/lib/constants";
import { daysBetween, nowMs } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { logger } from "@/lib/logger";
import { workerStateSchema } from "@/lib/validation/settings";
import { audit } from "@/server/services/audit";
import { runBackup } from "@/server/services/backups";
import { enqueueEmail } from "@/server/services/email";
import { localeForInvoice } from "@/server/services/invoices";
import {
  getInternalSetting,
  getSettings,
  setInternalSetting,
} from "@/server/services/settings";

const REMINDER_HOUR = 8;
const BACKUP_HOUR = 3;

function dateInTz(ms: number, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

function hourInTz(ms: number, tz: string): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    hour12: false,
  }).format(new Date(ms));
  return Number(hour) % 24;
}

export function sendOverdueReminders(
  today: string,
  atMs: number = nowMs(),
): number {
  const emailSettings = getSettings("email");
  if (!emailSettings.overdueRemindersEnabled) return 0;

  const tz = getSettings("defaults").timezone;
  const now = atMs;
  const rows = db
    .select()
    .from(invoices)
    .where(
      and(
        inArray(invoices.status, ["issued", "partially_paid"]),
        sql`${invoices.dueDate} IS NOT NULL`,
        lt(invoices.dueDate, today),
      ),
    )
    .all();

  let sent = 0;
  for (const invoice of rows) {
    if (invoice.dueDate === null) continue;
    const daysOverdue = daysBetween(invoice.dueDate, today);
    if (!emailSettings.overdueReminderDays.includes(daysOverdue)) continue;
    if (
      invoice.lastReminderAt !== null &&
      dateInTz(invoice.lastReminderAt, tz) === today
    ) {
      continue;
    }
    const client = db
      .select()
      .from(clients)
      .where(eq(clients.id, invoice.clientId))
      .get();
    const toEmail = client?.email?.trim();
    if (!client || !toEmail) continue;

    const locale = localeForInvoice(
      invoice.languageMode,
      client.preferredLanguage,
    );
    const currency = invoice.currency as CurrencyCode;
    const balanceMinor = invoice.totalMinor - invoice.paidMinor;
    const bankLine =
      (locale === "ar"
        ? invoice.paymentInstructionsAr
        : invoice.paymentInstructionsEn) ?? "";
    const recipientName = client.nameAr ?? client.nameEn ?? "";

    withTx((tx) => {
      enqueueEmail(tx, {
        toEmail,
        toName: recipientName || null,
        locale,
        templateKey: "invoice_overdue_reminder",
        payload: {
          number: invoice.number,
          balanceFormatted: formatMoney(balanceMinor, currency, locale),
          dueDate: invoice.dueDate,
          bankLine,
          invoiceId: invoice.id,
          docLang: invoice.languageMode,
          recipientName,
        },
        entityType: "invoice",
        entityId: invoice.id,
      });
      tx.update(invoices)
        .set({ lastReminderAt: now })
        .where(eq(invoices.id, invoice.id))
        .run();
      audit(tx, {
        actorType: "system",
        action: "invoice.reminder_sent",
        entityType: "invoice",
        entityId: invoice.id,
        meta: { daysOverdue },
      });
    });
    sent += 1;
  }
  return sent;
}

export async function runDailyJobs(atMs: number = nowMs()): Promise<void> {
  const tz = getSettings("defaults").timezone;
  const today = dateInTz(atMs, tz);
  const hour = hourInTz(atMs, tz);
  const state = getInternalSetting("worker_state", workerStateSchema) ?? {
    lastReminderDate: null,
    lastBackupDate: null,
  };

  if (hour === REMINDER_HOUR && state.lastReminderDate !== today) {
    const sent = sendOverdueReminders(today, atMs);
    setInternalSetting("worker_state", { ...state, lastReminderDate: today });
    logger.info("daily_reminders", { sent, date: today });
  }

  if (hour === BACKUP_HOUR && state.lastBackupDate !== today) {
    await runBackup(atMs);
    setInternalSetting("worker_state", { ...state, lastBackupDate: today });
    logger.info("daily_backup", { date: today });
  }
}
