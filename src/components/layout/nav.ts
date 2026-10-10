import {
  FileText,
  FolderKanban,
  LayoutDashboard,
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
};

export const NAV: NavEntry[] = [
  { key: "dashboard", href: "/", icon: LayoutDashboard, permission: null },
  { key: "clients", href: "/clients", icon: Users, permission: "clients.read" },
  {
    key: "projects",
    href: "/projects",
    icon: FolderKanban,
    permission: "projects.read",
  },
  {
    key: "contracts",
    href: "/contracts",
    icon: FileText,
    permission: "contracts.read",
  },
  {
    key: "invoices",
    href: "/invoices",
    icon: Receipt,
    permission: "invoices.read",
  },
  {
    key: "templates",
    href: "/templates",
    icon: Layers,
    permission: "templates.read",
  },
  {
    key: "settings",
    href: "/settings",
    icon: Settings,
    permission: "settings.read",
  },
  { key: "users", href: "/users", icon: UserCog, permission: "users.manage" },
  { key: "audit", href: "/audit", icon: ScrollText, permission: "audit.read" },
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