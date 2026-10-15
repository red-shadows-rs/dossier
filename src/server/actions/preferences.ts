"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { isLocale, isTheme, LOCALE_COOKIE, THEME_COOKIE } from "@/lib/i18n";

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

function cookieOptions() {
  return {
    path: "/",
    sameSite: "lax" as const,
    httpOnly: false,
    secure: Boolean(env.APP_URL?.startsWith("https://")),
    maxAge: ONE_YEAR_SECONDS,
  };
}

export async function setLocale(formData: FormData): Promise<void> {
  const locale = formData.get("locale");
  if (!isLocale(locale)) return;
  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, cookieOptions());
  revalidatePath("/", "layout");
}

export async function setTheme(formData: FormData): Promise<void> {
  const theme = formData.get("theme");
  if (!isTheme(theme)) return;
  const store = await cookies();
  store.set(THEME_COOKIE, theme, cookieOptions());
  revalidatePath("/", "layout");
}
