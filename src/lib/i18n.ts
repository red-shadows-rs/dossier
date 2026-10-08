// Dossier - I 18 N Library Utility
// https://github.com/red-shadows-rs/dossier

import { LOCALES, type Locale } from "@/lib/constants";

export const LOCALE_COOKIE = "dossier_locale";
export const THEME_COOKIE = "dossier_theme";
export const THEMES = ["dark", "light", "system"] as const;
export type Theme = (typeof THEMES)[number];

export function isLocale(value: unknown): value is Locale {
  return (
    typeof value === "string" && (LOCALES as readonly string[]).includes(value)
  );
}

export function resolveLocale(
  value: string | undefined,
  fallback: Locale,
): Locale {
  return isLocale(value) ? value : fallback;
}

export function isTheme(value: unknown): value is Theme {
  return (
    typeof value === "string" && (THEMES as readonly string[]).includes(value)
  );
}

export function resolveTheme(value: string | undefined): Theme {
  return isTheme(value) ? value : "dark";
}

export function themeClass(theme: Theme): string {
  if (theme === "light") return "light";
  if (theme === "system") return "";
  return "dark";
}
