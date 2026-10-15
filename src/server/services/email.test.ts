import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, emailOutbox } from "@/db/schema";
import { nowMs } from "@/lib/dates";
import { newId } from "@/lib/ids";
import { saveFile } from "./files";
import {
  claimOutboxRow,
  processOutbox,
  type MailSender,
  type OutgoingMail,
} from "./email-worker";

type InsertOverrides = Partial<typeof emailOutbox.$inferInsert>;

function insertRow(overrides: InsertOverrides = {}): string {
  const id = newId();
  const now = nowMs();
  db.insert(emailOutbox)
    .values({
      id,
      toEmail: "client@example.test",
      toName: "Client",
      locale: "en",
      templateKey: "test_email",
      payloadJson: JSON.stringify({ note: "keep" }),
      status: "pending",
      attempts: 0,
      scheduledAt: now - 1000,
      createdAt: now - 1000,
      ...overrides,
    })
    .run();
  return id;
}

function getRow(id: string) {
  return db.select().from(emailOutbox).where(eq(emailOutbox.id, id)).get();
}

function recordingSender(): { sender: MailSender; sent: OutgoingMail[] } {
  const sent: OutgoingMail[] = [];
  return {
    sent,
    sender: {
      sendMail: async (mail) => {
        sent.push(mail);
      },
    },
  };
}

function failingSender(message = "smtp down"): MailSender {
  return {
    sendMail: async () => {
      throw new Error(message);
    },
  };
}

beforeEach(() => {
  db.delete(emailOutbox).run();
});

describe("processOutbox", () => {
  it("marks a row sent and redacts url/token/otp in the payload", async () => {
    const id = insertRow({
      payloadJson: JSON.stringify({
        url: "https://example.test/s/tok",
        token: "tok",
        otp: "123456",
        note: "keep",
      }),
    });
    const { sender, sent } = recordingSender();

    expect(await processOutbox(sender)).toBe(1);
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("client@example.test");

    const row = getRow(id);
    expect(row?.status).toBe("sent");
    expect(row?.sentAt).not.toBeNull();

    const payload = JSON.parse(row?.payloadJson ?? "{}");
    expect(payload.url).toBe("[redacted]");
    expect(payload.token).toBe("[redacted]");
    expect(payload.otp).toBe("[redacted]");
    expect(payload.note).toBe("keep");
  });

  it("reschedules with backoff on failure", async () => {
    const before = nowMs();
    const id = insertRow();

    await processOutbox(failingSender("boom"));

    const row = getRow(id);
    expect(row?.status).toBe("pending");
    expect(row?.attempts).toBe(1);
    expect(row?.lastError).toBe("boom");
    const delay = (row?.scheduledAt ?? 0) - before;
    expect(delay).toBeGreaterThanOrEqual(120_000);
    expect(delay).toBeLessThan(125_000);
  });

  it("marks failed after the 5th attempt and audits email.failed", async () => {
    const id = insertRow({ attempts: 4 });

    await processOutbox(failingSender("permanent"));

    const row = getRow(id);
    expect(row?.status).toBe("failed");
    expect(row?.attempts).toBe(5);

    const entries = db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityId, id))
      .all();
    expect(entries.some((entry) => entry.action === "email.failed")).toBe(true);
  });

  it("sends an Arabic signing link with dir=rtl", async () => {
    const id = insertRow({
      locale: "ar",
      templateKey: "contract_signing_link",
      payloadJson: JSON.stringify({
        titleAr: "عقد تطوير",
        number: "DOS-C-2026-0001",
        url: "https://example.test/s/tok",
      }),
    });
    const { sender, sent } = recordingSender();

    await processOutbox(sender);

    expect(sent).toHaveLength(1);
    expect(sent[0].html).toContain('dir="rtl"');
    expect(getRow(id)?.status).toBe("sent");
  });

  it("ignores rows that are not yet due", async () => {
    insertRow({ scheduledAt: nowMs() + 60_000 });
    const { sender, sent } = recordingSender();

    expect(await processOutbox(sender)).toBe(0);
    expect(sent).toHaveLength(0);
  });

  it("fails an unknown template key instead of throwing", async () => {
    const id = insertRow({ templateKey: "not_a_template" });
    const { sender, sent } = recordingSender();

    await processOutbox(sender);

    expect(sent).toHaveLength(0);
    expect(getRow(id)?.attempts).toBe(1);
    expect(getRow(id)?.status).toBe("pending");
  });

  it("attaches files referenced by attachmentFileIds", async () => {
    const file = saveFile({
      kind: "contract_pdf",
      buffer: Buffer.from("%PDF-1.4\n%%EOF"),
      originalName: "DOS-C-2026-0001.pdf",
      ownerType: "contract",
      ownerId: "c1",
    });
    insertRow({
      templateKey: "contract_signed_copy",
      payloadJson: JSON.stringify({
        number: "DOS-C-2026-0001",
        code: "ABCDEFGH1234",
        url: "https://example.test/v/ABCDEFGH1234",
        attachmentFileIds: [file.id],
      }),
    });
    const { sender, sent } = recordingSender();

    await processOutbox(sender);

    expect(sent).toHaveLength(1);
    expect(sent[0].attachments).toHaveLength(1);
    expect(sent[0].attachments?.[0].contentType).toBe("application/pdf");
    expect(sent[0].attachments?.[0].filename).toBe("DOS-C-2026-0001.pdf");
  });
});

describe("claimOutboxRow (race safety)", () => {
  it("claims a row once; a second claim changes 0 rows", () => {
    const id = insertRow();

    expect(claimOutboxRow(id)).toBe(1);
    expect(claimOutboxRow(id)).toBe(0);
    expect(getRow(id)?.status).toBe("sending");
  });
});
