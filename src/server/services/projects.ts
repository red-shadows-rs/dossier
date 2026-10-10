// Dossier - Projects Service
// https://github.com/red-shadows-rs/dossier

import {
  and,
  count,
  desc,
  eq,
  isNotNull,
  isNull,
  sql,
  type SQL,
} from "drizzle-orm";
import { db, withTx, type DbTx } from "@/db";
import { clients, projects } from "@/db/schema";
import { nowMs } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { newId } from "@/lib/ids";
import type { ProjectStatus } from "@/lib/constants";
import type { ProjectInput } from "@/lib/validation/projects";
import type { RequestMeta, SessionUser } from "@/server/auth/session";
import { audit } from "@/server/services/audit";
import { allocateNumber, formatProjectCode } from "@/server/services/numbering";

export const PROJECTS_PAGE_SIZE = 20;

export type ProjectRow = typeof projects.$inferSelect;
export type { ProjectStatus };

export type ProjectFilters = {
  q?: string;
  status?: ProjectStatus;
  clientId?: string;
  archived?: boolean;
  page?: number;
};

export type ProjectPage = {
  rows: ProjectRow[];
  total: number;
  page: number;
  pageSize: number;
};

function escapeLike(input: string): string {
  return input.replace(/[\\%_]/g, (char) => `\\${char}`);
}

function whereFor(filters: ProjectFilters): SQL | undefined {
  const conditions: SQL[] = [
    filters.archived
      ? isNotNull(projects.archivedAt)
      : isNull(projects.archivedAt),
  ];
  if (filters.status) {
    conditions.push(eq(projects.status, filters.status));
  }
  if (filters.clientId) {
    conditions.push(eq(projects.clientId, filters.clientId));
  }
  const q = filters.q?.trim();
  if (q) {
    const pattern = `%${escapeLike(q.toLowerCase())}%`;
    conditions.push(
      sql`(lower(${projects.nameAr}) LIKE ${pattern} ESCAPE '\\' OR lower(${projects.nameEn}) LIKE ${pattern} ESCAPE '\\' OR lower(${projects.code}) LIKE ${pattern} ESCAPE '\\')`,
    );
  }
  return and(...conditions);
}

export function listProjects(filters: ProjectFilters = {}): ProjectPage {
  const where = whereFor(filters);
  const total =
    db.select({ value: count() }).from(projects).where(where).get()?.value ?? 0;

  const requestedPage = filters.page ?? 1;
  const page =
    Number.isFinite(requestedPage) && requestedPage >= 1
      ? Math.floor(requestedPage)
      : 1;

  const rows = db
    .select()
    .from(projects)
    .where(where)
    .orderBy(desc(projects.createdAt), desc(projects.id))
    .limit(PROJECTS_PAGE_SIZE)
    .offset((page - 1) * PROJECTS_PAGE_SIZE)
    .all();

  return { rows, total, page, pageSize: PROJECTS_PAGE_SIZE };
}

export function listProjectOptions(): {
  id: string;
  code: string;
  nameAr: string | null;
  nameEn: string | null;
  clientId: string;
}[] {
  return db
    .select({
      id: projects.id,
      code: projects.code,
      nameAr: projects.nameAr,
      nameEn: projects.nameEn,
      clientId: projects.clientId,
    })
    .from(projects)
    .where(isNull(projects.archivedAt))
    .orderBy(projects.code)
    .all();
}

export function getProject(id: string): ProjectRow {
  const row = db.select().from(projects).where(eq(projects.id, id)).get();
  if (!row) {
    throw new AppError("NOT_FOUND", "Project not found");
  }
  return row;
}

export function getProjectWithClient(id: string): {
  project: ProjectRow;
  client: typeof clients.$inferSelect;
} {
  const row = db
    .select({ project: projects, client: clients })
    .from(projects)
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .where(eq(projects.id, id))
    .get();
  if (!row) {
    throw new AppError("NOT_FOUND", "Project not found");
  }
  return row;
}

function assertClientExists(tx: DbTx, clientId: string): void {
  const client = tx
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.id, clientId))
    .get();
  if (!client) {
    throw new AppError("VALIDATION_FAILED", "Client not found", {
      clientId: "errors.invalid",
    });
  }
}

export function createProject(
  user: SessionUser,
  input: ProjectInput,
  meta: RequestMeta,
): { id: string; code: string } {
  const id = newId();
  const now = nowMs();
  const code = withTx((tx) => {
    assertClientExists(tx, input.clientId);
    const seq = allocateNumber(tx, "project", 0);
    const value = formatProjectCode(seq);
    tx.insert(projects)
      .values({
        id,
        code: value,
        clientId: input.clientId,
        nameAr: input.nameAr,
        nameEn: input.nameEn,
        description: input.description,
        status: input.status,
        startDate: input.startDate,
        endDate: input.endDate,
        budgetMinor: input.budgetMinor,
        currency: input.currency,
        notes: input.notes,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      })
      .run();
    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "project.created",
      entityType: "project",
      entityId: id,
      meta: { code: value },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return value;
  });
  return { id, code };
}

export function updateProject(
  user: SessionUser,
  id: string,
  input: ProjectInput,
  meta: RequestMeta,
): void {
  const now = nowMs();
  withTx((tx) => {
    const existing = tx
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .get();
    if (!existing) {
      throw new AppError("NOT_FOUND", "Project not found");
    }
    assertClientExists(tx, input.clientId);
    tx.update(projects)
      .set({
        clientId: input.clientId,
        nameAr: input.nameAr,
        nameEn: input.nameEn,
        description: input.description,
        status: input.status,
        startDate: input.startDate,
        endDate: input.endDate,
        budgetMinor: input.budgetMinor,
        currency: input.currency,
        notes: input.notes,
        updatedAt: now,
      })
      .where(eq(projects.id, id))
      .run();
    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "project.updated",
      entityType: "project",
      entityId: id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}

export function setProjectStatus(
  user: SessionUser,
  id: string,
  status: ProjectStatus,
  meta: RequestMeta,
): void {
  const now = nowMs();
  withTx((tx) => {
    const existing = tx
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .get();
    if (!existing) {
      throw new AppError("NOT_FOUND", "Project not found");
    }
    if (existing.status === status) return;
    tx.update(projects)
      .set({ status, updatedAt: now })
      .where(eq(projects.id, id))
      .run();
    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "project.status_changed",
      entityType: "project",
      entityId: id,
      meta: { from: existing.status, to: status },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}

export function archiveProject(
  user: SessionUser,
  id: string,
  meta: RequestMeta,
): void {
  const now = nowMs();
  withTx((tx) => {
    const existing = tx
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .get();
    if (!existing) {
      throw new AppError("NOT_FOUND", "Project not found");
    }
    tx.update(projects)
      .set({ archivedAt: now, updatedAt: now })
      .where(eq(projects.id, id))
      .run();
    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "project.archived",
      entityType: "project",
      entityId: id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}

export function unarchiveProject(
  user: SessionUser,
  id: string,
  meta: RequestMeta,
): void {
  const now = nowMs();
  withTx((tx) => {
    const existing = tx
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .get();
    if (!existing) {
      throw new AppError("NOT_FOUND", "Project not found");
    }
    tx.update(projects)
      .set({ archivedAt: null, updatedAt: now })
      .where(eq(projects.id, id))
      .run();
    audit(tx, {
      actorType: "user",
      actorId: user.id,
      action: "project.updated",
      entityType: "project",
      entityId: id,
      meta: { archived: false },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  });
}
