// Dossier - Verify Page
// https://github.com/red-shadows-rs/dossier

import type { Metadata } from "next";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { ShieldCheck } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { LocaleSwitch } from "@/components/layout/LocaleSwitch";
import { Logo } from "@/components/layout/Logo";
import { ThemeSwitch } from "@/components/layout/ThemeSwitch";
import { VerificationForm } from "@/components/forms/VerificationForm";
import type { Locale } from "@/lib/constants";
import { env } from "@/lib/env";
import { isLocale, LOCALE_COOKIE, resolveTheme, THEME_COOKIE } from "@/lib/i18n";

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
  const theme = resolveTheme(store.get(THEME_COOKIE)?.value);
  const messages = (await import(`../../../messages/${locale}.json`)).default;
  const t = messages.verification;
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex min-h-dvh flex-col bg-background">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border/60 bg-background/80 px-4 py-3 sm:px-8 backdrop-blur">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeSwitch current={theme} />
            <LocaleSwitch />
          </div>
        </header>

        <main
          dir={dir}
          className="flex w-full flex-1 flex-col gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:px-8"
        >
          <div className="flex flex-col items-center text-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {t.title}
            </h1>
            <p className="text-sm text-muted-foreground max-w-lg">
              {locale === "ar"
                ? "التحقق الفوري من صحة وموثوقية العقود والفواتير الرقمية الصادرة عبر المنظومة."
                : "Instantly verify the authenticity of digital contracts and invoices issued through the platform."}
            </p>
          </div>

          <VerificationForm initialCode={sp.code} />
        </main>

        <Footer bordered={false} />
      </div>
    </NextIntlClientProvider>
  );
}
