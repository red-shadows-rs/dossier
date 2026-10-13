"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import MuiBox from "@mui/material/Box";
import MuiDivider from "@mui/material/Divider";
import MuiDrawer from "@mui/material/Drawer";
import MuiIconButton from "@mui/material/IconButton";
import MuiList from "@mui/material/List";
import MuiListSubheader from "@mui/material/ListSubheader";
import { Logo } from "./Logo";
import { NavItem } from "./NavItem";
import { isActive, navEntries, type NavSubject } from "./nav";

const WIDTH = 240;
const COLLAPSED_WIDTH = 72;

const sectionLabelSx = {
  bgcolor: "transparent",
  lineHeight: "30px",
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "text.secondary",
  px: 2,
} as const;

export function Sidebar({
  role,
  canSignForCompany,
}: {
  role: NavSubject["role"];
  canSignForCompany: boolean;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const entries = navEntries({ role, canSignForCompany });
  const mainEntries = entries.filter((entry) => entry.section === "main");
  const manageEntries = entries.filter((entry) => entry.section === "manage");
  const width = collapsed ? COLLAPSED_WIDTH : WIDTH;

  const renderEntry = (entry: (typeof entries)[number]) => (
    <NavItem
      key={entry.key}
      entry={entry}
      label={t(entry.key)}
      active={isActive(pathname, entry.href)}
      collapsed={collapsed}
    />
  );

  return (
    <MuiDrawer
      variant="permanent"
      open
      slotProps={{ paper: { component: "aside" } }}
      sx={{
        display: { xs: "none", md: "block" },
        width,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width,
          boxSizing: "border-box",
          borderInlineEnd: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
          overflowX: "hidden",
          transition: (theme) => theme.transitions.create("width"),
        },
      }}
    >
      <MuiBox
        sx={{
          display: "flex",
          height: 56,
          alignItems: "center",
          justifyContent: collapsed ? "center" : "space-between",
          px: collapsed ? 0 : 2,
          borderBottom: "1px solid",
          borderColor: "divider",
        }}
      >
        {collapsed ? null : (
          <Link href="/" aria-label="Dossier" className="flex h-8 items-center">
            <Logo />
          </Link>
        )}
        <MuiIconButton
          size="small"
          onClick={() => setCollapsed((value) => !value)}
          aria-label={t(collapsed ? "expand" : "collapse")}
        >
          {collapsed ? (
            <PanelLeftOpen size={18} aria-hidden="true" />
          ) : (
            <PanelLeftClose size={18} aria-hidden="true" />
          )}
        </MuiIconButton>
      </MuiBox>

      {collapsed ? null : (
        <MuiListSubheader component="div" sx={{ ...sectionLabelSx, mt: 1 }}>
          {t("general")}
        </MuiListSubheader>
      )}
      <MuiList component="nav" sx={{ px: 1, pb: 1, pt: collapsed ? 1 : 0 }}>
        {mainEntries.map(renderEntry)}
      </MuiList>

      {manageEntries.length > 0 ? (
        collapsed ? (
          <MuiDivider sx={{ mx: 2, my: 0.5 }} />
        ) : (
          <MuiListSubheader component="div" sx={sectionLabelSx}>
            {t("management")}
          </MuiListSubheader>
        )
      ) : null}
      <MuiList
        component="nav"
        sx={{ px: 1, pb: 1, pt: collapsed ? 0 : 0 }}
      >
        {manageEntries.map(renderEntry)}
      </MuiList>
    </MuiDrawer>
  );
}