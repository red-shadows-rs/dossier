// Dossier - Projects Tests
// https://github.com/red-shadows-rs/dossier

import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, clients, numberSequences, projects } from "@/db/schema";
import { nowMs } from "@/lib/dates";
import { newId } from "@/lib/ids";
import { AppError } from "@/lib/errors";
import { assertCan } from "@/lib/permissions";
import {
  projectInputSchema,
  type ProjectInput,
} from "@/lib/validation/projects";
import { createTestUser } from "@/server/auth/test-utils";
import type { SessionUser } from "@/server/auth/session";
import {
  archiveProject,
  createProject,
  getProject,
  getProjectWithClient,
  listProjects,
  setProjectStatus,
  unarchiveProject,
  updateProject,
} from "./projects";

const META = { ip: "1.2.3.4", userAgent: "vitest" };

async function sessionUser(): Promise<SessionUser> {
  const created = await createTestUser({ role: "owner" });
  return {
    id: created.id,
    email: created.email,
    name: created.name,
    role: "owner",
    locale: "ar",
    canSignForCompany: true,
    signerTitleAr: null,
    signerTitleEn: null,
  };
}

function makeClient(): string {
  const id = newId();
  const now = nowMs();
  db.insert(clients)
    .values({
      id,
      type: "company",
      nameEn: "Al-Noor Trading Co.",
      nameAr: "شركة النور للتجارة",
      preferredLanguage: "ar",
      createdAt: now,
      updatedAt: now,
    })
    .run();
  return id;
}

function input(
  clientId: string,
  overrides: Partial<ProjectInput> = {},
): ProjectInput {
  return projectInputSchema.parse({
    clientId,
    nameAr: "متجر إلكتروني",
    nameEn: "Online Store",
    currency: "SAR",
    ...overrides,
  });
}

beforeEach(() => {
  db.delete(projects).run();
  db.delete(numberSequences).where(eq(numberSequences.seqKey, "project")).run();
});

describe("projectInputSchema", () => {
  it("requires at least one name", () => {
    const base = { clientId: "c1", currency: "SAR" };
    expect(projectInputSchema.safeParse(base).success).toBe(false);
    expect(
      projectInputSchema.safeParse({ ...base, nameEn: "Store" }).success,
    ).toBe(true);
  });

  it("requires a supported currency", () => {
    expect(
      projectInputSchema.safeParse({
        clientId: "c1",
        nameEn: "Store",
        currency: "XXX",
      }).success,
    ).toBe(false);
    expect(
      projectInputSchema.safeParse({
        clientId: "c1",
        nameEn: "Store",
        currency: "KWD",
      }).success,
    ).toBe(true);
  });

  it("rejects an end date before the start date", () => {
    const bad = projectInputSchema.safeParse({
      clientId: "c1",
      nameEn: "Store",
      currency: "SAR",
      startDate: "2026-05-01",
      endDate: "2026-04-01",
    });
    expect(bad.success).toBe(false);
    const good = projectInputSchema.safeParse({
      clientId: "c1",
      nameEn: "Store",
      currency: "SAR",
      startDate: "2026-04-01",
      endDate: "2026-05-01",
    });
    expect(good.success).toBe(true);
  });
});

describe("createProject", () => {
  it("allocates P-0001 then P-0002", async () => {
    const user = await sessionUser();
    const clientId = makeClient();
    const first = createProject(user, input(clientId), META);
    const second = createProject(user, input(clientId), META);
    expect(first.code).toBe("P-0001");
    expect(second.code).toBe("P-0002");
    expect(getProject(first.id).code).toBe("P-0001");

    const logs = db.select().from(auditLog).all();
    expect(
      logs.some(
        (entry) =>
          entry.action === "project.created" && entry.entityId === first.id,
      ),
    ).toBe(true);
  });

  it("does not consume a code when creation rolls back", async () => {
    const user = await sessionUser();
    const clientId = makeClient();
    const bad = {
      ...input(clientId),
      nameAr: null,
      nameEn: null,
    } as ProjectInput;
    expect(() => createProject(user, bad, META)).toThrow();
    const next = createProject(user, input(clientId), META);
    expect(next.code).toBe("P-0001");
  });

  it("rejects an unknown client", async () => {
    const user = await sessionUser();
    expect(() => createProject(user, input("missing"), META)).toThrow(AppError);
  });

});

describe("listProjects", () => {
  it("filters by status, client and search, and hides archived by default", async () => {
    const user = await sessionUser();
    const clientA = makeClient();
    const clientB = makeClient();
    const a = createProject(
      user,
      input(clientA, { nameEn: "Alpha", status: "active" }),
      META,
    );
    const b = createProject(
      user,
      input(clientB, { nameEn: "Beta", status: "lead" }),
      META,
    );

    expect(listProjects({ status: "active" }).rows.map((r) => r.id)).toEqual([
      a.id,
    ]);
    expect(listProjects({ clientId: clientB }).rows.map((r) => r.id)).toEqual([
      b.id,
    ]);
    expect(listProjects({ q: "alp" }).rows.map((r) => r.id)).toEqual([a.id]);

    archiveProject(user, b.id, META);
    expect(listProjects().rows.map((r) => r.id)).toEqual([a.id]);
    expect(listProjects({ archived: true }).rows.map((r) => r.id)).toEqual([
      b.id,
    ]);
  });
});

describe("update / status / archive", () => {
  it("updates and audits, changes status, archives and restores", async () => {
    const user = await sessionUser();
    const clientId = makeClient();
    const created = createProject(user, input(clientId), META);

    updateProject(
      user,
      created.id,
      input(clientId, { nameEn: "Renamed", budgetMinor: 500000 }),
      META,
    );
    expect(getProject(created.id).nameEn).toBe("Renamed");
    expect(getProject(created.id).budgetMinor).toBe(500000);

    setProjectStatus(user, created.id, "active", META);
    expect(getProject(created.id).status).toBe("active");

    archiveProject(user, created.id, META);
    expect(getProject(created.id).archivedAt).not.toBeNull();
    unarchiveProject(user, created.id, META);
    expect(getProject(created.id).archivedAt).toBeNull();

    const logs = db.select().from(auditLog).all();
    expect(logs.some((entry) => entry.action === "project.updated")).toBe(true);
    expect(
      logs.some((entry) => entry.action === "project.status_changed"),
    ).toBe(true);
    expect(logs.some((entry) => entry.action === "project.archived")).toBe(
      true,
    );
  });

  it("getProjectWithClient joins the client", async () => {
    const user = await sessionUser();
    const clientId = makeClient();
    const created = createProject(user, input(clientId), META);
    const { project, client } = getProjectWithClient(created.id);
    expect(project.id).toBe(created.id);
    expect(client.id).toBe(clientId);
  });

  it("throws NOT_FOUND for a missing project", async () => {
    const user = await sessionUser();
    expect(() => getProject("missing")).toThrow(AppError);
    expect(() => archiveProject(user, "missing", META)).toThrow(AppError);
  });
});

describe("project authorization", () => {
  it("viewers cannot write", () => {
    expect(() =>
      assertCan({ role: "viewer", canSignForCompany: false }, "projects.write"),
    ).toThrow(AppError);
    expect(() =>
      assertCan({ role: "viewer", canSignForCompany: false }, "projects.read"),
    ).not.toThrow();
  });
});
