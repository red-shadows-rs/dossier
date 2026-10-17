"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Monitor, Moon, Sun } from "lucide-react";
import MuiBox from "@mui/material/Box";
import MuiIconButton from "@mui/material/IconButton";
import { useColorScheme } from "@mui/material/styles";
import { THEME_COOKIE, type Theme } from "@/lib/i18n";
import { setTheme } from "@/server/actions/preferences";

const ORDER: Theme[] = ["light", "system", "dark"];

const ICONS = {
  light: Sun,
  system: Monitor,
  dark: Moon,
} as const;

export function ThemeSwitch({ current }: { current: Theme }) {
  const t = useTranslations("theme");
  const { mode, setMode } = useColorScheme();
  const [mounted, setMounted] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme: Theme = mounted && mode ? (mode as Theme) : current;

  const handleSelect = (nextTheme: Theme) => {
    if (setMode) {
      setMode(nextTheme);
    }

    const root = document.documentElement;
    if (nextTheme === "dark") {
      root.classList.remove("light");
      root.classList.add("dark");
    } else if (nextTheme === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.classList.toggle("dark", prefersDark);
      root.classList.toggle("light", !prefersDark);
    }

    document.cookie = `${THEME_COOKIE}=${nextTheme}; path=/; max-age=31536000; SameSite=Lax`;

    const formData = new FormData();
    formData.set("theme", nextTheme);
    startTransition(() => {
      setTheme(formData);
    });
  };

  return (
    <MuiBox sx={{ display: "flex", alignItems: "center" }}>
      {ORDER.map((theme) => {
        const Icon = ICONS[theme];
        const active = theme === activeTheme;
        return (
          <MuiIconButton
            key={theme}
            type="button"
            size="small"
            onClick={() => handleSelect(theme)}
            aria-label={t(theme)}
            aria-pressed={active}
            sx={{
              width: 32,
              height: 32,
              minWidth: 32,
              minHeight: 32,
              maxWidth: 32,
              maxHeight: 32,
              p: 0,
              borderRadius: "50%",
              aspectRatio: "1 / 1",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              color: active ? "primary.main" : "text.secondary",
              bgcolor: active ? "action.selected" : "transparent",
              "&:hover": { color: "primary.main", bgcolor: "action.hover" },
            }}
          >
            <Icon size={16} aria-hidden="true" />
          </MuiIconButton>
        );
      })}
    </MuiBox>
  );
}