"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LogOut, User } from "lucide-react";
import MuiAvatar from "@mui/material/Avatar";
import MuiBox from "@mui/material/Box";
import MuiDivider from "@mui/material/Divider";
import MuiIconButton from "@mui/material/IconButton";
import MuiListItemIcon from "@mui/material/ListItemIcon";
import MuiListItemText from "@mui/material/ListItemText";
import MuiMenu from "@mui/material/Menu";
import MuiMenuItem from "@mui/material/MenuItem";
import MuiTypography from "@mui/material/Typography";
import { useTheme } from "@mui/material/styles";
import { logoutAction } from "@/server/actions/auth";
import type { SessionUser } from "@/server/auth/session";

export function UserMenu({ user }: { user: SessionUser }) {
  const t = useTranslations("nav");
  const theme = useTheme();
  const horizontal = theme.direction === "rtl" ? "left" : "right";
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const open = Boolean(anchorEl);

  const iconSlot = (node: React.ReactNode) => (
    <MuiListItemIcon sx={{ minWidth: 32, color: "inherit" }}>
      {node}
    </MuiListItemIcon>
  );

  return (
    <>
      <MuiIconButton
        type="button"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={user.name}
        size="small"
        sx={{ p: 0.5 }}
      >
        <MuiAvatar
          sx={{
            width: 28,
            height: 28,
            fontSize: 14,
            bgcolor: "primary.main",
            color: "primary.contrastText",
          }}
        >
          {user.name.charAt(0)}
        </MuiAvatar>
      </MuiIconButton>
      <MuiMenu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal }}
        transformOrigin={{ vertical: "top", horizontal }}
        slotProps={{ paper: { elevation: 1, sx: { minWidth: 220, mt: 0.5 } } }}
      >
        <MuiBox sx={{ px: 2, py: 1 }}>
          <MuiTypography variant="subtitle2" noWrap>
            {user.name}
          </MuiTypography>
          <MuiTypography variant="caption" color="text.secondary" noWrap>
            {user.email}
          </MuiTypography>
        </MuiBox>
        <MuiDivider />
        <MuiMenuItem
          component={Link}
          href="/account"
          onClick={() => setAnchorEl(null)}
        >
          {iconSlot(<User size={18} aria-hidden="true" />)}
          <MuiListItemText
            primary={t("account")}
            slotProps={{ primary: { variant: "body2" } }}
          />
        </MuiMenuItem>
        <form action={logoutAction}>
          <MuiMenuItem
            component="button"
            type="submit"
            sx={{ width: "100%", color: "error.main" }}
          >
            {iconSlot(<LogOut size={18} aria-hidden="true" />)}
            <MuiListItemText
              primary={t("logout")}
              slotProps={{ primary: { variant: "body2" } }}
            />
          </MuiMenuItem>
        </form>
      </MuiMenu>
    </>
  );
}