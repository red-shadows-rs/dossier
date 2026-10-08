import { cookies } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { env } from "@/lib/env";
import { LOCALE_COOKIE, resolveLocale } from "@/lib/i18n";

export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = resolveLocale(
    store.get(LOCALE_COOKIE)?.value,
    env.DEFAULT_LOCALE,
  );
  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
