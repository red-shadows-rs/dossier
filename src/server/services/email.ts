// Dossier - Email Service
// https://github.com/red-shadows-rs/dossier

import { and, asc, eq, lte, sql } from "drizzle-orm";
import { db, type DbTx } from "@/db";
import { emailOutbox } from "@/db/schema";
import { nowMs } from "@/lib/dates";
import type { Locale } from "@/lib/constants";

export const EMAIL_TEMPLATE_KEYS = [
  "contract_signing_link",
  "contract_otp",
  "contract_signed_copy",
  "contract_declined_notice",
  "contract_expired_notice",
  "invoice_issued",
  "invoice_overdue_reminder",
  "receipt_issued",
  "internal_notice",
  "test_email",
] as const;

export type EmailTemplateKey = (typeof EMAIL_TEMPLATE_KEYS)[number];

export function isEmailTemplateKey(value: string): value is EmailTemplateKey {
  return (EMAIL_TEMPLATE_KEYS as readonly string[]).includes(value);
}

export type EnqueueEmailInput = {
  toEmail: string;
  toName?: string | null;
  locale?: Locale;
  templateKey: EmailTemplateKey;
  payload: Record<string, unknown>;
  entityType?: string | null;
  entityId?: string | null;
  scheduledAt?: number;
};

export function enqueueEmail(tx: DbTx, input: EnqueueEmailInput): string {
  const id = `${nowMs().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
  tx.insert(emailOutbox)
    .values({
      id,
      toEmail: input.toEmail,
      toName: input.toName ?? null,
      locale: input.locale ?? "en",
      templateKey: input.templateKey,
      payloadJson: JSON.stringify(input.payload),
      status: "pending",
      attempts: 0,
      scheduledAt: input.scheduledAt ?? nowMs(),
      entityType: input.entityType ?? null,
      entityId: input.entityId ?? null,
      createdAt: nowMs(),
    })
    .run();
  return id;
}

export function listPendingEmails(
  limit = 10,
): (typeof emailOutbox.$inferSelect)[] {
  return db
    .select()
    .from(emailOutbox)
    .where(
      and(
        eq(emailOutbox.status, "pending"),
        lte(emailOutbox.scheduledAt, nowMs()),
      ),
    )
    .orderBy(asc(emailOutbox.id))
    .limit(limit)
    .all();
}

export function countPendingEmails(): number {
  return (
    db
      .select({ value: sql<number>`count(*)` })
      .from(emailOutbox)
      .where(eq(emailOutbox.status, "pending"))
      .get()?.value ?? 0
  );
}
