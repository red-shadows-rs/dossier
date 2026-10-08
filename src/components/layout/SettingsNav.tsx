"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { cn } from "@/components/ui/cn";

const SECTIONS = [
  { key: "company", href: "/settings/company" },
  { key: "defaults", href: "/settings/defaults" },
  { key: "numbering", href: "/settings/numbering" },
  { key: "signing", href: "/settings/signing" },
  { key: "email", href: "/settings/email" },
] as const;

export function SettingsNav() {
  const t = useTranslations("settings");
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border">
      {SECTIONS.map((section) => {
        const active = pathname === section.href;
        return (
          <Link
            key={section.key}
            href={section.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t(section.key)}
          </Link>
        );
      })}
    </nav>
  );
}
