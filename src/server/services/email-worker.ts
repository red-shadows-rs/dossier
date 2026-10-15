import nodemailer from "nodemailer";
import { and, asc, eq, lte } from "drizzle-orm";
import { db, withTx } from "@/db";
import { emailOutbox } from "@/db/schema";
import { nowMs } from "@/lib/dates";
import { isDocLang, type DocLang } from "@/lib/doc-lang";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { renderPdf } from "@/server/pdf/render";
import { audit } from "@/server/services/audit";
import {
  isEmailTemplateKey,
  type EmailTemplateKey,
} from "@/server/services/email";
import { renderEmail } from "@/server/services/email-templates";
import { readFile } from "@/server/services/files";
import { resolveInvoicePdf } from "@/server/services/invoice-documents";
import { getSettings } from "@/server/services/settings";

export type MailAttachment = {
  filename: string;
  content: Buffer;
  contentType: string;
};

export type OutgoingMail = {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
  attachments?: MailAttachment[];
};

export type MailSender = {
  sendMail(mail: OutgoingMail): Promise<unknown>;
};

export type OutboxRow = typeof emailOutbox.$inferSelect;

// Injectable so tests can avoid launching Chromium; the worker uses the real
// renderer. 15.1/7.9: the invoice PDF is rendered at send time, never inside a
// transaction.
export type OutboxDeps = {
  renderInvoiceAttachment?: (
    invoiceId: string,
    docLang: DocLang,
  ) => Promise<MailAttachment>;
};

const BATCH_SIZE = 10;
const MAX_ATTEMPTS = 5;
const BASE_BACKOFF_MS = 60_000;
const MAX_BACKOFF_MS = 60 * 60 * 1000;
const REDACT_KEYS = new Set(["url", "token", "otp"]);

// 15.1 — nodemailer transport from env; null when SMTP is not configured.
export function createTransport(): MailSender | null {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = env;
  if (!SMTP_HOST || SMTP_PORT === undefined) return null;
  const auth =
    SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined;
  const transport = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE ?? false,
    auth,
  });
  return {
    sendMail: (mail) => transport.sendMail(mail),
  };
}

function resolveSender(sender: MailSender | null): MailSender {
  if (sender) return sender;
  if (env.NODE_ENV === "production") {
    throw new AppError(
      "EMAIL_FAILED",
      "SMTP configuration is required in production",
    );
  }
  // Development fallback: never log the body (it may contain tokens/OTP — R13).
  return {
    sendMail: async (mail) => {
      logger.info("email_console", { to: mail.to, subject: mail.subject });
    },
  };
}

function parsePayload(payloadJson: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(payloadJson);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Corrupt payloads render with empty values rather than crashing the loop.
  }
  return {};
}

async function defaultRenderInvoiceAttachment(
  invoiceId: string,
  docLang: DocLang,
): Promise<MailAttachment> {
  const source = await resolveInvoicePdf(invoiceId, docLang);
  const pdf = await renderPdf(source.html, {
    docNumber: source.docNumber,
    code: null,
    kind: "invoice",
    lang: docLang,
  });
  return {
    filename: source.filename,
    content: pdf,
    contentType: "application/pdf",
  };
}

async function loadAttachments(
  payload: Record<string, unknown>,
  deps: OutboxDeps,
): Promise<MailAttachment[]> {
  const attachments: MailAttachment[] = [];

  const ids = payload.attachmentFileIds;
  if (Array.isArray(ids)) {
    for (const id of ids) {
      if (typeof id !== "string") continue;
      const file = readFile(id);
      attachments.push({
        filename: file.originalName ?? "document.pdf",
        content: file.buffer,
        contentType: file.mime,
      });
    }
  }

  const invoiceId = payload.invoiceId;
  if (typeof invoiceId === "string" && invoiceId) {
    const docLang: DocLang = isDocLang(payload.docLang)
      ? payload.docLang
      : "bilingual";
    const render =
      deps.renderInvoiceAttachment ?? defaultRenderInvoiceAttachment;
    attachments.push(await render(invoiceId, docLang));
  }

  return attachments;
}

function redactPayload(payloadJson: string): string {
  try {
    const parsed: unknown = JSON.parse(payloadJson);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: Record<string, unknown> = {
        ...(parsed as Record<string, unknown>),
      };
      for (const key of Object.keys(out)) {
        if (REDACT_KEYS.has(key.toLowerCase())) out[key] = "[redacted]";
      }
      return JSON.stringify(out);
    }
  } catch {
    // Leave the payload untouched if it is not valid JSON.
  }
  return payloadJson;
}// 15.1 — claim a row race-safely; returns the number of rows changed.
export function claimOutboxRow(id: string): number {
  return db
    .update(emailOutbox)
    .set({ status: "sending" })
    .where(and(eq(emailOutbox.id, id), eq(emailOutbox.status, "pending")))
    .run().changes;
}

function handleFailure(row: OutboxRow, error: unknown, now: number): void {
  const attempts = row.attempts + 1;
  const message = error instanceof Error ? error.message : String(error);
  const lastError = message.slice(0, 300);

  if (attempts >= MAX_ATTEMPTS) {
    withTx((tx) => {
      tx.update(emailOutbox)
        .set({ status: "failed", attempts, lastError })
        .where(eq(emailOutbox.id, row.id))
        .run();
      audit(tx, {
        actorType: "system",
        action: "email.failed",
        entityType: "email",
        entityId: row.id,
        meta: { templateKey: row.templateKey, attempts },
      });
    });
    logger.error("email_failed", {
      id: row.id,
      templateKey: row.templateKey,
      attempts,
    });
    return;
  }

  const delay = Math.min(BASE_BACKOFF_MS * 2 ** attempts, MAX_BACKOFF_MS);
  withTx((tx) => {
    tx.update(emailOutbox)
      .set({
        status: "pending",
        attempts,
        lastError,
        scheduledAt: now + delay,
      })
      .where(eq(emailOutbox.id, row.id))
      .run();
  });
  logger.warn("email_retry", {
    id: row.id,
    templateKey: row.templateKey,
    attempts,
  });
}

async function deliver(
  row: OutboxRow,
  sender: MailSender,
  deps: OutboxDeps,
): Promise<void> {
  const now = nowMs();
  try {
    if (!isEmailTemplateKey(row.templateKey)) {
      throw new AppError(
        "EMAIL_FAILED",
        `Unknown email template: ${row.templateKey}`,
      );
    }
    const templateKey: EmailTemplateKey = row.templateKey;
    const company = getSettings("company");
    const companyName = company.nameEn || company.nameAr || "Dossier";
    const emailSettings = getSettings("email");
    const fromName = emailSettings.fromName || companyName;
    const fromAddress = env.SMTP_FROM ?? "no-reply@localhost";
    const payload = parsePayload(row.payloadJson);

    const rendered = renderEmail(
      templateKey,
      row.locale,
      { ...payload, recipientName: row.toName ?? "" },
      companyName,
    );

    const attachments = await loadAttachments(payload, deps);

    await sender.sendMail({
      from: `${fromName} <${fromAddress}>`,
      to: row.toEmail,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      ...(attachments.length > 0 ? { attachments } : {}),
    });

    withTx((tx) => {
      tx.update(emailOutbox)
        .set({
          status: "sent",
          sentAt: now,
          lastError: null,
          payloadJson: redactPayload(row.payloadJson),
        })
        .where(eq(emailOutbox.id, row.id))
        .run();
    });
  } catch (error) {
    handleFailure(row, error, now);
  }
}

// 15.1 — send up to 10 due pending rows; returns how many were claimed.
export async function processOutbox(
  sender: MailSender | null,
  deps: OutboxDeps = {},
): Promise<number> {
  const resolved = resolveSender(sender);
  const rows = db
    .select()
    .from(emailOutbox)
    .where(
      and(
        eq(emailOutbox.status, "pending"),
        lte(emailOutbox.scheduledAt, nowMs()),
      ),
    )
    .orderBy(asc(emailOutbox.id))
    .limit(BATCH_SIZE)
    .all();

  let processed = 0;
  for (const row of rows) {
    if (claimOutboxRow(row.id) === 0) continue;
    processed += 1;
    await deliver(row, resolved, deps);
  }
  return processed;
}
