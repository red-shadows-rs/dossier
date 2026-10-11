"use client";

import { useLocale, useTranslations } from "next-intl";
import MuiBox from "@mui/material/Box";
import MuiButton from "@mui/material/Button";
import { LOCALES } from "@/lib/constants";
import { setLocale } from "@/server/actions/preferences";

export function LocaleSwitch() {
  const active = useLocale();
  const t = useTranslations("locale");

  return (
    <MuiBox sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      {LOCALES.map((locale) => {
        const isActive = locale === active;
        return (
          <form key={locale} action={setLocale}>
            <input type="hidden" name="locale" value={locale} />
            <MuiButton
              type="submit"
              disabled={isActive}
              aria-current={isActive ? "true" : undefined}
              variant={isActive ? "contained" : "text"}
              color={isActive ? "primary" : "inherit"}
              size="small"
              sx={{ minWidth: 0 }}
            >
              {t(locale)}
            </MuiButton>
          </form>
        );
      })}
    </MuiBox>
  );
}