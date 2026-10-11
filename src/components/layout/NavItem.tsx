"use client";

import Link from "next/link";
import MuiListItemButton from "@mui/material/ListItemButton";
import MuiListItemIcon from "@mui/material/ListItemIcon";
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
    <MuiListItemButton
      component={Link}
      href={entry.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      selected={active}
      sx={{
        gap: 1,
        py: 1,
        borderRadius: (theme) => theme.shape.borderRadius,
        color: "text.secondary",
        "&.Mui-selected": {
          bgcolor: "primary.main",
          color: "primary.contrastText",
          "&:hover": { bgcolor: "primary.main" },
        },
      }}
    >
      <MuiListItemIcon sx={{ minWidth: 0, color: "inherit", fontSize: 0 }}>
        <Icon size={16} aria-hidden="true" />
      </MuiListItemIcon>
      <span>{label}</span>
    </MuiListItemButton>
  );
}