import type { Metadata } from "next";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { SigningExperience } from "@/components/forms/SigningExperience";
import type { Locale } from "@/lib/constants";
import {
  allowedDocLangs,
  defaultDocLang,
  isDocLang,
  type DocLang,
} from "@/lib/doc-lang";
import { env } from "@/lib/env";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n";
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
      <main
        dir={dir}
        className="mx-auto flex min-h-dvh max-w-lg flex-col items-center justify-center gap-3 p-6 text-center"
      >
        <h1 className="text-xl font-semibold text-foreground">
          {t.invalidTitle}
        </h1>
        <p className="text-sm text-muted-foreground">{t.invalidBody}</p>
      </main>
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
      <main
        dir={dir}
        className="mx-auto flex min-h-dvh w-full max-w-3xl flex-col gap-5 p-4 sm:p-6"
      >
        <header className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-foreground">{title}</h1>
          {context.number ? (
            <p className="text-sm text-muted-foreground" dir="ltr">
              {context.number}
            </p>
          ) : null}
        </header>

        {allowed.length > 1 ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {t.documentLanguage}
            </span>
            {allowed.map((value) => (
              <a
                key={value}
                href={`/s/${token}?lang=${locale}&doc=${value}`}
                aria-current={value === docLang ? "true" : undefined}
                className={
                  value === docLang
                    ? "rounded-md border border-primary bg-primary px-3 py-1 text-sm text-primary-foreground"
                    : "rounded-md border border-border px-3 py-1 text-sm text-muted-foreground"
                }
              >
                {t.language[value]}
              </a>
            ))}
          </div>
        ) : null}

        <iframe
          title={t.documentTitle}
          sandbox=""
          srcDoc={html}
          className="h-[40rem] w-full rounded-md border border-border bg-white"
        />

        <a
          href={`/s/${token}/pdf?lang=${docLang}`}
          target="_blank"
          rel="noreferrer"
          className="self-start text-sm text-primary underline"
        >
          {t.downloadPdf}
        </a>

        <SigningExperience
          token={token}
          signatoryName={context.signatoryName}
          requiresOtp={context.requiresOtp}
          otpVerified={context.otpVerified}
          consentText={consentText}
        />
      </main>
    </NextIntlClientProvider>
  );
}
