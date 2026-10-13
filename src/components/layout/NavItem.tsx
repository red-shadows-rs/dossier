"use client";

import Link from "next/link";
import MuiListItemButton from "@mui/material/ListItemButton";
import MuiListItemIcon from "@mui/material/ListItemIcon";
import MuiListItemText from "@mui/material/ListItemText";
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
    >
      <MuiListItemIcon>
        <Icon size={20} aria-hidden="true" />
      </MuiListItemIcon>
      <MuiListItemText
        primary={label}
        slotProps={{ primary: { variant: "body2" } }}
      />
    </MuiListItemButton>
  );
}