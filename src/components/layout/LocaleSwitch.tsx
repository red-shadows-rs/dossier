"use client";

import { useLocale, useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import MuiBox from "@mui/material/Box";
import MuiButton from "@mui/material/Button";
import { LOCALES } from "@/lib/constants";
import { setLocale } from "@/server/actions/preferences";

export function LocaleSwitch({
  variant = "group",
}: {
  variant?: "group" | "toggle";
}) {
  const active = useLocale();
  const t = useTranslations("locale");

  if (variant === "toggle") {
    const target = LOCALES.find((locale) => locale !== active) ?? LOCALES[0];
    return (
      <form action={setLocale}>
        <input type="hidden" name="locale" value={target} />
        <MuiButton
          type="submit"
          variant="text"
          color="inherit"
          size="small"
          sx={{ height: 32, minWidth: 0 }}
        >
          <Languages size={16} aria-hidden="true" />
          {t(target)}
        </MuiButton>
      </form>
    );
  }

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