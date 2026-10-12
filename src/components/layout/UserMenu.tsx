"use client";

import { useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import MuiButton from "@mui/material/Button";
import MuiMenu from "@mui/material/Menu";
import MuiMenuItem from "@mui/material/MenuItem";
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
      <MuiButton
        type="button"
        onClick={(event) => setAnchorEl(event.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={open}
        variant="outlined"
        color="inherit"
        size="small"
        sx={{ height: 32 }}
        endIcon={<ChevronDown size={16} aria-hidden="true" />}
      >
        <span className="hidden max-w-[10rem] truncate sm:inline">
          {user.name}
        </span>
      </MuiButton>
      <MuiMenu
        anchorEl={anchorEl}
        open={open}
        onClose={() => setAnchorEl(null)}
        anchorOrigin={{ vertical: "bottom", horizontal }}
        transformOrigin={{ vertical: "top", horizontal }}
      >
        <MuiMenuItem
          component={Link}
          href="/account"
          onClick={() => setAnchorEl(null)}
        >
          {t("account")}
        </MuiMenuItem>
        <form action={logoutAction}>
          <MuiMenuItem
            component="button"
            type="submit"
            sx={{ width: "100%", color: "error.main" }}
          >
            {t("logout")}
          </MuiMenuItem>
        </form>
      </MuiMenu>
    </>
  );
}