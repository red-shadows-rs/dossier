"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/components/ui/cn";
import type { Theme } from "@/lib/i18n";
import { LocaleSwitch } from "./LocaleSwitch";
import { ThemeSwitch } from "./ThemeSwitch";
import { isActive, navEntries, type NavSubject } from "./nav";

export function MobileNav({
  role,
  canSignForCompany,
  theme,
}: {
  role: NavSubject["role"];
  canSignForCompany: boolean;
  theme: Theme;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const entries = navEntries({ role, canSignForCompany });
  const side = locale === "ar" ? "right" : "left";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label={t("menu")}
        >
          <Menu size={18} aria-hidden="true" />
        </Button>
      </SheetTrigger>
      <SheetContent side={side} className="w-64 gap-0 p-0">
        <SheetTitle className="flex h-14 shrink-0 items-center border-b border-border px-4 text-lg font-bold text-primary">
          Dossier
        </SheetTitle>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-2">
          {entries.map((entry) => {
            const Icon = entry.icon;
            const active = isActive(pathname, entry.href);
            return (
              <Link
                key={entry.key}
                href={entry.href}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
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
        <div className="flex items-center justify-between gap-2 border-t border-border p-3">
          <LocaleSwitch />
          <ThemeSwitch current={theme} />
        </div>
      </SheetContent>
    </Sheet>
  );
}