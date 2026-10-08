import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import type { DbInstance, DbTx } from "@/db";
import {
  clients,
  contractClauses,
  contractItems,
  contracts,
  contractSignatories,
  contractVersions,
  emailOutbox,
  paymentMilestones,
  projects,
} from "@/db/schema";
import { createTestDb } from "@/db/test-db";
import { nowMs } from "@/lib/dates";
import { newId } from "@/lib/ids";

type ContractStatus = (typeof contracts.$inferSelect)["status"];

let db: DbInstance["db"];

beforeEach(() => {
  db = createTestDb().db;
});

function seedProject(): { clientId: string; projectId: string } {
  const now = nowMs();
  const clientId = newId();
  const projectId = newId();
  db.insert(clients)
    .values({
      id: clientId,
      type: "company",
      nameEn: "Client",
      preferredLanguage: "ar",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  db.insert(projects)
    .values({
      id: projectId,
      code: `P-${projectId.slice(0, 4)}`,
      clientId,
      nameEn: "Project",
      currency: "SAR",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return { clientId, projectId };
}

function createContract(
  ids: { clientId: string; projectId: string },
  status: ContractStatus = "draft",
): string {
  const id = newId();
  const now = nowMs();
  db.insert(contracts)
    .values({
      id,
      clientId: ids.clientId,
      projectId: ids.projectId,
      status,
      currency: "SAR",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return id;
}

function setStatus(contractId: string, status: ContractStatus): void {
  db.update(contracts)
    .set({ status })
    .where(eq(contracts.id, contractId))
    .run();
}

function createVersion(contractId: string): string {
  const id = newId();
  db.insert(contractVersions)
    .values({
      id,
      contractId,
      versionNo: 1,
      snapshotJson: "{}",
      contentHash: "hash",
      createdAt: nowMs(),
    })
    .run();
  return id;
}

describe("contract_versions immutability", () => {
  it("rejects UPDATE and DELETE", () => {
    const ids = seedProject();
    const contractId = createContract(ids);
    const versionId = createVersion(contractId);
    expect(() =>
      db
        .update(contractVersions)
        .set({ contentHash: "tampered" })
        .where(eq(contractVersions.id, versionId))
        .run(),
    ).toThrow(/immutable/);
    expect(() =>
      db
        .delete(contractVersions)
        .where(eq(contractVersions.id, versionId))
        .run(),
    ).toThrow(/immutable/);
  });
});

describe("signatories cannot be deleted", () => {
  it("rejects DELETE", () => {
    const ids = seedProject();
    const contractId = createContract(ids);
    const versionId = createVersion(contractId);
    const signatoryId = newId();
    db.insert(contractSignatories)
      .values({
        id: signatoryId,
        contractId,
        versionId,
        role: "client",
        name: "Signer",
        createdAt: nowMs(),
      })
      .run();
    expect(() =>
      db
        .delete(contractSignatories)
        .where(eq(contractSignatories.id, signatoryId))
        .run(),
    ).toThrow(/cannot be deleted/);
  });
});

describe("contracts_no_delete_sent", () => {
  it("allows deleting a plain draft but not a sent/numbered contract", () => {
    const ids = seedProject();
    const draftId = createContract(ids, "draft");
    expect(() =>
      db.delete(contracts).where(eq(contracts.id, draftId)).run(),
    ).not.toThrow();

    const sentId = createContract(ids, "sent");
    expect(() =>
      db.delete(contracts).where(eq(contracts.id, sentId)).run(),
    ).toThrow(/cannot be deleted/);

    const numberedDraft = createContract(ids, "draft");
    db.update(contracts)
      .set({ number: "DOS-C-2026-0001" })
      .where(eq(contracts.id, numberedDraft))
      .run();
    expect(() =>
      db.delete(contracts).where(eq(contracts.id, numberedDraft)).run(),
    ).toThrow(/cannot be deleted/);
  });
});

describe("contracts_signed_immutable", () => {
  it("freezes content columns once signed but allows status/timestamps", () => {
    const ids = seedProject();
    const contractId = createContract(ids);
    setStatus(contractId, "signed");

    expect(() =>
      db
        .update(contracts)
        .set({ titleEn: "Changed" })
        .where(eq(contracts.id, contractId))
        .run(),
    ).toThrow(/immutable/);
    expect(() =>
      db
        .update(contracts)
        .set({ totalMinor: 123 })
        .where(eq(contracts.id, contractId))
        .run(),
    ).toThrow(/immutable/);

    expect(() =>
      db
        .update(contracts)
        .set({ status: "completed", completedAt: nowMs() })
        .where(eq(contracts.id, contractId))
        .run(),
    ).not.toThrow();
  });
});

describe("contract children are editable only in draft", () => {
  it("rejects insert/update/delete of items, clauses and milestones once not draft", () => {
    const ids = seedProject();
    const contractId = createContract(ids);

    const itemId = newId();
    db.insert(contractItems)
      .values({
        id: itemId,
        contractId,
        position: 1,
        unitPriceMinor: 100,
        lineTotalMinor: 100,
      })
      .run();
    const clauseId = newId();
    db.insert(contractClauses)
      .values({
        id: clauseId,
        contractId,
        position: 1,
        titleAr: "بند",
        titleEn: "Clause",
        bodyAr: "نص",
        bodyEn: "text",
      })
      .run();
    const milestoneId = newId();
    db.insert(paymentMilestones)
      .values({
        id: milestoneId,
        contractId,
        position: 1,
        titleAr: "دفعة",
        titleEn: "Milestone",
        amountMinor: 100,
        totalMinor: 100,
      })
      .run();

    setStatus(contractId, "sent");

    expect(() =>
      db
        .insert(contractItems)
        .values({
          id: newId(),
          contractId,
          position: 2,
          unitPriceMinor: 1,
          lineTotalMinor: 1,
        })
        .run(),
    ).toThrow(/not editable/);
    expect(() =>
      db
        .update(contractItems)
        .set({ position: 3 })
        .where(eq(contractItems.id, itemId))
        .run(),
    ).toThrow(/not editable/);
    expect(() =>
      db.delete(contractItems).where(eq(contractItems.id, itemId)).run(),
    ).toThrow(/not editable/);

    expect(() =>
      db
        .insert(contractClauses)
        .values({
          id: newId(),
          contractId,
          position: 2,
          titleAr: "ب",
          titleEn: "C",
          bodyAr: "ن",
          bodyEn: "t",
        })
        .run(),
    ).toThrow(/not editable/);
    expect(() =>
      db
        .update(contractClauses)
        .set({ position: 4 })
        .where(eq(contractClauses.id, clauseId))
        .run(),
    ).toThrow(/not editable/);
    expect(() =>
      db.delete(contractClauses).where(eq(contractClauses.id, clauseId)).run(),
    ).toThrow(/not editable/);

    expect(() =>
      db
        .insert(paymentMilestones)
        .values({
          id: newId(),
          contractId,
          position: 2,
          titleAr: "د",
          titleEn: "M",
          amountMinor: 1,
          totalMinor: 1,
        })
        .run(),
    ).toThrow(/not editable/);
    expect(() =>
      db
        .update(paymentMilestones)
        .set({ position: 5 })
        .where(eq(paymentMilestones.id, milestoneId))
        .run(),
    ).toThrow(/not editable/);
    expect(() =>
      db
        .delete(paymentMilestones)
        .where(eq(paymentMilestones.id, milestoneId))
        .run(),
    ).toThrow(/not editable/);
  });
});

describe("CHECK constraints", () => {
  it("rejects an invalid currency length on contracts", () => {
    const ids = seedProject();
    expect(() =>
      db
        .insert(contracts)
        .values({
          id: newId(),
          clientId: ids.clientId,
          projectId: ids.projectId,
          currency: "SARX",
          createdAt: 0,
          updatedAt: 0,
        })
        .run(),
    ).toThrow();
  });

  it("rejects negative money and out-of-range tax rate", () => {
    const ids = seedProject();
    const base = {
      id: newId(),
      clientId: ids.clientId,
      projectId: ids.projectId,
      currency: "SAR",
      createdAt: 0,
      updatedAt: 0,
    };
    expect(() =>
      db
        .insert(contracts)
        .values({ ...base, totalMinor: -1 })
        .run(),
    ).toThrow();
    expect(() =>
      db
        .insert(contracts)
        .values({ ...base, taxRateBp: 10001 })
        .run(),
    ).toThrow();
  });

  it("rejects qty_milli <= 0 and position < 1 on items", () => {
    const ids = seedProject();
    const contractId = createContract(ids);
    const base = {
      id: newId(),
      contractId,
      position: 1,
      unitPriceMinor: 1,
      lineTotalMinor: 1,
    };
    expect(() =>
      db
        .insert(contractItems)
        .values({ ...base, qtyMilli: 0 })
        .run(),
    ).toThrow();
    expect(() =>
      db
        .insert(contractItems)
        .values({ ...base, position: 0 })
        .run(),
    ).toThrow();
  });

  it("rejects position < 1 on clauses and milestones", () => {
    const ids = seedProject();
    const contractId = createContract(ids);
    expect(() =>
      db
        .insert(contractClauses)
        .values({
          id: newId(),
          contractId,
          position: 0,
          titleAr: "ب",
          titleEn: "C",
          bodyAr: "ن",
          bodyEn: "t",
        })
        .run(),
    ).toThrow();
    expect(() =>
      db
        .insert(paymentMilestones)
        .values({
          id: newId(),
          contractId,
          position: 0,
          titleAr: "د",
          titleEn: "M",
          amountMinor: 1,
          totalMinor: 1,
        })
        .run(),
    ).toThrow();
  });

  it("rejects negative attempts on email_outbox", () => {
    expect(() =>
      db
        .insert(emailOutbox)
        .values({
          id: newId(),
          toEmail: "a@b.co",
          templateKey: "contract_signing_link",
          payloadJson: "{}",
          scheduledAt: 0,
          attempts: -1,
          createdAt: 0,
        })
        .run(),
    ).toThrow();
  });
});

describe("triggers cooperate with transactions", () => {
  it("rolls back a signed-immutability violation inside a transaction", () => {
    const ids = seedProject();
    const contractId = createContract(ids);
    setStatus(contractId, "signed");
    expect(() =>
      db.transaction((tx: DbTx) => {
        tx.update(contracts)
          .set({ titleEn: "x" })
          .where(eq(contracts.id, contractId))
          .run();
      }),
    ).toThrow(/immutable/);
    const row = db
      .select()
      .from(contracts)
      .where(eq(contracts.id, contractId))
      .get();
    expect(row?.titleEn).toBeNull();
  });
});
