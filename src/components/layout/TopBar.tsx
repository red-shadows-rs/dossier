import { cookies } from "next/headers";
import MuiAppBar from "@mui/material/AppBar";
import MuiBox from "@mui/material/Box";
import MuiToolbar from "@mui/material/Toolbar";
import { LocaleSwitch } from "@/components/layout/LocaleSwitch";
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
      position="static"
      elevation={0}
      color="inherit"
      sx={{
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        backgroundImage: "none",
      }}
    >
      <MuiToolbar
        sx={{ minHeight: 56, gap: 1.5, justifyContent: "space-between" }}
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
            <LocaleSwitch />
            <ThemeSwitch current={theme} />
          </MuiBox>
          <UserMenu user={user} />
        </MuiBox>
      </MuiToolbar>
    </MuiAppBar>
  );
}