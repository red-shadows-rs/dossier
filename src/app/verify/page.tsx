import type { Metadata } from "next";
import Image from "next/image";
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
        {/* Navigation Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between gap-2 sm:gap-3 border-b border-border/60 bg-background/80 px-3 py-2.5 sm:px-8 sm:py-3 backdrop-blur">
          <div className="flex items-center gap-2 sm:gap-3">
            <Logo />
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-1.5 sm:gap-2 border-s border-border/60 ps-2.5 sm:ps-4">
              <Image
                src="/red-shadows-logo.png"
                alt="RED SHADOWS"
                width={24}
                height={24}
                className="h-5 sm:h-6 w-auto shrink-0"
              />
              <span className="text-xs sm:text-sm font-bold tracking-tight text-foreground font-mono whitespace-nowrap" dir="ltr">
                RED SHADOWS
              </span>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 border-s border-border/60 ps-2 sm:ps-3">
              <ThemeSwitch current={theme} />
              <LocaleSwitch />
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main dir={dir} className="flex-1 px-4 py-8 sm:px-6 sm:py-12">
          <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
            {/* Hero Header */}
            <div className="flex flex-col items-center text-center gap-2.5">
              <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 text-primary ring-4 ring-primary/5">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {t.title}
              </h1>
              <p className="text-sm text-muted-foreground max-w-md">
                {locale === "ar"
                  ? "التحقق من صحة وموثوقية العقود والفواتير الصادرة."
                  : "Verify the authenticity of issued invoices and contracts."}
              </p>
            </div>

            <VerificationForm initialCode={sp.code} />
          </div>
        </main>

        <Footer bordered={false} />
      </div>
    </NextIntlClientProvider>
  );
}

