// Dossier - Mobile Nav Layout Component
// https://github.com/red-shadows-rs/dossier

"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Menu as MenuIcon } from "lucide-react";
import MuiBox from "@mui/material/Box";
import MuiDrawer from "@mui/material/Drawer";
import MuiIconButton from "@mui/material/IconButton";
import MuiList from "@mui/material/List";
import type { Theme } from "@/lib/i18n";
import { LocaleSwitch } from "./LocaleSwitch";
import { Logo } from "./Logo";
import { NavItem } from "./NavItem";
import { ThemeSwitch } from "./ThemeSwitch";
import { isActive, navEntries, type NavSubject } from "./nav";

export function MobileNav({
  role,
  canSignForCompany,
  theme,
  isDemo,
}: {
  role: NavSubject["role"];
  canSignForCompany: boolean;
  theme: Theme;
  isDemo?: boolean;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const entries = navEntries({ role, canSignForCompany, isDemo });
  const side = locale === "ar" ? "right" : "left";

  return (
    <>
      <MuiIconButton
        onClick={() => setOpen(true)}
        aria-label={t("menu")}
        size="small"
        sx={{
          display: { xs: "inline-flex", md: "none" },
          width: 36,
          height: 36,
          minWidth: 36,
          minHeight: 36,
          p: 0,
          aspectRatio: "1 / 1",
          borderRadius: "50%",
        }}
      >
        <MenuIcon size={20} aria-hidden="true" />
      </MuiIconButton>
      <MuiDrawer anchor={side} open={open} onClose={() => setOpen(false)}>
        <MuiBox
          sx={{
            width: 256,
            display: "flex",
            flexDirection: "column",
            height: "100%",
          }}
        >
          <MuiBox
            sx={{
              display: "flex",
              height: 56,
              alignItems: "center",
              px: 2,
              borderBottom: "1px solid",
              borderColor: "divider",
            }}
          >
            <Logo />
          </MuiBox>
          <MuiList
            component="nav"
            sx={{
              p: 1,
              display: "flex",
              flexDirection: "column",
              gap: 0.5,
              flex: 1,
              overflowY: "auto",
            }}
          >
            {entries.map((entry) => (
              <NavItem
                key={entry.key}
                entry={entry}
                label={t(entry.key)}
                active={isActive(pathname, entry.href)}
                onNavigate={() => setOpen(false)}
              />
            ))}
          </MuiList>
          <MuiBox
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 1,
              p: 1.5,
              borderTop: "1px solid",
              borderColor: "divider",
            }}
          >
            <LocaleSwitch />
            <ThemeSwitch current={theme} />
          </MuiBox>
        </MuiBox>
      </MuiDrawer>
    </>
  );
}