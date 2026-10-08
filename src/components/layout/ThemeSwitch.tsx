"use client";

import { useTranslations } from "next-intl";
import type { Theme } from "@/lib/i18n";
import { THEMES } from "@/lib/i18n";
import { setTheme } from "@/server/actions/preferences";

export function ThemeSwitch({ current }: { current: Theme }) {
  const t = useTranslations("theme");

  return (
    <form action={setTheme}>
      <label htmlFor="dossier-theme" className="sr-only">
        {t("label")}
      </label>
      <select
        id="dossier-theme"
        name="theme"
        defaultValue={current}
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-border bg-surface px-2 py-1 text-sm text-foreground"
      >
        {THEMES.map((theme) => (
          <option key={theme} value={theme}>
            {t(theme)}
          </option>
        ))}
      </select>
    </form>
  );
}
