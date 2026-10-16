"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Building2,
  FileSignature,
  Hash,
  Mail,
  Sliders,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/components/ui/cn";

const SECTIONS: readonly {
  key: "company" | "defaults" | "numbering" | "signing" | "email";
  href: string;
  icon: LucideIcon;
}[] = [
  { key: "company", href: "/settings/company", icon: Building2 },
  { key: "defaults", href: "/settings/defaults", icon: Sliders },
  { key: "numbering", href: "/settings/numbering", icon: Hash },
  { key: "signing", href: "/settings/signing", icon: FileSignature },
  { key: "email", href: "/settings/email", icon: Mail },
] as const;

export function SettingsNav() {
  const t = useTranslations("settings");
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1.5 overflow-x-auto touch-pan-x [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden border-b border-border/60 pb-2">
      {SECTIONS.map((section) => {
        const active = pathname === section.href;
        const Icon = section.icon;
        return (
          <Link
            key={section.key}
            href={section.href}
            prefetch={false}
            aria-current={active ? "page" : undefined}
            className={cn(
              "inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3.5 py-2 text-sm font-medium transition-all duration-150",
              active
                ? "bg-primary/10 text-primary shadow-xs font-semibold"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground",
            )}
          >
            <Icon
              size={16}
              className={active ? "text-primary" : "text-muted-foreground"}
              aria-hidden="true"
            />
            <span>{t(section.key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
