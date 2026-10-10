"use client";

import Link from "next/link";
import { cn } from "@/components/ui/cn";
import type { NavEntry } from "./nav";

export function NavItem({
  entry,
  label,
  active,
  onNavigate,
}: {
  entry: NavEntry;
  label: string;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = entry.icon;
  return (
    <Link
      href={entry.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-background hover:text-foreground",
      )}
    >
      <Icon size={16} aria-hidden="true" className="shrink-0" />
      <span>{label}</span>
    </Link>
  );
}