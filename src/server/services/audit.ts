// Dossier - Audit Service
// https://github.com/red-shadows-rs/dossier

import { and, count, desc, eq, gte, like, lte, or, type SQL } from "drizzle-orm";
import { headers } from "next/headers";
import { db, type DbTx } from "@/db";
import { auditLog } from "@/db/schema";
import { nowMs, utcEndOfDayMs, utcStartOfDayMs } from "@/lib/dates";
import type { RequestMeta } from "@/server/auth/session";

export const AUDIT_PAGE_SIZE = 20;

export type AuditEntry = {
  actorType: "user" | "signer" | "system";
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  meta?: Record<string, unknown>;
  ip?: string | null;
  userAgent?: string | null;
};

export function audit(tx: DbTx, entry: AuditEntry): void {
  tx.insert(auditLog)
    .values({
      ts: nowMs(),
      actorType: entry.actorType,
      actorId: entry.actorId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
      metaJson: entry.meta ? JSON.stringify(entry.meta) : null,
    })
    .run();
}

export async function getRequestMeta(): Promise<RequestMeta> {
  const store = await headers();
  const ip = store.get("x-real-ip");
  const userAgent = store.get("user-agent");
  return {
    ip: ip ?? null,
    userAgent: userAgent ? userAgent.slice(0, 300) : null,
  };
}

export type AuditFilters = {
  q?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
};

export type AuditEntryRow = typeof auditLog.$inferSelect;

export type AuditPage = {
  rows: AuditEntryRow[];
  total: number;
  page: number;
  pageSize: number;
};

export function listAuditEntries(filters: AuditFilters = {}): AuditPage {
  const conditions: SQL[] = [];

  if (filters.q) {
    const term = filters.q.trim();
    if (term) {
      const pattern = `%${term}%`;
      const qConds: SQL[] = [
        like(auditLog.entityId, pattern),
        like(auditLog.action, pattern),
        like(auditLog.entityType, pattern),
        like(auditLog.ip, pattern),
        like(auditLog.actorId, pattern),
        like(auditLog.metaJson, pattern),
      ];

      const lower = term.toLowerCase();
      if (lower.includes("فاتورة") || lower.includes("فواتير")) {
        qConds.push(like(auditLog.entityType, "%invoice%"));
      }
      if (lower.includes("عقد") || lower.includes("عقود")) {
        qConds.push(like(auditLog.entityType, "%contract%"));
      }
      if (lower.includes("عميل") || lower.includes("عملاء")) {
        qConds.push(like(auditLog.entityType, "%client%"));
      }
      if (lower.includes("مشروع") || lower.includes("مشاريع")) {
        qConds.push(like(auditLog.entityType, "%project%"));
      }
      if (lower.includes("مستخدم") || lower.includes("مستخدمين")) {
        qConds.push(like(auditLog.entityType, "%user%"));
      }
      if (lower.includes("إعدادات") || lower.includes("اعدادات")) {
        qConds.push(like(auditLog.entityType, "%setting%"));
      }
      if (lower.includes("دخول")) {
        qConds.push(like(auditLog.action, "%login%"));
      }
      const orCond = or(...qConds);
      if (orCond) {
        conditions.push(orCond);
      }
    }
  }

  if (filters.entityType) {
    conditions.push(eq(auditLog.entityType, filters.entityType.trim()));
  }
  if (filters.entityId) {
    const idTrimmed = filters.entityId.trim();
    conditions.push(like(auditLog.entityId, `%${idTrimmed}%`));
  }
  if (filters.action) {
    conditions.push(eq(auditLog.action, filters.action.trim()));
  }
  if (filters.from) {
    conditions.push(gte(auditLog.ts, utcStartOfDayMs(filters.from)));
  }
  if (filters.to) {
    conditions.push(lte(auditLog.ts, utcEndOfDayMs(filters.to)));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const total =
    db.select({ value: count() }).from(auditLog).where(where).get()?.value ?? 0;

  const requestedPage = filters.page ?? 1;
  const page =
    Number.isFinite(requestedPage) && requestedPage >= 1
      ? Math.floor(requestedPage)
      : 1;

  const rows = db
    .select()
    .from(auditLog)
    .where(where)
    .orderBy(desc(auditLog.ts), desc(auditLog.id))
    .limit(AUDIT_PAGE_SIZE)
    .offset((page - 1) * AUDIT_PAGE_SIZE)
    .all();

  return { rows, total, page, pageSize: AUDIT_PAGE_SIZE };
}
