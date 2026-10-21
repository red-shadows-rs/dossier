// Dossier - Permissions Library Tests
// https://github.com/red-shadows-rs/dossier

import { describe, expect, it } from "vitest";
import { ROLES, type Role } from "@/lib/constants";
import { AppError } from "@/lib/errors";
import {
  assertCan,
  can,
  PERMISSIONS,
  type Permission,
} from "@/lib/permissions";

const READ_ALL: Permission[] = [
  "clients.read",
  "projects.read",
  "templates.read",
  "contracts.read",
  "invoices.read",
  "subscriptions.read",
];
const MEMBER_WRITE: Permission[] = [
  "clients.write",
  "projects.write",
  "templates.write",
  "contracts.write",
  "contracts.send",
  "contracts.cancel",
  "invoices.write",
  "invoices.issue",
  "subscriptions.write",
  "subscriptions.pause",
  "subscriptions.cancel",
  "payments.write",
];
const OWNER_ONLY: Permission[] = [
  "contracts.terminate",
  "invoices.void",
  "payments.void",
  "settings.write",
  "users.manage",
  "audit.read",
];

function expected(role: Role, permission: Permission): boolean {
  if (READ_ALL.includes(permission)) return true;
  if (role === "viewer") return false;
  if (MEMBER_WRITE.includes(permission)) return true;
  if (permission === "contracts.sign_provider") return true;
  if (permission === "settings.read") return true;
  if (OWNER_ONLY.includes(permission)) return role === "owner";
  return false;
}

describe("permissions", () => {
  it("covers every permission in the matrix", () => {
    expect(new Set(PERMISSIONS).size).toBe(PERMISSIONS.length);
  });

  it("matches the section 8 matrix for every permission and role", () => {
    for (const permission of PERMISSIONS) {
      for (const role of ROLES) {
        const subject = { role, canSignForCompany: true };
        expect(can(subject, permission), `${role} ${permission}`).toBe(
          expected(role, permission),
        );
      }
    }
  });

  it("viewer has no write permissions", () => {
    for (const permission of PERMISSIONS) {
      if (permission.endsWith(".read")) continue;
      expect(
        can({ role: "viewer", canSignForCompany: false }, permission),
      ).toBe(false);
    }
  });

  it("contracts.sign_provider also requires canSignForCompany", () => {
    expect(
      can(
        { role: "owner", canSignForCompany: false },
        "contracts.sign_provider",
      ),
    ).toBe(false);
    expect(
      can(
        { role: "owner", canSignForCompany: true },
        "contracts.sign_provider",
      ),
    ).toBe(true);
  });

  it("assertCan throws FORBIDDEN", () => {
    expect(() =>
      assertCan({ role: "viewer", canSignForCompany: false }, "clients.write"),
    ).toThrow(AppError);
    expect(() =>
      assertCan({ role: "owner", canSignForCompany: true }, "clients.write"),
    ).not.toThrow();
  });
});
