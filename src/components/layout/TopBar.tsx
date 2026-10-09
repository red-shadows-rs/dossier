// Dossier - Top Bar Layout Component
// https://github.com/red-shadows-rs/dossier

import { cookies } from "next/headers";
import MuiAppBar from "@mui/material/AppBar";
import MuiBox from "@mui/material/Box";
import { AppBreadcrumbs } from "@/components/layout/AppBreadcrumbs";
import { LocaleSwitch } from "@/components/layout/LocaleSwitch";
import { HeaderSearch } from "@/components/layout/HeaderSearch";
import { Logo } from "@/components/layout/Logo";
import { MobileNav } from "@/components/layout/MobileNav";
import { ThemeSwitch } from "@/components/layout/ThemeSwitch";
import { UserMenu } from "@/components/layout/UserMenu";
import { resolveTheme, THEME_COOKIE } from "@/lib/i18n";
import type { SessionUser } from "@/server/auth/session";

export async function TopBar({ user }: { user: SessionUser }) {
  const store = await cookies();
  const theme = resolveTheme(store.get(THEME_COOKIE)?.value);

  return (
    <MuiAppBar
      position="sticky"
      elevation={0}
      color="inherit"
      sx={{
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        backgroundImage: "none",
      }}
    >
      <MuiBox
        component="div"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          height: 56,
          px: 2,
        }}
      >
        <MuiBox
          sx={{
            display: { xs: "flex", md: "none" },
            alignItems: "center",
            gap: 1,
          }}
        >
          <MobileNav
            role={user.role}
            canSignForCompany={user.canSignForCompany}
            theme={theme}
          />
          <Logo />
        </MuiBox>
        <MuiBox
          sx={{
            display: { xs: "none", sm: "block" },
            width: "100%",
            maxWidth: 420,
          }}
        >
          <HeaderSearch />
        </MuiBox>
        <MuiBox
          sx={{
            marginInlineStart: "auto",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <MuiBox
            sx={{
              display: { xs: "none", md: "flex" },
              alignItems: "center",
              gap: 1.5,
            }}
          >
            <ThemeSwitch current={theme} />
            <LocaleSwitch />
          </MuiBox>
          <UserMenu user={user} />
        </MuiBox>
      </MuiBox>
      <MuiBox
        sx={{
          display: { xs: "none", md: "block" },
          px: 2,
          py: 0.75,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <AppBreadcrumbs />
      </MuiBox>
    </MuiAppBar>
  );
}