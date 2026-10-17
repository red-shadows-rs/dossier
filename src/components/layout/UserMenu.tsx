"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { LogOut, User } from "lucide-react";
import MuiAvatar from "@mui/material/Avatar";
import MuiBox from "@mui/material/Box";
import MuiDivider from "@mui/material/Divider";
import MuiIconButton from "@mui/material/IconButton";
import MuiMenu from "@mui/material/Menu";
import MuiMenuItem from "@mui/material/MenuItem";
import MuiStack from "@mui/material/Stack";
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

  return (
    <>
      <MuiIconButton
        type="button"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={user.name}
        size="small"
        sx={{
          p: 0,
          width: 32,
          height: 32,
          minWidth: 32,
          minHeight: 32,
          aspectRatio: "1 / 1",
          borderRadius: "50%",
        }}
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
          <MuiTypography component="div" variant="body2" sx={{ fontWeight: 600 }} noWrap>
            {user.name}
          </MuiTypography>
          <MuiTypography component="div" variant="body2" color="text.secondary" noWrap>
            {user.email}
          </MuiTypography>
        </MuiBox>
        <MuiDivider />
        <MuiMenuItem
          component={Link}
          href="/account"
          onClick={() => setAnchorEl(null)}
        >
          <MuiStack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <User size={18} aria-hidden="true" />
            <MuiTypography variant="body2">{t("account")}</MuiTypography>
          </MuiStack>
        </MuiMenuItem>
        <form action={logoutAction}>
          <MuiMenuItem
            component="button"
            type="submit"
            sx={{ width: "100%", color: "error.main" }}
          >
            <MuiStack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <LogOut size={18} aria-hidden="true" />
              <MuiTypography variant="body2">{t("logout")}</MuiTypography>
            </MuiStack>
          </MuiMenuItem>
        </form>
      </MuiMenu>
    </>
  );
}