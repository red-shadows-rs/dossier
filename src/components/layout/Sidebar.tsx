"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import MuiBox from "@mui/material/Box";
import MuiDrawer from "@mui/material/Drawer";
import MuiList from "@mui/material/List";
import { Logo } from "./Logo";
import { NavItem } from "./NavItem";
import { isActive, navEntries, type NavSubject } from "./nav";

const WIDTH = 240;

export function Sidebar({
  role,
  canSignForCompany,
}: {
  role: NavSubject["role"];
  canSignForCompany: boolean;
}) {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const entries = navEntries({ role, canSignForCompany });

  return (
    <MuiDrawer
      variant="permanent"
      open
      slotProps={{ paper: { component: "aside" } }}
      sx={{
        display: { xs: "none", md: "block" },
        width: WIDTH,
        flexShrink: 0,
        "& .MuiDrawer-paper": {
          width: WIDTH,
          boxSizing: "border-box",
          borderInlineEnd: "1px solid",
          borderColor: "divider",
          bgcolor: "background.paper",
        },
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
        <Link href="/" aria-label="Dossier">
          <Logo />
        </Link>
      </MuiBox>
      <MuiList component="nav" sx={{ py: 1 }}>
        {entries.map((entry) => (
          <NavItem
            key={entry.key}
            entry={entry}
            label={t(entry.key)}
            active={isActive(pathname, entry.href)}
          />
        ))}
      </MuiList>
    </MuiDrawer>
  );
}