"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/components/ui/cn";
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
        {entries.map((entry) => {
          const Icon = entry.icon;
          const active = isActive(pathname, entry.href);
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