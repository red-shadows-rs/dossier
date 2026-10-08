"use client";

import { useLocale, useTranslations } from "next-intl";
import { LOCALES } from "@/lib/constants";
import { setLocale } from "@/server/actions/preferences";

export function LocaleSwitch() {
  const active = useLocale();
  const t = useTranslations("locale");

  return (
    <div className="flex items-center gap-1">
      {LOCALES.map((locale) => {
        const isActive = locale === active;
        return (
          <form key={locale} action={setLocale}>
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              disabled={isActive}
              aria-current={isActive ? "true" : undefined}
              className={`rounded-md px-2 py-1 text-sm transition-colors ${
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(locale)}
            </button>
          </form>
        );
      })}
    </div>
  );
}
