import { and, asc, count, desc, eq, isNull, sql, type SQL } from "drizzle-orm";
import { db, withTx, type DbTx } from "@/db";
import {
  contractClauses,
  contractItems,
  contracts,
  paymentMilestones,
  projects,
  templateClauses,
  templates,
} from "@/db/schema";
import { nowMs } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { newId } from "@/lib/ids";
import { allocateProportional } from "@/lib/money";
import type { CONTRACT_STATUSES } from "@/lib/constants";
import { templateDefaultsSchema } from "@/lib/validation/template";
import type {
  ContractClauseInput,
  CreateContractInput,
  SaveItemsInput,
  SaveMilestonesInput,
  UpdateBasicsInput,
} from "@/lib/validation/contracts";
import type { RequestMeta, SessionUser } from "@/server/auth/session";
import { audit } from "@/server/services/audit";
import { getSettings } from "@/server/services/settings";
import { calcTotals, type CalcInput, type CalcOutput } from "./contract-calc";
import { planMilestones } from "./milestones";
import { validateTemplateClauses } from "@/server/templating/validate";

export const CONTRACTS_PAGE_SIZE = 20;

export type ContractRow = typeof contracts.$inferSelect;
export type ContractStatus = (typeof CONTRACT_STATUSES)[number];
export type ContractItemRow = typeof contractItems.$inferSelect;
export type ContractClauseRow = typeof contractClauses.$inferSelect;
export type PaymentMilestoneRow = typeof paymentMilestones.$inferSelect;

export type ContractFilters = {
  q?: string;
  status?: ContractStatus;
  projectId?: string;
  clientId?: string;
  page?: number;
};

export type ContractPage = {
  rows: ContractRow[];
  total: number;
  page: number;
  pageSize: number;
};

function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (char) => `\\${char}`);
}

export function listContracts(filters: ContractFilters = {}): ContractPage {
  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(contracts.status, filters.status));
  if (filters.projectId)
    conditions.push(eq(contracts.projectId, filters.projectId));
  if (filters.clientId)
    conditions.push(eq(contracts.clientId, filters.clientId));
  const q = filters.q?.trim();
  if (q) {
    const pattern = `%${escapeLike(q.toLowerCase())}%`;
    conditions.push(
      sql`(lower(${contracts.number}) LIKE ${pattern} ESCAPE '\\' OR lower(${contracts.titleAr}) LIKE ${pattern} ESCAPE '\\' OR lower(${contracts.titleEn}) LIKE ${pattern} ESCAPE '\\')`,
    );
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const total =
    db.select({ value: count() }).from(contracts).where(where).get()?.value ??
    0;
  const requestedPage = filters.page ?? 1;
  const page =
    Number.isFinite(requestedPage) && requestedPage >= 1
      ? Math.floor(requestedPage)
      : 1;

  const rows = db
    .select()
    .from(contracts)
    .where(where)
    .orderBy(desc(contracts.createdAt), desc(contracts.id))
    .limit(CONTRACTS_PAGE_SIZE)
    .offset((page - 1) * CONTRACTS_PAGE_SIZE)
    .all();

  return { rows, total, page, pageSize: CONTRACTS_PAGE_SIZE };
}

export function getContract(id: string): ContractRow {
  const row = db.select().from(contracts).where(eq(contracts.id, id)).get();
  if (!row) {
    throw new AppError("NOT_FOUND", "Contract not found");
  }
  return row;
}

export type ContractDetail = {
  contract: ContractRow;
  items: ContractItemRow[];
  milestones: PaymentMilestoneRow[];
  clauses: ContractClauseRow[];
};

export function getContractDetail(id: string): ContractDetail {
  const contract = getContract(id);
  const items = db
    .select()
    .from(contractItems)
    .where(eq(contractItems.contractId, id))
    .orderBy(asc(contractItems.position))
    .all();
  const milestones = db
    .select()
    .from(paymentMilestones)
    .where(eq(paymentMilestones.contractId, id))
    .orderBy(asc(paymentMilestones.position))
    .all();
  const clauses = db
    .select()
    .from(contractClauses)
    .where(eq(contractClauses.contractId, id))
    .orderBy(asc(contractClauses.position))
    .all();
  return { contract, items, milestones, clauses };
}

function assertDraft(tx: DbTx, id: string): ContractRow {
  const row = tx.select().from(contracts).where(eq(contracts.id, id)).get();
  if (!row) {
    throw new AppError("NOT_FOUND", "Contract not found");
  }
  if (row.status !== "draft") {
    throw new AppError("INVALID_STATE", "Only drafts can be edited");
  }
  return row;
}

function writeItems(
  tx: DbTx,
  contractId: string,
  input: CalcInput,
): CalcOutput {
  const result = calcTotals(input);
  tx.delete(contractItems)
    .where(eq(contractItems.contractId, contractId))
    .run();
  input.items.forEach((item, index) => {
    tx.insert(contractItems)
      .values({
        id: newId(),
        contractId,
        position: index + 1,
        descriptionAr: null,
        descriptionEn: null,
        qtyMilli: item.qtyMilli,
        unitPriceMinor: item.unitPriceMinor,
        lineTotalMinor: result.lineTotals[index],
      })
      .run();
  });
  return result;
}

function replanMilestones(
  tx: DbTx,
  contractId: string,
  net: number,
  tax: number,
  mode: "percent" | "fixed",
): void {
  const existing = tx
    .select()
    .from(paymentMilestones)
    .where(eq(paymentMilestones.contractId, contractId))
    .orderBy(asc(paymentMilestones.position))
    .all();
  if (existing.length === 0) return;

  const baseRows = existing.map((row) => ({
    titleAr: row.titleAr,
    titleEn: row.titleEn,
    percentBp: row.percentBp,
    amountMinor: row.amountMinor,
    dueDate: row.dueDate,
    triggerNoteAr: row.triggerNoteAr,
    triggerNoteEn: row.triggerNoteEn,
  }));

  let plan;
  if (mode === "percent") {
    const bps = existing.map((row) => row.percentBp ?? 0);
    const sum = bps.reduce((acc, value) => acc + value, 0);
    if (bps.some((value) => value < 1) || sum !== 10000) return;
    plan = planMilestones({ net, tax, mode: "percent", rows: baseRows });
  } else {
    const amounts = existing.map((row) => row.amountMinor);
    const sum = amounts.reduce((acc, value) => acc + value, 0);
    if (sum === net) {
      plan = planMilestones({ net, tax, mode: "fixed", rows: baseRows });
    } else if (sum > 0) {
      const scaled = allocateProportional(net, amounts);
      plan = planMilestones({
        net,
        tax,
        mode: "fixed",
        rows: baseRows.map((row, index) => ({
          ...row,
          amountMinor: scaled[index],
        })),
      });
    } else {
      return;
    }
  }

  tx.delete(paymentMilestones)
    .where(eq(paymentMilestones.contractId, contractId))
    .run();
  for (const milestone of plan) {
    tx.insert(paymentMilestones)
      .values({
        id: newId(),
        contractId,
        position: milestone.position,
        titleAr: milestone.titleAr,
        titleEn: milestone.titleEn,
        percentBp: milestone.percentBp,
        amountMinor: milestone.amountMinor,
        taxMinor: milestone.taxMinor,
        totalMinor: milestone.totalMinor,
        dueDate: milestone.dueDate,
        triggerNoteAr: milestone.triggerNoteAr,
        triggerNoteEn: milestone.triggerNoteEn,
      })
      .run();
  }
}

export function previewTotals(input: CalcInput): CalcOutput {
  return calcTotals(input);
}

export function createContractFromTemplate(
  user: SessionUser,
  input: CreateContractInput,
  meta: RequestMeta,
): string {
  const project = db
    .select()
    .from(projects)
    .where(eq(projects.id, input.projectId))
    .get();
  if (!project) {
    throw new AppError("VALIDATION_FAILED", "Project not found", {
      projectId: "errors.invalid",
    });
  }
  const template = db
    .select()
    .from(templates)
    .where(eq(templates.id, input.templateId))
    .get();
  if (!template) {
    throw new AppError("VALIDATION_FAILED", "Template not found", {
      templateId: "errors.invalid",
    });
  }
  const templateClauseRows = db
    .select()
    .from(templateClauses)
    .where(eq(templateClauses.templateId, template.id))
    .orderBy(asc(templateClauses.position))
    .all();
  const defaults = templateDefaultsSchema.parse(
    JSON.parse(template.defaultsJson),
  );
  const settingsDefaults = getSettings("defaults");

  const id = newId();
  const now = nowMs();
  const milestoneMode = defaults.milestonePreset?.mode ?? "percent";

  withTx((tx) => {
    tx.insert(contracts)
      .values({
        id,
        kind: "contract",
        clientId: project.clientId,
        projectId: project.id,
        templateId: template.id,
        status: "draft",
        languageMode: template.defaultLanguageMode,
        hasFees: defaults.hasFees,
        titleAr: defaults.titleAr ?? template.nameAr,
        titleEn: defaults.titleEn ?? template.nameEn,
        currency: project.currency,
        discountType: "none",
        discountValue: 0,
        taxRateBp: settingsDefaults.taxRateBp,
        milestoneMode,
        paymentTermsDays:
          defaults.paymentTermsDays ?? settingsDefaults.paymentTermsDays,
        governingLawAr: settingsDefaults.governingLawAr || null,
        governingLawEn: settingsDefaults.governingLawEn || null,
        jurisdictionAr: settingsDefaults.jurisdictionAr || null,
        jurisdictionEn: settingsDefaults.jurisdictionEn || null,
        versionNo: 1,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    templateClauseRows.forEach((clause, index) => {
      tx.insert(contractClauses)
        .values({
          id: newId(),
          contractId: id,
          position: index + 1,
          key: clause.key,
          titleAr: clause.titleAr,
          titleEn: clause.titleEn,
          bodyAr: clause.bodyAr,
          bodyEn: clause.bodyEn,
        })
        .run();
    });

    const preset = defaults.milestonePreset;
    if (preset) {
      preset.rows.forEach((row, index) => {
        tx.insert(paymentMilestones)
          .values({
            id: newId(),
            contractId: id,
            position: index + 1,
            titleAr: row.titleAr,
            titleEn: row.titleEn,
            percentBp:
              preset.mode === "percent" ? (row.percentBp ?? null) : null,
            amountMinor: 0,
            taxMinor: 0,
            totalMinor: 0,
            triggerNoteAr: row.triggerNoteAr ?? null,
            triggerNoteEn: row.triggerNoteEn ?? null,
          })
          .run();
      });
    }

    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "contract.created",
      entityType: "contract",
      entityId: id,
      meta: { templateKey: template.key },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });

  return id;
}

export function updateContractBasics(
  user: SessionUser,
  id: string,
  input: UpdateBasicsInput,
  meta: RequestMeta,
): void {
  const now = nowMs();
  withTx((tx) => {
    assertDraft(tx, id);
    const set: Record<string, unknown> = {
      languageMode: input.languageMode,
      titleAr: input.titleAr,
      titleEn: input.titleEn,
      scopeAr: input.scopeAr,
      scopeEn: input.scopeEn,
      startDate: input.startDate,
      endDate: input.endDate,
      paymentTermsDays: input.paymentTermsDays,
      governingLawAr: input.governingLawAr,
      governingLawEn: input.governingLawEn,
      jurisdictionAr: input.jurisdictionAr,
      jurisdictionEn: input.jurisdictionEn,
      signingDeadline: input.signingDeadline,
      internalNotes: input.internalNotes,
      hasFees: input.hasFees,
      currency: input.currency,
      milestoneMode: input.milestoneMode,
      updatedAt: now,
    };
    if (!input.hasFees) {
      tx.delete(contractItems).where(eq(contractItems.contractId, id)).run();
      tx.delete(paymentMilestones)
        .where(eq(paymentMilestones.contractId, id))
        .run();
      Object.assign(set, {
        discountType: "none",
        discountValue: 0,
        subtotalMinor: 0,
        discountMinor: 0,
        netMinor: 0,
        taxRateBp: 0,
        taxMinor: 0,
        totalMinor: 0,
      });
    }
    tx.update(contracts).set(set).where(eq(contracts.id, id)).run();
    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "contract.updated",
      entityType: "contract",
      entityId: id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}

export function saveContractItems(
  user: SessionUser,
  id: string,
  input: SaveItemsInput,
  meta: RequestMeta,
): CalcOutput {
  const now = nowMs();
  return withTx((tx) => {
    const contract = assertDraft(tx, id);
    if (!contract.hasFees) {
      throw new AppError("INVALID_STATE", "This contract has no fees");
    }
    const calcInput: CalcInput = {
      items: input.items.map((item) => ({
        unitPriceMinor: item.unitPriceMinor,
        qtyMilli: item.qtyMilli,
      })),
      discount: input.discount,
      taxRateBp: input.taxRateBp,
    };
    const result = writeItems(tx, id, calcInput);
    // Preserve item descriptions (writeItems only writes money columns).
    input.items.forEach((item, index) => {
      tx.update(contractItems)
        .set({
          descriptionAr: item.descriptionAr,
          descriptionEn: item.descriptionEn,
        })
        .where(
          and(
            eq(contractItems.contractId, id),
            eq(contractItems.position, index + 1),
          ),
        )
        .run();
    });

    tx.update(contracts)
      .set({
        discountType: input.discount.type,
        discountValue: input.discount.value,
        subtotalMinor: result.subtotal,
        discountMinor: result.discount,
        netMinor: result.net,
        taxRateBp: input.taxRateBp,
        taxMinor: result.tax,
        totalMinor: result.total,
        updatedAt: now,
      })
      .where(eq(contracts.id, id))
      .run();

    replanMilestones(tx, id, result.net, result.tax, contract.milestoneMode);

    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "contract.updated",
      entityType: "contract",
      entityId: id,
      meta: { section: "items" },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return result;
  });
}

export function saveMilestones(
  user: SessionUser,
  id: string,
  input: SaveMilestonesInput,
  meta: RequestMeta,
): void {
  const now = nowMs();
  withTx((tx) => {
    const contract = assertDraft(tx, id);
    const plan = planMilestones({
      net: contract.netMinor,
      tax: contract.taxMinor,
      mode: input.mode,
      rows: input.rows.map((row) => ({
        titleAr: row.titleAr,
        titleEn: row.titleEn,
        percentBp: row.percentBp ?? null,
        amountMinor: row.amountMinor ?? null,
        dueDate: row.dueDate ?? null,
        triggerNoteAr: row.triggerNoteAr ?? null,
        triggerNoteEn: row.triggerNoteEn ?? null,
      })),
    });
    tx.delete(paymentMilestones)
      .where(eq(paymentMilestones.contractId, id))
      .run();
    for (const milestone of plan) {
      tx.insert(paymentMilestones)
        .values({
          id: newId(),
          contractId: id,
          position: milestone.position,
          titleAr: milestone.titleAr,
          titleEn: milestone.titleEn,
          percentBp: milestone.percentBp,
          amountMinor: milestone.amountMinor,
          taxMinor: milestone.taxMinor,
          totalMinor: milestone.totalMinor,
          dueDate: milestone.dueDate,
          triggerNoteAr: milestone.triggerNoteAr,
          triggerNoteEn: milestone.triggerNoteEn,
        })
        .run();
    }
    tx.update(contracts)
      .set({ milestoneMode: input.mode, updatedAt: now })
      .where(eq(contracts.id, id))
      .run();
    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "contract.updated",
      entityType: "contract",
      entityId: id,
      meta: { section: "milestones" },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}

export function saveClauses(
  user: SessionUser,
  id: string,
  clauses: ContractClauseInput[],
  meta: RequestMeta,
): void {
  const now = nowMs();
  withTx((tx) => {
    const contract = assertDraft(tx, id);
    const issues = validateTemplateClauses(clauses, contract.hasFees);
    if (issues.length > 0) {
      const fieldErrors: Record<string, string> = {};
      issues.forEach((issue, index) => {
        fieldErrors[`clauses.${issue.clausePosition ?? index}.${issue.code}`] =
          issue.messageKey;
      });
      throw new AppError("VALIDATION_FAILED", "Invalid clauses", fieldErrors);
    }
    tx.delete(contractClauses).where(eq(contractClauses.contractId, id)).run();
    clauses.forEach((clause, index) => {
      tx.insert(contractClauses)
        .values({
          id: newId(),
          contractId: id,
          position: index + 1,
          key: clause.key ?? null,
          titleAr: clause.titleAr,
          titleEn: clause.titleEn,
          bodyAr: clause.bodyAr,
          bodyEn: clause.bodyEn,
        })
        .run();
    });
    tx.update(contracts)
      .set({ updatedAt: now })
      .where(eq(contracts.id, id))
      .run();
    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "contract.updated",
      entityType: "contract",
      entityId: id,
      meta: { section: "clauses" },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}

export function deleteDraftContract(
  user: SessionUser,
  id: string,
  meta: RequestMeta,
): void {
  withTx((tx) => {
    const contract = assertDraft(tx, id);
    if (contract.number !== null) {
      throw new AppError(
        "INVALID_STATE",
        "Only unnumbered drafts can be deleted",
      );
    }
    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "contract.cancelled",
      entityType: "contract",
      entityId: id,
      meta: { deleted: true },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    tx.delete(contracts).where(eq(contracts.id, id)).run();
  });
}

export function cancelContract(
  user: SessionUser,
  id: string,
  reason: string | null,
  meta: RequestMeta,
): void {
  const now = nowMs();
  withTx((tx) => {
    assertDraft(tx, id);
    tx.update(contracts)
      .set({ status: "cancelled", cancelledAt: now, updatedAt: now })
      .where(eq(contracts.id, id))
      .run();
    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "contract.cancelled",
      entityType: "contract",
      entityId: id,
      meta: reason ? { reason } : undefined,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}

export function countActiveDrafts(): number {
  return (
    db
      .select({ value: count() })
      .from(contracts)
      .where(and(eq(contracts.status, "draft"), isNull(contracts.number)))
      .get()?.value ?? 0
  );
}
