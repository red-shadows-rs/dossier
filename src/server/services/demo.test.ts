// Dossier - Demo Service Tests
// https://github.com/red-shadows-rs/dossier

import { describe, expect, it } from "vitest";
import { count } from "drizzle-orm";
import { db } from "@/db";
import { clients, invoices, projects, users } from "@/db/schema";
import {
  DEMO_USER_EMAIL,
  getOrCreateDemoUser,
  isDemoUser,
  loginAsDemo,
  resetDemoData,
  seedDemoData,
} from "./demo";

const meta = { ip: "127.0.0.1", userAgent: "vitest-demo-test" };

describe("demo service", () => {
  it("recognizes demo user email correctly", () => {
    expect(isDemoUser(DEMO_USER_EMAIL)).toBe(true);
    expect(isDemoUser(DEMO_USER_EMAIL.toUpperCase())).toBe(true);
    expect(isDemoUser("admin@red-shadows-rs.com")).toBe(false);
    expect(isDemoUser(null)).toBe(false);
    expect(isDemoUser(undefined)).toBe(false);
  });

  it("provisions and retrieves the demo user with member and signer roles", async () => {
    const user = await getOrCreateDemoUser();
    expect(user.email).toBe(DEMO_USER_EMAIL);
    expect(user.role).toBe("member");
    expect(user.canSignForCompany).toBe(true);

    const userCountBefore = db
      .select({ value: count() })
      .from(users)
      .get()?.value;

    const sameUser = await getOrCreateDemoUser();
    expect(sameUser.id).toBe(user.id);

    const userCountAfter = db
      .select({ value: count() })
      .from(users)
      .get()?.value;

    expect(userCountAfter).toBe(userCountBefore);
  });

  it("seeds and resets demo data successfully", async () => {
    const user = await getOrCreateDemoUser();
    seedDemoData(user, meta);

    const clientsCount = db.select({ value: count() }).from(clients).get()?.value ?? 0;
    const projectsCount = db.select({ value: count() }).from(projects).get()?.value ?? 0;
    const invoicesCount = db.select({ value: count() }).from(invoices).get()?.value ?? 0;

    expect(clientsCount).toBeGreaterThanOrEqual(1);
    expect(projectsCount).toBeGreaterThanOrEqual(1);
    expect(invoicesCount).toBeGreaterThanOrEqual(1);

    resetDemoData(user, meta);

    const clientsAfter = db.select({ value: count() }).from(clients).get()?.value ?? 0;
    const projectsAfter = db.select({ value: count() }).from(projects).get()?.value ?? 0;
    const invoicesAfter = db.select({ value: count() }).from(invoices).get()?.value ?? 0;

    expect(clientsAfter).toBeGreaterThanOrEqual(1);
    expect(projectsAfter).toBeGreaterThanOrEqual(1);
    expect(invoicesAfter).toBeGreaterThanOrEqual(1);
  });

  it("authenticates as demo and returns a valid session token", async () => {
    const token = await loginAsDemo(meta);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(10);
  });
});
