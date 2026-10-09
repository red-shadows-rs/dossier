import type { Metadata } from "next";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { VerificationForm } from "@/components/forms/VerificationForm";
import type { Locale } from "@/lib/constants";
import { env } from "@/lib/env";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function pickLocale(requested: string | undefined, cookie: string | undefined): Locale {
  if (isLocale(requested)) return requested;
  if (isLocale(cookie)) return cookie;
  return env.DEFAULT_LOCALE;
}

export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string; code?: string }>;
}) {
  const sp = await searchParams;
  const store = await cookies();
  const locale = pickLocale(sp.lang, store.get(LOCALE_COOKIE)?.value);
  const messages = (await import(`../../../messages/${locale}.json`)).default;
  const t = messages.verification;
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <main
        dir={dir}
        className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-4 p-6"
      >
        <h1 className="text-xl font-semibold text-foreground">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.subtitle}</p>
        <VerificationForm initialCode={sp.code} />
      </main>
    </NextIntlClientProvider>
  );
}
