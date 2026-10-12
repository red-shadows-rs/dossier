"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import { Monitor, Moon, Sun } from "lucide-react";
import MuiIconButton from "@mui/material/IconButton";
import MuiSelect from "@mui/material/Select";
import type { Theme } from "@/lib/i18n";
import { THEMES } from "@/lib/i18n";
import { setTheme } from "@/server/actions/preferences";

const NEXT_THEME: Record<Theme, Theme> = {
  light: "dark",
  dark: "system",
  system: "light",
};

export function ThemeSwitch({
  current,
  variant = "select",
}: {
  current: Theme;
  variant?: "select" | "icon";
}) {
  const t = useTranslations("theme");
  const id = useId();

  if (variant === "icon") {
    return (
      <form action={setTheme}>
        <input type="hidden" name="theme" value={NEXT_THEME[current]} />
        <MuiIconButton type="submit" size="small" aria-label={t("label")}>
          {current === "light" ? (
            <Sun size={16} aria-hidden="true" />
          ) : current === "dark" ? (
            <Moon size={16} aria-hidden="true" />
          ) : (
            <Monitor size={16} aria-hidden="true" />
          )}
        </MuiIconButton>
      </form>
    );
  }

  return (
    <form action={setTheme} className="flex items-center gap-2">
      <label htmlFor={id} className="sr-only">
        {t("label")}
      </label>
      <MuiSelect
        native
        size="small"
        variant="outlined"
        id={id}
        name="theme"
        defaultValue={current}
        onChange={(event) => {
          const form = (event.target as unknown as HTMLSelectElement).form;
          form?.requestSubmit();
        }}
        sx={{ minWidth: 96 }}
      >
        {THEMES.map((theme) => (
          <option key={theme} value={theme}>
            {t(theme)}
          </option>
        ))}
      </MuiSelect>
    </form>
  );
}