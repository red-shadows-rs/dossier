import { asc, count, desc, eq, isNull } from "drizzle-orm";
import { db, withTx, type DbTx } from "@/db";
import { templateClauses, templates } from "@/db/schema";
import { nowMs } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { newId } from "@/lib/ids";
import { templateDefaultsSchema } from "@/lib/validation/template";
import { TEMPLATES, clauseDefsFor } from "@/server/templating/seed-templates";

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
