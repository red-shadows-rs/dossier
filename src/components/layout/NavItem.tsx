"use client";

import Link from "next/link";
import MuiListItemButton from "@mui/material/ListItemButton";
import MuiListItemIcon from "@mui/material/ListItemIcon";
import MuiListItemText from "@mui/material/ListItemText";
import MuiTooltip from "@mui/material/Tooltip";
import type { NavEntry } from "./nav";

export function NavItem({
  entry,
  label,
  active,
  onNavigate,
  collapsed = false,
}: {
  entry: NavEntry;
  label: string;
  active: boolean;
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const Icon = entry.icon;
  const button = (
    <MuiListItemButton
      component={Link}
      href={entry.href}
      aria-current={active ? "page" : undefined}
      onClick={onNavigate}
      selected={active}
      sx={{
        borderRadius: (theme) => theme.shape.borderRadius,
        mb: 0.25,
        ...(collapsed ? { justifyContent: "center", px: 1.5 } : {}),
        "&.Mui-selected": {
          bgcolor: "action.selected",
          color: "primary.main",
          "&:hover": { bgcolor: "action.selected" },
        },
      }}
    >
      <MuiListItemIcon
        sx={{
          minWidth: collapsed ? 0 : 40,
          justifyContent: collapsed ? "center" : undefined,
          color: "inherit",
        }}
      >
        <Icon size={20} aria-hidden="true" />
      </MuiListItemIcon>
      {collapsed ? null : (
        <MuiListItemText
          primary={label}
          slotProps={{ primary: { variant: "body2" } }}
        />
      )}
    </MuiListItemButton>
  );

  return collapsed ? (
    <MuiTooltip title={label}>{button}</MuiTooltip>
  ) : (
    button
  );
}