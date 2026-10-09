// Dossier - Nav Layout Component
// https://github.com/red-shadows-rs/dossier

import {
  FileText,
  FolderKanban,
  Gauge,
  Layers,
  Receipt,
  ScrollText,
  Settings,
  UserCog,
  Users,
  type LucideIcon,
} from "lucide-react";
import { can, type Permission } from "@/lib/permissions";

export type NavSubject = {
  role: "owner" | "member" | "viewer";
  canSignForCompany: boolean;
};

export type NavEntry = {
  key: string;
  href: string;
  icon: LucideIcon;
  permission: Permission | null;
  section: "main" | "manage";
};

export const NAV: NavEntry[] = [
  {
    key: "dashboard",
    href: "/",
    icon: Gauge,
    permission: null,
    section: "main",
  },
  {
    key: "clients",
    href: "/clients",
    icon: Users,
    permission: "clients.read",
    section: "main",
  },
  {
    key: "projects",
    href: "/projects",
    icon: FolderKanban,
    permission: "projects.read",
    section: "main",
  },
  {
    key: "contracts",
    href: "/contracts",
    icon: FileText,
    permission: "contracts.read",
    section: "main",
  },
  {
    key: "invoices",
    href: "/invoices",
    icon: Receipt,
    permission: "invoices.read",
    section: "main",
  },
  {
    key: "templates",
    href: "/templates",
    icon: Layers,
    permission: "templates.read",
    section: "main",
  },
  {
    key: "settings",
    href: "/settings",
    icon: Settings,
    permission: "settings.read",
    section: "manage",
  },
  {
    key: "users",
    href: "/users",
    icon: UserCog,
    permission: "users.manage",
    section: "manage",
  },
  {
    key: "audit",
    href: "/audit",
    icon: ScrollText,
    permission: "audit.read",
    section: "manage",
  },
];

export function navEntries(subject: NavSubject): NavEntry[] {
  return NAV.filter(
    (entry) => entry.permission === null || can(subject, entry.permission),
  );
}

export function isActive(pathname: string, href: string): boolean {
  return href === "/"
    ? pathname === "/"
    : pathname === href || pathname.startsWith(`${href}/`);
}