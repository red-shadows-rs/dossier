import { beforeEach, describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { auditLog, clients } from "@/db/schema";
import { AppError } from "@/lib/errors";
import { assertCan } from "@/lib/permissions";
import { clientInputSchema } from "@/lib/validation/clients";
import { createTestUser } from "@/server/auth/test-utils";
import type { SessionUser } from "@/server/auth/session";
import {
  archiveClient,
  createClient,
  getClient,
  listClients,
  unarchiveClient,
  updateClient,
} from "./clients";

const META = { ip: "1.2.3.4", userAgent: "vitest" };

beforeEach(() => {
  db.delete(clients).run();
});

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

function input(overrides: Record<string, unknown> = {}) {
  return clientInputSchema.parse({
    nameAr: "عميل",
    nameEn: "Client",
    ...overrides,
  });
}

describe("clientInputSchema", () => {
  it("requires at least one name", () => {
    expect(clientInputSchema.safeParse({}).success).toBe(false);
    expect(
      clientInputSchema.safeParse({ nameAr: "", nameEn: "" }).success,
    ).toBe(false);
    expect(
      clientInputSchema.safeParse({ nameAr: "", nameEn: "Client" }).success,
    ).toBe(true);
    expect(clientInputSchema.safeParse({ nameAr: "عميل" }).success).toBe(true);
  });

  it("uppercases the country and validates email", () => {
    expect(input({ country: "sa" }).country).toBe("SA");
    expect(() => input({ country: "s" })).toThrow();
    expect(() => input({ country: "SAU" })).toThrow();
    expect(() => input({ email: "not-an-email" })).toThrow();
    expect(input({ email: "  A@B.CO " }).email).toBe("A@B.CO");
  });

  it("normalizes empty optional fields to null", () => {
    const parsed = input({ email: "", city: "  " });
    expect(parsed.email).toBeNull();
    expect(parsed.city).toBeNull();
  });
});

describe("createClient", () => {
  it("creates a client and audits it", async () => {
    const user = await sessionUser();
    const id = createClient(user, input({ city: "Riyadh" }), META);
    const row = getClient(id);
    expect(row.nameEn).toBe("Client");
    expect(row.city).toBe("Riyadh");
    expect(row.archivedAt).toBeNull();

    const logs = db.select().from(auditLog).all();
    expect(
      logs.some(
        (entry) => entry.action === "client.created" && entry.entityId === id,
      ),
    ).toBe(true);
  });

  it("enforces the DB CHECK when both names are null", () => {
    expect(() =>
      db
        .insert(clients)
        .values({
          id: "bad",
          type: "company",
          nameAr: null,
          nameEn: null,
          preferredLanguage: "ar",
          createdAt: 0,
          updatedAt: 0,
        })
        .run(),
    ).toThrow();
  });
});

describe("listClients", () => {
  it("escapes LIKE wildcards so % does not match everything", async () => {
    const user = await sessionUser();
    createClient(user, input({ nameEn: "Alpha" }), META);
    createClient(user, input({ nameEn: "100% Ltd" }), META);

    expect(listClients({ q: "%" }).total).toBe(1);
    expect(listClients({ q: "%" }).rows[0].nameEn).toBe("100% Ltd");
    expect(listClients({ q: "alp" }).total).toBe(1);
    expect(listClients({ q: "_" }).total).toBe(0);
    expect(listClients({ q: "zzz" }).total).toBe(0);
  });

  it("hides archived clients by default and lists them on demand", async () => {
    const user = await sessionUser();
    const keep = createClient(user, input({ nameEn: "Keep" }), META);
    const gone = createClient(user, input({ nameEn: "Gone" }), META);
    archiveClient(user, gone, META);

    const active = listClients();
    expect(active.rows.map((row) => row.id)).toContain(keep);
    expect(active.rows.map((row) => row.id)).not.toContain(gone);

    const archived = listClients({ archived: true });
    expect(archived.rows.map((row) => row.id)).toEqual([gone]);
  });

  it("paginates 20 per page", async () => {
    const user = await sessionUser();
    for (let i = 0; i < 25; i += 1) {
      createClient(user, input({ nameEn: `Client ${i}` }), META);
    }
    const first = listClients({ page: 1 });
    expect(first.rows).toHaveLength(20);
    expect(first.total).toBe(25);
    const second = listClients({ page: 2 });
    expect(second.rows).toHaveLength(5);
  });
});

describe("updateClient / archive / unarchive", () => {
  it("updates, archives and restores a client with audit rows", async () => {
    const user = await sessionUser();
    const id = createClient(user, input({ nameEn: "Before" }), META);

    updateClient(user, id, input({ nameEn: "After", city: "Jeddah" }), META);
    expect(getClient(id).nameEn).toBe("After");
    expect(getClient(id).city).toBe("Jeddah");

    archiveClient(user, id, META);
    expect(getClient(id).archivedAt).not.toBeNull();

    unarchiveClient(user, id, META);
    expect(getClient(id).archivedAt).toBeNull();

    const logs = db.select().from(auditLog).all();
    expect(logs.some((entry) => entry.action === "client.updated")).toBe(true);
    expect(logs.some((entry) => entry.action === "client.archived")).toBe(true);
  });

  it("throws NOT_FOUND for a missing client", async () => {
    const user = await sessionUser();
    expect(() => getClient("missing")).toThrow(AppError);
    expect(() => updateClient(user, "missing", input(), META)).toThrow(
      AppError,
    );
    expect(() => archiveClient(user, "missing", META)).toThrow(AppError);
  });
});

describe("client authorization", () => {
  it("viewers cannot write", () => {
    expect(() =>
      assertCan({ role: "viewer", canSignForCompany: false }, "clients.write"),
    ).toThrow(AppError);
    expect(() =>
      assertCan({ role: "viewer", canSignForCompany: false }, "clients.read"),
    ).not.toThrow();
  });

  it("deleting a client row is not exposed (archive only)", async () => {
    const user = await sessionUser();
    const id = createClient(user, input(), META);
    // The service has no hard-delete; the row must still exist after archive.
    archiveClient(user, id, META);
    const row = db.select().from(clients).where(eq(clients.id, id)).get();
    expect(row).toBeDefined();
  });
});
