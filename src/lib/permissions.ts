import type { Role } from "@/lib/constants";
import { AppError } from "@/lib/errors";

export const PERMISSIONS = [
  "clients.read",
  "clients.write",
  "projects.read",
  "projects.write",
  "templates.read",
  "templates.write",
  "contracts.read",
  "contracts.write",
  "contracts.send",
  "contracts.sign_provider",
  "contracts.cancel",
  "contracts.terminate",
  "invoices.read",
  "invoices.write",
  "invoices.issue",
  "invoices.void",
  "payments.write",
  "payments.void",
  "settings.read",
  "settings.write",
  "users.manage",
  "audit.read",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export type PermissionSubject = {
  role: Role;
  canSignForCompany: boolean;
};

const ALL: Role[] = ["owner", "member", "viewer"];
const WRITERS: Role[] = ["owner", "member"];
const OWNER_ONLY: Role[] = ["owner"];

const MATRIX: Record<Permission, Role[]> = {
  "clients.read": ALL,
  "clients.write": WRITERS,
  "projects.read": ALL,
  "projects.write": WRITERS,
  "templates.read": ALL,
  "templates.write": WRITERS,
  "contracts.read": ALL,
  "contracts.write": WRITERS,
  "contracts.send": WRITERS,
  "contracts.sign_provider": WRITERS,
  "contracts.cancel": WRITERS,
  "contracts.terminate": OWNER_ONLY,
  "invoices.read": ALL,
  "invoices.write": WRITERS,
  "invoices.issue": WRITERS,
  "invoices.void": OWNER_ONLY,
  "payments.write": WRITERS,
  "payments.void": OWNER_ONLY,
  "settings.read": WRITERS,
  "settings.write": OWNER_ONLY,
  "users.manage": OWNER_ONLY,
  "audit.read": OWNER_ONLY,
};

export function can(
  subject: PermissionSubject,
  permission: Permission,
): boolean {
  if (!MATRIX[permission].includes(subject.role)) return false;
  if (permission === "contracts.sign_provider") {
    return subject.canSignForCompany;
  }
  return true;
}

export function assertCan(
  subject: PermissionSubject,
  permission: Permission,
): void {
  if (!can(subject, permission)) {
    throw new AppError("FORBIDDEN", "You do not have permission");
  }
}
