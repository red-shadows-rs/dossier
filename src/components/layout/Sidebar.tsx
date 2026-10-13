"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import MuiBox from "@mui/material/Box";
import MuiDrawer from "@mui/material/Drawer";
import MuiIconButton from "@mui/material/IconButton";
import MuiList from "@mui/material/List";
import { Logo } from "./Logo";
import { NavItem } from "./NavItem";
import { isActive, navEntries, type NavSubject } from "./nav";

const WIDTH = 240;
const COLLAPSED_WIDTH = 72;

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
  const width = collapsed ? COLLAPSED_WIDTH : WIDTH;

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
          <Link href="/" aria-label="Dossier">
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
      <MuiList component="nav" sx={{ py: 1 }}>
        {entries.map((entry) => (
          <NavItem
            key={entry.key}
            entry={entry}
            label={t(entry.key)}
            active={isActive(pathname, entry.href)}
            collapsed={collapsed}
          />
        ))}
      </MuiList>
    </MuiDrawer>
  );
}