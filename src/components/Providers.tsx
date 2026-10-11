"use client";

import { useMemo, type ReactNode } from "react";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import { ThemeProvider } from "@mui/material/styles";
import { prefixer } from "stylis";
import rtlPlugin from "@mui/stylis-plugin-rtl";
import { createAppTheme, type AppDirection } from "@/theme";

export function Providers({
  dir,
  children,
}: {
  dir: AppDirection;
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

  return (
    <AppRouterCacheProvider options={options}>
      <ThemeProvider theme={theme}>{children}</ThemeProvider>
    </AppRouterCacheProvider>
  );
}