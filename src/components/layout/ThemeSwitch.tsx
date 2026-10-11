"use client";

import { useId } from "react";
import { useTranslations } from "next-intl";
import MuiSelect from "@mui/material/Select";
import type { Theme } from "@/lib/i18n";
import { THEMES } from "@/lib/i18n";
import { setTheme } from "@/server/actions/preferences";

export function ThemeSwitch({ current }: { current: Theme }) {
  const t = useTranslations("theme");
  const id = useId();

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