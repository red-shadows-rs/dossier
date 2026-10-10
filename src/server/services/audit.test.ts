// Dossier - Audit Tests
// https://github.com/red-shadows-rs/dossier

import { describe, expect, it } from "vitest";
import { count, eq } from "drizzle-orm";
import { db, withTx } from "@/db";
import { auditLog } from "@/db/schema";
import { audit, listAuditEntries } from "./audit";

function totalRows(): number {
  return db.select({ value: count() }).from(auditLog).get()?.value ?? 0;
}

function insertRow(overrides: {
  entityType: string;
  entityId?: string;
  action: string;
  ts: number;
  actorType?: "user" | "signer" | "system";
}): void {
  db.insert(auditLog)
    .values({
      ts: overrides.ts,
      actorType: overrides.actorType ?? "user",
      actorId: "actor-1",
      action: overrides.action,
      entityType: overrides.entityType,
      entityId: overrides.entityId ?? "entity-1",
    })
    .run();
}

describe("audit", () => {
  it("writes an audit row with meta and request fields", () => {
    const probe = "probe-write";
    withTx((tx) =>
      audit(tx, {
        actorType: "user",
        actorId: "u1",
        action: "test.action",
        entityType: probe,
        entityId: "c1",
        meta: { from: "draft", to: "sent" },
        ip: "1.1.1.1",
        userAgent: "vitest",
      }),
    );

    const row = db
      .select()
      .from(auditLog)
      .where(eq(auditLog.entityType, probe))
      .get();
    expect(row?.action).toBe("test.action");
    expect(row?.metaJson).toBe('{"from":"draft","to":"sent"}');
    expect(row?.ip).toBe("1.1.1.1");
  });

  it("rolls back the audit row when the transaction throws", () => {
    const before = totalRows();
    expect(() =>
      withTx((tx) => {
        audit(tx, {
          actorType: "user",
          actorId: "u1",
          action: "test.rollback",
          entityType: "probe-rollback",
          entityId: "x1",
        });
        throw new Error("boom");
      }),
    ).toThrow("boom");
    expect(totalRows()).toBe(before);
  });
});

describe("listAuditEntries", () => {
  it("filters by entity type and id", () => {
    const probe = "probe-filter";
    insertRow({
      entityType: probe,
      entityId: "a",
      action: "test.one",
      ts: 1000,
    });
    insertRow({
      entityType: probe,
      entityId: "b",
      action: "test.two",
      ts: 2000,
    });
    insertRow({
      entityType: "other",
      entityId: "a",
      action: "test.one",
      ts: 3000,
    });

    const byType = listAuditEntries({ entityType: probe });
    expect(byType.total).toBe(2);
    expect(byType.rows.every((row) => row.entityType === probe)).toBe(true);

    const byId = listAuditEntries({ entityType: probe, entityId: "a" });
    expect(byId.total).toBe(1);
    expect(byId.rows[0].entityId).toBe("a");
  });

  it("searches across fields with q and maps Arabic keywords", () => {
    const probe = "probe-q";
    insertRow({
      entityType: "invoice",
      entityId: "INV-9900",
      action: "invoice.created",
      ts: 1000,
    });
    insertRow({
      entityType: "contract",
      entityId: "CNT-1234",
      action: "contract.signed",
      ts: 2000,
    });
    insertRow({
      entityType: probe,
      entityId: "xyz-777",
      action: "auth.login",
      ts: 3000,
    });

    const searchById = listAuditEntries({ q: "9900" });
    expect(searchById.rows.some((r) => r.entityId === "INV-9900")).toBe(true);

    const searchByAction = listAuditEntries({ q: "signed" });
    expect(searchByAction.rows.some((r) => r.action === "contract.signed")).toBe(true);

    const searchArabicInvoice = listAuditEntries({ q: "فاتورة" });
    expect(searchArabicInvoice.rows.some((r) => r.entityType === "invoice")).toBe(true);

    const searchArabicContract = listAuditEntries({ q: "عقد" });
    expect(searchArabicContract.rows.some((r) => r.entityType === "contract")).toBe(true);
  });

  it("filters by action and date range", () => {
    const probe = "probe-dates";
    const jan1 = Date.UTC(2026, 0, 1, 12, 0, 0);
    const jan2 = Date.UTC(2026, 0, 2, 12, 0, 0);
    const feb1 = Date.UTC(2026, 1, 1, 12, 0, 0);
    insertRow({ entityType: probe, action: "test.keep", ts: jan1 });
    insertRow({ entityType: probe, action: "test.keep", ts: jan2 });
    insertRow({ entityType: probe, action: "test.drop", ts: feb1 });

    const byAction = listAuditEntries({
      entityType: probe,
      action: "test.keep",
    });
    expect(byAction.total).toBe(2);

    const byRange = listAuditEntries({
      entityType: probe,
      from: "2026-01-01",
      to: "2026-01-02",
    });
    expect(byRange.total).toBe(2);
    expect(byRange.rows.every((row) => row.action === "test.keep")).toBe(true);
  });

  it("orders newest first and paginates 20 per page", () => {
    const probe = "probe-page";
    for (let i = 0; i < 25; i += 1) {
      insertRow({ entityType: probe, action: "test.page", ts: 1000 + i });
    }

    const first = listAuditEntries({ entityType: probe, page: 1 });
    expect(first.total).toBe(25);
    expect(first.rows).toHaveLength(20);
    expect(first.rows[0].ts).toBe(1024);
    expect(first.rows[19].ts).toBe(1005);

    const second = listAuditEntries({ entityType: probe, page: 2 });
    expect(second.rows).toHaveLength(5);
    expect(second.rows[0].ts).toBe(1004);
  });

  it("clamps an invalid page to 1", () => {
    const probe = "probe-clamp";
    insertRow({ entityType: probe, action: "test.page", ts: 1 });
    expect(listAuditEntries({ entityType: probe, page: 0 }).page).toBe(1);
    expect(listAuditEntries({ entityType: probe, page: -3 }).page).toBe(1);
    expect(listAuditEntries({ entityType: probe, page: NaN }).page).toBe(1);
  });
});
