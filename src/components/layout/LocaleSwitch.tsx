"use client";

import { useLocale, useTranslations } from "next-intl";
import { Languages } from "lucide-react";
import MuiButton from "@mui/material/Button";
import { LOCALES } from "@/lib/constants";
import { setLocale } from "@/server/actions/preferences";

export function LocaleSwitch() {
  const active = useLocale();
  const t = useTranslations("locale");
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