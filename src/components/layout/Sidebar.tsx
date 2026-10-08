"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
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
import { cn } from "@/components/ui/cn";

type NavEntry = {
  key: string;
  href: string;
  icon: LucideIcon;
  permission: Permission | null;
};

const NAV: NavEntry[] = [
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

export function Sidebar({
  role,
  canSignForCompany,
}: {
  role: "owner" | "member" | "viewer";
  canSignForCompany: boolean;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const subject = { role, canSignForCompany };
  const entries = NAV.filter(
    (entry) => entry.permission === null || can(subject, entry.permission),
  );

  return (
    <aside className="hidden w-60 shrink-0 border-e border-border bg-surface md:flex md:flex-col">
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link href="/" className="text-lg font-bold text-primary">
          Dossier
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {entries.map((entry) => {
          const Icon = entry.icon;
          const active =
            entry.href === "/"
              ? pathname === "/"
              : pathname === entry.href ||
                pathname.startsWith(`${entry.href}/`);
          return (
            <Link
              key={entry.key}
              href={entry.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-background hover:text-foreground",
              )}
            >
              <Icon size={16} aria-hidden="true" className="shrink-0" />
              <span>{t(entry.key)}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
