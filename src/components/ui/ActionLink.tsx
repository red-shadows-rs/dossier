"use client";

import Link from "next/link";
import { Download, Eye, Pencil, Trash2 } from "lucide-react";
import MuiIconButton from "@mui/material/IconButton";
import MuiTooltip from "@mui/material/Tooltip";

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
}: {
  href: string;
  action: ActionKind;
  label: string;
}) {
  const Icon = ICONS[action];
  return (
    <MuiTooltip title={label}>
      <MuiIconButton
        component={Link}
        href={href}
        aria-label={label}
        size="small"
      >
        <Icon size={18} aria-hidden="true" />
      </MuiIconButton>
    </MuiTooltip>
  );
}