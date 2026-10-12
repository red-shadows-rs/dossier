"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import { prefixer } from "stylis";
import rtlPlugin from "@mui/stylis-plugin-rtl";
import type { Theme } from "@/lib/i18n";
import { createAppTheme, type AppDirection } from "@/theme";

export function Providers({
  dir,
  colorTheme,
  children,
}: {
  dir: AppDirection;
  colorTheme: Theme;
  children: ReactNode;
}) {
  const rtl = dir === "rtl";

  const options = useMemo(
    () =>
      rtl
        ? {
            enableCssLayer: true,
            key: "muirtl",
            stylisPlugins: [prefixer, rtlPlugin],
          }
        : { enableCssLayer: true, key: "mui" },
    [rtl],
  );

  const theme = useMemo(() => createAppTheme(dir), [dir]);

  useEffect(() => {
    if (colorTheme !== "system") {
      return;
    }
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      root.classList.toggle("dark", media.matches);
      root.classList.toggle("light", !media.matches);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [colorTheme]);

  return (
    <AppRouterCacheProvider key={dir} options={options}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </AppRouterCacheProvider>
  );
}