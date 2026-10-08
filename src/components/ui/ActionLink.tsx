// Dossier - Action Link Ui Component
// https://github.com/red-shadows-rs/dossier

"use client";

import Link from "next/link";
import { Download, Eye, Pencil, Trash2 } from "lucide-react";
import { Tooltip } from "@/components/ui/Tooltip";
import { cn } from "@/components/ui/cn";

const ICONS = {
  preview: Eye,
  view: Eye,
  edit: Pencil,
  delete: Trash2,
  download: Download,
} as const;

export type ActionKind = keyof typeof ICONS;

export function ActionLink({
  href,
  action,
  label,
  className,
}: {
  href: string;
  action: ActionKind;
  label: string;
  className?: string;
}) {
  const Icon = ICONS[action];
  return (
    <Tooltip content={label}>
      <Link
        href={href}
        prefetch={false}
        aria-label={label}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded border border-border/70 bg-card text-muted-foreground hover:bg-muted hover:text-foreground hover:border-primary/50 transition-all shadow-2xs",
          action === "delete" &&
            "hover:border-destructive/50 hover:text-destructive hover:bg-destructive/10",
          className,
        )}
      >
        <Icon size={15} aria-hidden="true" />
      </Link>
    </Tooltip>
  );
}