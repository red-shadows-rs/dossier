import type { Metadata } from "next";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { AlertCircle, Download } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/components/ui/cn";
import { Footer } from "@/components/layout/Footer";
import { LocaleSwitch } from "@/components/layout/LocaleSwitch";
import { Logo } from "@/components/layout/Logo";
import { ThemeSwitch } from "@/components/layout/ThemeSwitch";
import { PublicContractViewer } from "@/components/forms/PublicContractViewer";
import { SigningExperience } from "@/components/forms/SigningExperience";
import type { Locale } from "@/lib/constants";
import {
  allowedDocLangs,
  defaultDocLang,
  isDocLang,
  type DocLang,
} from "@/lib/doc-lang";
import { env } from "@/lib/env";
import { isLocale, LOCALE_COOKIE, resolveTheme, THEME_COOKIE } from "@/lib/i18n";
import { getRequestMeta } from "@/server/services/audit";
import { buildContractHtml } from "@/server/services/contract-documents";
import {
  assertSigningRateLimit,
  getSigningContext,
  type SigningContext,
} from "@/server/services/signing";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function pickLocale(
  requested: string | undefined,
  cookie: string | undefined,
  fallback: Locale,
): Locale {
  if (isLocale(requested)) return requested;
  if (isLocale(cookie)) return cookie;
  return fallback;
}

export default async function SigningPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ lang?: string; doc?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const store = await cookies();
  const meta = await getRequestMeta();
  const theme = resolveTheme(store.get(THEME_COOKIE)?.value);

  let context: SigningContext | null = null;
  try {
    assertSigningRateLimit(meta.ip);
    context = getSigningContext(token, meta);
  } catch {
    context = null;
  }

  const contractDefault: Locale =
    context?.languageMode === "en" ? "en" : "ar";
  const locale = pickLocale(
    sp.lang,
    store.get(LOCALE_COOKIE)?.value,
    context ? contractDefault : env.DEFAULT_LOCALE,
  );
  const messages = (await import(`../../../../messages/${locale}.json`))
    .default;
  const t = messages.signing;
  const dir = locale === "ar" ? "rtl" : "ltr";

  if (!context) {
    return (
      <NextIntlClientProvider locale={locale} messages={messages}>
        <div className="flex min-h-dvh flex-col bg-background">
          <header className="sticky top-0 z-10 flex items-center justify-between gap-2 sm:gap-3 border-b border-border/60 bg-background/80 px-4 py-2.5 sm:px-8 sm:py-3 backdrop-blur">
            <div className="flex items-center gap-2 sm:gap-3">
              <Logo />
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5">
              <ThemeSwitch current={theme} />
              <LocaleSwitch />
            </div>
          </header>

          <main
            dir={dir}
            className="mx-auto flex flex-1 w-full max-w-lg flex-col items-center justify-center gap-4 p-6 text-center"
          >
            <div className="rounded-full bg-destructive/10 p-3 text-destructive">
              <AlertCircle className="h-8 w-8" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {t.invalidTitle}
            </h1>
            <p className="text-sm text-muted-foreground">{t.invalidBody}</p>
          </main>

          <Footer />
        </div>
      </NextIntlClientProvider>
    );
  }

  const allowed = allowedDocLangs(context.languageMode);
  const docLang: DocLang =
    isDocLang(sp.doc) && allowed.includes(sp.doc)
      ? sp.doc
      : defaultDocLang(context.languageMode);
  const html = await buildContractHtml(context.contractId, docLang, "unsigned");
  const consentText =
    locale === "ar" ? context.consentTextAr : context.consentTextEn;
  const title =
    locale === "ar"
      ? context.titleAr ?? context.titleEn
      : context.titleEn ?? context.titleAr;

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex min-h-dvh flex-col bg-background">
        {/* Navigation Header */}
        <header className="sticky top-0 z-10 flex items-center justify-between gap-2 sm:gap-3 border-b border-border/60 bg-background/80 px-4 py-2.5 sm:px-8 sm:py-3 backdrop-blur">
          <div className="flex items-center gap-2 sm:gap-3">
            <Logo />
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <ThemeSwitch current={theme} />
            <LocaleSwitch />
          </div>
        </header>

        {/* Main Content Area */}
        <main
          dir={dir}
          className="flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8"
        >
          {/* Document Header Card */}
          <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex flex-col gap-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                    {title}
                  </h1>
                  {context.number ? (
                    <span
                      dir="ltr"
                      className="inline-flex items-center rounded-md border border-border/80 bg-muted/60 px-2.5 py-0.5 text-xs font-semibold font-mono text-muted-foreground"
                    >
                      {context.number}
                    </span>
                  ) : null}
                  <Badge tone="amber">
                    {locale === "ar" ? "بانتظار التوقيع" : "Pending Signature"}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {locale === "ar"
                    ? "يرجى مراجعة تفاصيل العقد والبنود الموضحة أدناه واعتماد التوقيع إلكترونياً."
                    : "Please review the contract terms below and complete electronic signing."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                {allowed.length > 1 ? (
                  <div
                    role="tablist"
                    className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-muted/40 p-1"
                  >
                    {allowed.map((value) => (
                      <a
                        key={value}
                        href={`/s/${token}?lang=${locale}&doc=${value}`}
                        aria-current={value === docLang ? "true" : undefined}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition-all no-underline cursor-pointer",
                          value === docLang
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/60",
                        )}
                      >
                        {t.language[value]}
                      </a>
                    ))}
                  </div>
                ) : null}

                <a
                  href={`/s/${token}/pdf?lang=${docLang}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="gap-1.5"
                  >
                    <Download className="h-4 w-4" />
                    <span>{t.downloadPdf}</span>
                  </Button>
                </a>
              </div>
            </div>
          </div>

          {/* Continuous Document Viewer */}
          <PublicContractViewer html={html} title={t.documentTitle} />

          {/* Signing Experience Box */}
          <div className="rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs">
            <SigningExperience
              token={token}
              signatoryName={context.signatoryName}
              requiresOtp={context.requiresOtp}
              otpVerified={context.otpVerified}
              consentText={consentText}
            />
          </div>
        </main>

        {/* Site Footer */}
        <Footer />
      </div>
    </NextIntlClientProvider>
  );
}
