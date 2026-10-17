import { and, asc, count, desc, eq, isNull, notInArray } from "drizzle-orm";
import { db, withTx, type DbTx } from "@/db";
import { templateClauses, templates } from "@/db/schema";
import { nowMs } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { newId } from "@/lib/ids";
import {
  templateDefaultsSchema,
  type TemplateClauseInput,
  type TemplateInput,
} from "@/lib/validation/template";
import type { RequestMeta, SessionUser } from "@/server/auth/session";
import { audit } from "@/server/services/audit";
import { TEMPLATES, clauseDefsFor } from "@/server/templating/seed-templates";
import { validateTemplateClauses } from "@/server/templating/validate";

export const TEMPLATES_PAGE_SIZE = 20;

export type TemplateRow = typeof templates.$inferSelect;
export type TemplateClauseRow = typeof templateClauses.$inferSelect;

export function listTemplates(
  options: { archived?: boolean; page?: number } = {},
): {
  rows: (TemplateRow & { clauseCount: number })[];
  total: number;
  page: number;
  pageSize: number;
} {
  const where = options.archived ? undefined : isNull(templates.archivedAt);
  const total =
    db.select({ value: count() }).from(templates).where(where).get()?.value ??
    0;
  const requestedPage = options.page ?? 1;
  const page =
    Number.isFinite(requestedPage) && requestedPage >= 1
      ? Math.floor(requestedPage)
      : 1;

  const rows = db
    .select()
    .from(templates)
    .where(where)
    .orderBy(desc(templates.isSystem), asc(templates.nameEn))
    .limit(TEMPLATES_PAGE_SIZE)
    .offset((page - 1) * TEMPLATES_PAGE_SIZE)
    .all();

  const withCounts = rows.map((row) => ({
    ...row,
    clauseCount:
      db
        .select({ value: count() })
        .from(templateClauses)
        .where(eq(templateClauses.templateId, row.id))
        .get()?.value ?? 0,
  }));

  return { rows: withCounts, total, page, pageSize: TEMPLATES_PAGE_SIZE };
}

export function getTemplate(id: string): {
  template: TemplateRow;
  clauses: TemplateClauseRow[];
} {
  const template = db
    .select()
    .from(templates)
    .where(eq(templates.id, id))
    .get();
  if (!template) {
    throw new AppError("NOT_FOUND", "Template not found");
  }
  const clauses = db
    .select()
    .from(templateClauses)
    .where(eq(templateClauses.templateId, id))
    .orderBy(asc(templateClauses.position))
    .all();
  return { template, clauses };
}

function writeTemplate(
  tx: DbTx,
  def: (typeof TEMPLATES)[number],
  existingId: string | null,
): string {
  const now = nowMs();
  const defaults = templateDefaultsSchema.parse(def.defaults);
  const id = existingId ?? newId();
  const values = {
    type: def.type,
    key: def.key,
    nameAr: def.nameAr,
    nameEn: def.nameEn,
    descriptionAr: def.descriptionAr,
    descriptionEn: def.descriptionEn,
    defaultLanguageMode: def.defaultLanguageMode,
    defaultsJson: JSON.stringify(defaults),
    isSystem: true,
    archivedAt: null,
    updatedAt: now,
  };

  if (existingId) {
    tx.update(templates).set(values).where(eq(templates.id, existingId)).run();
  } else {
    tx.insert(templates)
      .values({ id, ...values, createdAt: now })
      .run();
  }

  tx.delete(templateClauses).where(eq(templateClauses.templateId, id)).run();
  const defs = clauseDefsFor(def);
  defs.forEach((clause, index) => {
    tx.insert(templateClauses)
      .values({
        id: newId(),
        templateId: id,
        position: index + 1,
        key: def.clauseKeys[index],
        titleAr: clause.titleAr,
        titleEn: clause.titleEn,
        bodyAr: clause.bodyAr,
        bodyEn: clause.bodyEn,
      })
      .run();
  });

  return id;
}

export function seedSystemTemplates(): {
  inserted: number;
  updated: number;
  skipped: number;
} {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  withTx((tx) => {
    const validKeys = TEMPLATES.map((t) => t.key);
    const legacy = tx
      .select({ id: templates.id })
      .from(templates)
      .where(
        and(eq(templates.isSystem, true), notInArray(templates.key, validKeys)),
      )
      .all();

    for (const leg of legacy) {
      tx.delete(templateClauses)
        .where(eq(templateClauses.templateId, leg.id))
        .run();
      tx.delete(templates).where(eq(templates.id, leg.id)).run();
    }

    for (const def of TEMPLATES) {
      const existing = tx
        .select()
        .from(templates)
        .where(eq(templates.key, def.key))
        .get();
      if (existing && !existing.isSystem) {
        skipped += 1;
        continue;
      }
      if (existing) {
        writeTemplate(tx, def, existing.id);
        updated += 1;
      } else {
        writeTemplate(tx, def, null);
        inserted += 1;
      }
    }
  });

  return { inserted, updated, skipped };
}

function insertClauses(
  tx: DbTx,
  templateId: string,
  clauses: TemplateClauseInput[],
): void {
  clauses.forEach((clause, index) => {
    tx.insert(templateClauses)
      .values({
        id: newId(),
        templateId,
        position: index + 1,
        key: clause.key ?? null,
        titleAr: clause.titleAr,
        titleEn: clause.titleEn,
        bodyAr: clause.bodyAr,
        bodyEn: clause.bodyEn,
      })
      .run();
  });
}

function assertValidClauses(
  clauses: TemplateClauseInput[],
  hasFees: boolean,
): void {
  const issues = validateTemplateClauses(clauses, hasFees);
  if (issues.length === 0) return;
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key =
      issue.clausePosition !== undefined
        ? `clauses.${issue.clausePosition - 1}`
        : "_";
    if (!(key in fieldErrors)) fieldErrors[key] = issue.messageKey;
  }
  throw new AppError("VALIDATION_FAILED", "Invalid template", fieldErrors);
}

export function createTemplate(
  user: SessionUser,
  input: TemplateInput,
  meta: RequestMeta,
): string {
  assertValidClauses(input.clauses, input.defaults.hasFees);
  const id = newId();
  const now = nowMs();
  withTx((tx) => {
    tx.insert(templates)
      .values({
        id,
        type: input.type,
        key: null,
        nameAr: input.nameAr,
        nameEn: input.nameEn,
        descriptionAr: input.descriptionAr,
        descriptionEn: input.descriptionEn,
        defaultLanguageMode: input.defaultLanguageMode,
        defaultsJson: JSON.stringify(input.defaults),
        isSystem: false,
        archivedAt: null,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    insertClauses(tx, id, input.clauses);
    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "template.created",
      entityType: "template",
      entityId: id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
  return id;
}

export function updateTemplate(
  user: SessionUser,
  id: string,
  input: TemplateInput,
  meta: RequestMeta,
): void {
  assertValidClauses(input.clauses, input.defaults.hasFees);
  const now = nowMs();
  withTx((tx) => {
    const existing = tx
      .select()
      .from(templates)
      .where(eq(templates.id, id))
      .get();
    if (!existing) {
      throw new AppError("NOT_FOUND", "Template not found");
    }
    if (existing.isSystem) {
      throw new AppError("INVALID_STATE", "System templates are read-only");
    }
    tx.update(templates)
      .set({
        type: input.type,
        nameAr: input.nameAr,
        nameEn: input.nameEn,
        descriptionAr: input.descriptionAr,
        descriptionEn: input.descriptionEn,
        defaultLanguageMode: input.defaultLanguageMode,
        defaultsJson: JSON.stringify(input.defaults),
        updatedAt: now,
      })
      .where(eq(templates.id, id))
      .run();
    tx.delete(templateClauses).where(eq(templateClauses.templateId, id)).run();
    insertClauses(tx, id, input.clauses);
    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "template.updated",
      entityType: "template",
      entityId: id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}

export function duplicateTemplate(
  user: SessionUser,
  id: string,
  meta: RequestMeta,
): string {
  const source = db.select().from(templates).where(eq(templates.id, id)).get();
  if (!source) {
    throw new AppError("NOT_FOUND", "Template not found");
  }
  const sourceClauses = db
    .select()
    .from(templateClauses)
    .where(eq(templateClauses.templateId, id))
    .orderBy(asc(templateClauses.position))
    .all();
  const newTemplateId = newId();
  const now = nowMs();
  withTx((tx) => {
    tx.insert(templates)
      .values({
        id: newTemplateId,
        type: source.type,
        key: null,
        nameAr: source.nameAr,
        nameEn: source.nameEn,
        descriptionAr: source.descriptionAr,
        descriptionEn: source.descriptionEn,
        defaultLanguageMode: source.defaultLanguageMode,
        defaultsJson: source.defaultsJson,
        isSystem: false,
        archivedAt: null,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    sourceClauses.forEach((clause, index) => {
      tx.insert(templateClauses)
        .values({
          id: newId(),
          templateId: newTemplateId,
          position: index + 1,
          key: clause.key,
          titleAr: clause.titleAr,
          titleEn: clause.titleEn,
          bodyAr: clause.bodyAr,
          bodyEn: clause.bodyEn,
        })
        .run();
    });
    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "template.duplicated",
      entityType: "template",
      entityId: newTemplateId,
      meta: { sourceId: id },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
  return newTemplateId;
}

export function archiveTemplate(
  user: SessionUser,
  id: string,
  meta: RequestMeta,
): void {
  const now = nowMs();
  withTx((tx) => {
    const existing = tx
      .select()
      .from(templates)
      .where(eq(templates.id, id))
      .get();
    if (!existing) {
      throw new AppError("NOT_FOUND", "Template not found");
    }
    if (existing.isSystem) {
      throw new AppError("INVALID_STATE", "System templates are read-only");
    }
    tx.update(templates)
      .set({ archivedAt: now, updatedAt: now })
      .where(eq(templates.id, id))
      .run();
    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "template.archived",
      entityType: "template",
      entityId: id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}
