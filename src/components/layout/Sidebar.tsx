"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { NavItem } from "./NavItem";
import { isActive, navEntries, type NavSubject } from "./nav";

export function Sidebar({
  role,
  canSignForCompany,
}: {
  role: NavSubject["role"];
  canSignForCompany: boolean;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const entries = navEntries({ role, canSignForCompany });

  return (
    <aside className="hidden w-60 shrink-0 border-e border-border bg-surface md:flex md:flex-col">
      <div className="flex h-14 items-center border-b border-border px-4">
        <Link href="/" className="text-lg font-bold text-primary">
          Dossier
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-2">
        {entries.map((entry) => (
          <NavItem
            key={entry.key}
            entry={entry}
            label={t(entry.key)}
            active={isActive(pathname, entry.href)}
          />
        ))}
      </nav>
    </aside>
  );
}