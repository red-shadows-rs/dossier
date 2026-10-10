// Dossier - Clients Service
// https://github.com/red-shadows-rs/dossier

import {
  and,
  count,
  desc,
  eq,
  inArray,
  isNotNull,
  isNull,
  sql,
  type SQL,
} from "drizzle-orm";
import { db, withTx } from "@/db";
import { clients, contracts, invoices, projects } from "@/db/schema";
import { nowMs } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { newId } from "@/lib/ids";
import type { ClientInput } from "@/lib/validation/clients";
import type { RequestMeta, SessionUser } from "@/server/auth/session";
import { audit } from "@/server/services/audit";

export const CLIENTS_PAGE_SIZE = 20;

export type ClientRow = typeof clients.$inferSelect & {
  canDelete?: boolean;
};

export type ClientFilters = {
  q?: string;
  archived?: boolean;
  page?: number;
};

export type ClientPage = {
  rows: ClientRow[];
  total: number;
  page: number;
  pageSize: number;
};

function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function whereFor(filters: ClientFilters): SQL | undefined {
  const conditions: SQL[] = [
    filters.archived
      ? isNotNull(clients.archivedAt)
      : isNull(clients.archivedAt),
  ];
  const q = filters.q?.trim();
  if (q) {
    const pattern = `%${escapeLike(q.toLowerCase())}%`;
    conditions.push(
      sql`(lower(${clients.nameAr}) LIKE ${pattern} ESCAPE '\\' OR lower(${clients.nameEn}) LIKE ${pattern} ESCAPE '\\' OR lower(${clients.email}) LIKE ${pattern} ESCAPE '\\' OR lower(${clients.city}) LIKE ${pattern} ESCAPE '\\')`,
    );
  }
  return and(...conditions);
}

export function listClients(filters: ClientFilters = {}): ClientPage {
  const where = whereFor(filters);
  const total =
    db.select({ value: count() }).from(clients).where(where).get()?.value ?? 0;

  const requestedPage = filters.page ?? 1;
  const page =
    Number.isFinite(requestedPage) && requestedPage >= 1
      ? Math.floor(requestedPage)
      : 1;

  const rows = db
    .select()
    .from(clients)
    .where(where)
    .orderBy(desc(clients.createdAt), desc(clients.id))
    .limit(CLIENTS_PAGE_SIZE)
    .offset((page - 1) * CLIENTS_PAGE_SIZE)
    .all();

  const clientIds = rows.map((r) => r.id);
  const clientIdsWithProjects = new Set(
    clientIds.length > 0
      ? db
          .select({ clientId: projects.clientId })
          .from(projects)
          .where(inArray(projects.clientId, clientIds))
          .all()
          .map((r) => r.clientId)
      : [],
  );
  const clientIdsWithContracts = new Set(
    clientIds.length > 0
      ? db
          .select({ clientId: contracts.clientId })
          .from(contracts)
          .where(inArray(contracts.clientId, clientIds))
          .all()
          .map((r) => r.clientId)
      : [],
  );
  const clientIdsWithInvoices = new Set(
    clientIds.length > 0
      ? db
          .select({ clientId: invoices.clientId })
          .from(invoices)
          .where(inArray(invoices.clientId, clientIds))
          .all()
          .map((r) => r.clientId)
      : [],
  );

  const augmentedRows: ClientRow[] = rows.map((r) => ({
    ...r,
    canDelete:
      !clientIdsWithProjects.has(r.id) &&
      !clientIdsWithContracts.has(r.id) &&
      !clientIdsWithInvoices.has(r.id),
  }));

  return { rows: augmentedRows, total, page, pageSize: CLIENTS_PAGE_SIZE };
}

export function getClient(id: string): ClientRow {
  const row = db.select().from(clients).where(eq(clients.id, id)).get();
  if (!row) {
    throw new AppError("NOT_FOUND", "Client not found");
  }
  return row;
}

export function listClientOptions(): {
  id: string;
  nameAr: string | null;
  nameEn: string | null;
}[] {
  return db
    .select({
      id: clients.id,
      nameAr: clients.nameAr,
      nameEn: clients.nameEn,
    })
    .from(clients)
    .where(isNull(clients.archivedAt))
    .orderBy(clients.nameEn, clients.nameAr)
    .all();
}

export function createClient(
  user: SessionUser,
  input: ClientInput,
  meta: RequestMeta,
): string {
  const id = newId();
  const now = nowMs();
  withTx((tx) => {
    tx.insert(clients)
      .values({
        id,
        ...input,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "client.created",
      entityType: "client",
      entityId: id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
  return id;
}

export function updateClient(
  user: SessionUser,
  id: string,
  input: ClientInput,
  meta: RequestMeta,
): void {
  const now = nowMs();
  withTx((tx) => {
    const existing = tx.select().from(clients).where(eq(clients.id, id)).get();
    if (!existing) {
      throw new AppError("NOT_FOUND", "Client not found");
    }
    tx.update(clients)
      .set({ ...input, updatedAt: now })
      .where(eq(clients.id, id))
      .run();
    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "client.updated",
      entityType: "client",
      entityId: id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}

export function archiveClient(
  user: SessionUser,
  id: string,
  meta: RequestMeta,
): void {
  const now = nowMs();
  withTx((tx) => {
    const existing = tx.select().from(clients).where(eq(clients.id, id)).get();
    if (!existing) {
      throw new AppError("NOT_FOUND", "Client not found");
    }
    tx.update(clients)
      .set({ archivedAt: now, updatedAt: now })
      .where(eq(clients.id, id))
      .run();
    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "client.archived",
      entityType: "client",
      entityId: id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}

export function unarchiveClient(
  user: SessionUser,
  id: string,
  meta: RequestMeta,
): void {
  const now = nowMs();
  withTx((tx) => {
    const existing = tx.select().from(clients).where(eq(clients.id, id)).get();
    if (!existing) {
      throw new AppError("NOT_FOUND", "Client not found");
    }
    tx.update(clients)
      .set({ archivedAt: null, updatedAt: now })
      .where(eq(clients.id, id))
      .run();
    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "client.updated",
      entityType: "client",
      entityId: id,
      meta: { archived: false },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}

export function canDeleteClient(id: string): boolean {
  const hasProjects = db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.clientId, id))
    .get();
  if (hasProjects) return false;

  const hasContracts = db
    .select({ id: contracts.id })
    .from(contracts)
    .where(eq(contracts.clientId, id))
    .get();
  if (hasContracts) return false;

  const hasInvoices = db
    .select({ id: invoices.id })
    .from(invoices)
    .where(eq(invoices.clientId, id))
    .get();
  if (hasInvoices) return false;

  return true;
}

export function deleteClient(
  user: SessionUser,
  id: string,
  meta: RequestMeta,
): void {
  withTx((tx) => {
    const existing = tx.select().from(clients).where(eq(clients.id, id)).get();
    if (!existing) {
      throw new AppError("NOT_FOUND", "Client not found");
    }

    const hasProjects = tx
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.clientId, id))
      .get();
    if (hasProjects) {
      throw new AppError(
        "INVALID_STATE",
        "Cannot delete client with existing projects",
      );
    }

    const hasContracts = tx
      .select({ id: contracts.id })
      .from(contracts)
      .where(eq(contracts.clientId, id))
      .get();
    if (hasContracts) {
      throw new AppError(
        "INVALID_STATE",
        "Cannot delete client with existing contracts",
      );
    }

    const hasInvoices = tx
      .select({ id: invoices.id })
      .from(invoices)
      .where(eq(invoices.clientId, id))
      .get();
    if (hasInvoices) {
      throw new AppError(
        "INVALID_STATE",
        "Cannot delete client with existing invoices",
      );
    }

    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "client.deleted",
      entityType: "client",
      entityId: id,
      meta: {
        nameAr: existing.nameAr,
        nameEn: existing.nameEn,
      },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    tx.delete(clients).where(eq(clients.id, id)).run();
  });
}
