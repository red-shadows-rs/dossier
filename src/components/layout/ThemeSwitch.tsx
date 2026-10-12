"use client";

import { useTranslations } from "next-intl";
import { Monitor, Moon, Sun } from "lucide-react";
import MuiBox from "@mui/material/Box";
import MuiIconButton from "@mui/material/IconButton";
import type { Theme } from "@/lib/i18n";
import { setTheme } from "@/server/actions/preferences";

const ORDER: Theme[] = ["light", "system", "dark"];

const ICONS = {
  light: Sun,
  system: Monitor,
  dark: Moon,
} as const;

export function ThemeSwitch({ current }: { current: Theme }) {
  const t = useTranslations("theme");

  return (
    <MuiBox sx={{ display: "flex", alignItems: "center" }}>
      {ORDER.map((theme) => {
        const Icon = ICONS[theme];
        const active = theme === current;
        return (
          <form key={theme} action={setTheme}>
            <input type="hidden" name="theme" value={theme} />
            <MuiIconButton
              type="submit"
              size="small"
              aria-label={t(theme)}
              aria-pressed={active}
              sx={{
                color: active ? "text.primary" : "text.secondary",
                "&:hover": { color: "text.primary" },
              }}
            >
              <Icon size={16} aria-hidden="true" />
            </MuiIconButton>
          </form>
        );
      })}
    </MuiBox>
  );
}