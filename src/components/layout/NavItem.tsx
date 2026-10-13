"use client";

import Link from "next/link";
import MuiListItemButton from "@mui/material/ListItemButton";
import MuiListItemIcon from "@mui/material/ListItemIcon";
import MuiListItemText from "@mui/material/ListItemText";
import MuiTooltip from "@mui/material/Tooltip";
import { alpha } from "@mui/material/styles";
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
        gap: 1.5,
        borderRadius: "4px",
        mb: 0.25,
        px: 1.5,
        py: 1,
        color: "text.secondary",
        "&:hover": { bgcolor: "action.hover", color: "text.primary" },
        ...(collapsed ? { justifyContent: "center" } : {}),
        "&.Mui-selected": {
          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
          color: "primary.main",
          "&:hover": {
            bgcolor: (theme) => alpha(theme.palette.primary.main, 0.18),
          },
        },
      }}
    >
      <MuiListItemIcon
        sx={{
          minWidth: 0,
          justifyContent: collapsed ? "center" : undefined,
          color: "inherit",
        }}
      >
        <Icon size={20} aria-hidden="true" />
      </MuiListItemIcon>
      {collapsed ? null : (
        <MuiListItemText
          primary={label}
          slotProps={{
            primary: {
              variant: "body2",
              sx: { fontWeight: active ? 600 : 400 },
            },
          }}
        />
      )}
    </MuiListItemButton>
  );

  return collapsed ? <MuiTooltip title={label}>{button}</MuiTooltip> : button;
}