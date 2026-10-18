import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import {
  AlertOctagon,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  FileSearch,
  FileText,
  Fingerprint,
  Receipt,
  ShieldCheck,
  User,
  Wallet,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Footer } from "@/components/layout/Footer";
import { LocaleSwitch } from "@/components/layout/LocaleSwitch";
import { Logo } from "@/components/layout/Logo";
import { ThemeSwitch } from "@/components/layout/ThemeSwitch";
import { VerificationPdfChecker } from "@/components/forms/VerificationPdfChecker";
import type { Locale } from "@/lib/constants";
import { formatInstant } from "@/lib/dates";
import { env } from "@/lib/env";
import { isLocale, LOCALE_COOKIE, resolveTheme, THEME_COOKIE } from "@/lib/i18n";
import { getRequestMeta } from "@/server/services/audit";
import { renderCode39Svg } from "@/server/pdf/qr";
import {
  assertLookupRateLimit,
  lookupVerification,
  type VerificationResult,
} from "@/server/services/verification";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

function pickLocale(requested: string | undefined, cookie: string | undefined): Locale {
  if (isLocale(requested)) return requested;
  if (isLocale(cookie)) return cookie;
  return env.DEFAULT_LOCALE;
}

export default async function VerifyCodePage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { code } = await params;
  const sp = await searchParams;
  const store = await cookies();
  const locale = pickLocale(sp.lang, store.get(LOCALE_COOKIE)?.value);
  const theme = resolveTheme(store.get(THEME_COOKIE)?.value);
  const messages = (await import(`../../../../messages/${locale}.json`)).default;
  const t = messages.verification;
  const dir = locale === "ar" ? "rtl" : "ltr";

  let result: VerificationResult | null = null;
  let limited = false;
  try {
    const meta = await getRequestMeta();
    assertLookupRateLimit(meta.ip);
    result = lookupVerification(code, locale);
  } catch {
    limited = true;
  }

  const isValid = result !== null && result.state === "valid";
  const title =
    result?.kind === "contract"
      ? (locale === "ar"
          ? result.titleAr ?? result.titleEn
          : result.titleEn ?? result.titleAr)
      : null;

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
          className="flex w-full flex-1 flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8"
        >
          {/* Breadcrumb Navigation */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
          >
            <Link
              href="/verify"
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ShieldCheck className="h-3.5 w-3.5 text-primary" />
              <span>{locale === "ar" ? "بوابة التحقق الرقمي" : "Verification Portal"}</span>
            </Link>
            <span className="text-border">/</span>
            <span className="text-foreground font-mono font-medium" dir="ltr">
              {code}
            </span>
          </nav>

          {limited ? (
            <Card className="rounded-xl border border-border bg-card p-6 shadow-xs">
              <EmptyState
                icon={<AlertOctagon className="h-10 w-10 text-amber-500" />}
                title={t.rateLimited}
                description={
                  locale === "ar"
                    ? "تم تجاوز الحد المسموح من الاستعلامات مؤقتاً، يُرجى الانتظار دقيقة والمحاولة مجدداً."
                    : "Too many verification requests. Please wait a minute and try again."
                }
                action={
                  <Link href="/verify">
                    <Button variant="secondary" className="gap-2 text-xs font-medium">
                      <span>{locale === "ar" ? "العودة للبحث" : "Return to Search"}</span>
                    </Button>
                  </Link>
                }
              />
            </Card>
          ) : result === null ? (
            <Card className="rounded-xl border border-border bg-card p-6 shadow-xs">
              <EmptyState
                icon={<FileSearch className="h-10 w-10 text-muted-foreground" />}
                title={t.notFound}
                description={
                  locale === "ar"
                    ? "لم يتم العثور على أي مستند مطابق لرمز التحقق المدخل في سجلات المنظومة الرسمية."
                    : "No document matching this verification code was found in official records."
                }
                action={
                  <Link href="/verify">
                    <Button variant="secondary" className="gap-2 text-xs font-medium">
                      <FileSearch className="h-3.5 w-3.5" />
                      <span>{locale === "ar" ? "البحث برمز آخر" : "Try another code"}</span>
                    </Button>
                  </Link>
                }
              />
            </Card>
          ) : (
            <>
              {/* Document Header Banner */}
              <div className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:p-6 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                      {result.kind === "contract" ? (
                        <FileText className="h-6 w-6" />
                      ) : (
                        <Receipt className="h-6 w-6" />
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2.5">
                        <h1
                          className="text-xl sm:text-2xl font-bold tracking-tight text-foreground font-mono"
                          dir="ltr"
                        >
                          {result.number ?? code}
                        </h1>
                        <Badge tone={isValid ? "green" : "red"}>
                          {t.states[result.state] ??
                            (isValid
                              ? locale === "ar"
                                ? "معتمد وموثق"
                                : "Verified"
                              : result.state)}
                        </Badge>
                        {title && title !== "-" ? (
                          <span className="text-sm font-medium text-muted-foreground">
                            · <span>{title}</span>
                          </span>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                          <span>
                            {isValid
                              ? locale === "ar"
                                ? "مستند رسمي معتمد وموثق إلكترونياً ومطابق لسجلات منصة Dossier"
                                : "Official document verified electronically in Dossier records"
                              : locale === "ar"
                                ? "المستند غير سارٍ في سجلات المنظومة"
                                : "Document not active in system records"}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Link href="/verify">
                      <Button variant="secondary" className="gap-1.5 text-xs font-medium shadow-xs">
                        <FileSearch className="h-3.5 w-3.5" />
                        <span>{locale === "ar" ? "فحص مستند آخر" : "Verify Another"}</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* KPI Summary Cards */}
              {result.kind === "contract" ? (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4 shadow-xs">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                      <span>{locale === "ar" ? "الحالة النظامية" : "Legal Status"}</span>
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    </div>
                    <span className="text-base font-bold text-foreground">
                      {isValid
                        ? locale === "ar"
                          ? "سارية ومعتمدة"
                          : "Active & Verified"
                        : locale === "ar"
                          ? "منتهية"
                          : "Terminated"}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4 shadow-xs">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                      <span>{t.fields.provider}</span>
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <span
                      className="text-base font-bold text-foreground truncate"
                      title={result.providerName ?? "-"}
                    >
                      {result.providerName ?? "-"}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4 shadow-xs">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                      <span>{t.fields.client}</span>
                      <User className="h-4 w-4 text-sky-500" />
                    </div>
                    <span
                      className="text-base font-bold text-foreground truncate"
                      title={result.clientName ?? "-"}
                    >
                      {result.clientName ?? "-"}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4 shadow-xs">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                      <span>{t.fields.signedAt}</span>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span
                      className="text-sm font-semibold font-mono text-foreground"
                      dir="ltr"
                    >
                      {result.signedAt ? formatInstant(result.signedAt, "UTC", locale) : "-"}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4 shadow-xs">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                      <span>{locale === "ar" ? "حالة الفاتورة" : "Invoice Status"}</span>
                      <ShieldCheck className="h-4 w-4 text-emerald-500" />
                    </div>
                    <span className="text-base font-bold text-foreground">
                      {isValid
                        ? locale === "ar"
                          ? "صادرة ومعتمدة"
                          : "Issued & Valid"
                        : locale === "ar"
                          ? "ملغاة"
                          : "Void"}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4 shadow-xs">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                      <span>{t.fields.issuer}</span>
                      <Building2 className="h-4 w-4 text-primary" />
                    </div>
                    <span
                      className="text-base font-bold text-foreground truncate"
                      title={result.issuerName ?? "-"}
                    >
                      {result.issuerName ?? "-"}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4 shadow-xs">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                      <span>{t.fields.issueDate}</span>
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span
                      className="text-sm font-semibold font-mono text-foreground"
                      dir="ltr"
                    >
                      {result.issueDate ?? "-"}
                    </span>
                  </div>

                  <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-4 shadow-xs">
                    <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                      <span>{t.fields.total}</span>
                      <Wallet className="h-4 w-4 text-emerald-500" />
                    </div>
                    <span
                      className="text-base font-bold font-mono text-foreground"
                      dir="ltr"
                    >
                      {result.totalFormatted}
                    </span>
                  </div>
                </div>
              )}

              {/* Cryptographic Proof & Barcode Card */}
              <Card className="rounded-xl border border-border bg-card shadow-xs">
                <CardHeader className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Fingerprint className="h-4 w-4 text-primary" />
                    <CardTitle className="text-sm font-semibold text-foreground">
                      {locale === "ar" ? "بيانات التوثيق الرقمي والباركود" : "Digital Verification & Security Seal"}
                    </CardTitle>
                  </div>
                  <Badge tone="teal">
                    {locale === "ar" ? "شهادة توثيق رقمية" : "Cryptographic Proof"}
                  </Badge>
                </CardHeader>
                <CardContent className="p-5 sm:p-6 flex flex-col gap-6">
                  {/* Barcode Frame */}
                  <div className="flex flex-col items-center justify-center gap-2.5 rounded-xl border border-border/60 bg-muted/20 dark:bg-card/70 py-5 px-4 text-center">
                    <div
                      className="max-w-[360px] overflow-hidden text-foreground dark:text-zinc-100 [&_rect]:fill-current"
                      dangerouslySetInnerHTML={{ __html: renderCode39Svg(code, 36, "currentColor") }}
                    />
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="font-mono text-sm font-bold tracking-widest text-foreground select-all"
                        dir="ltr"
                      >
                        {code}
                      </span>
                    </div>
                    <span className="text-[11px] text-muted-foreground">
                      {locale === "ar"
                        ? "تم إنشاء التوثيق والباركود عبر منصة Dossier"
                        : "Verified via Dossier Platform"}
                    </span>
                  </div>

                  {/* Technical Attributes Grid */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-muted/15 p-3.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        {t.codeLabel}
                      </span>
                      <span
                        className="font-mono text-sm font-bold tracking-wider text-foreground select-all"
                        dir="ltr"
                      >
                        {code}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-muted/15 p-3.5">
                      <span className="text-xs font-medium text-muted-foreground">
                        {locale === "ar" ? "رابط التحقق المعتمد" : "Permanent Verification URL"}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className="font-mono text-xs font-semibold text-foreground truncate select-all"
                          dir="ltr"
                        >
                          {`${env.APP_URL}/v/${code}`}
                        </span>
                      </div>
                    </div>

                    {result.kind === "contract" && result.contentHash ? (
                      <div className="flex flex-col gap-1.5 rounded-lg border border-border/60 bg-muted/15 p-3.5 sm:col-span-2">
                        <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                          <span className="flex items-center gap-1.5">
                            <Fingerprint className="h-3.5 w-3.5 text-primary" />
                            <span>{t.fields.contentHash}</span>
                          </span>
                          <span className="text-[10px] text-muted-foreground/80 font-mono">
                            SHA-256
                          </span>
                        </div>
                        <code
                          className="break-all font-mono text-xs leading-relaxed text-foreground select-all bg-background/50 p-2.5 rounded border border-border/40"
                          dir="ltr"
                        >
                          {result.contentHash}
                        </code>
                      </div>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              {/* PDF Authenticity Checker */}
              <VerificationPdfChecker code={code} />
            </>
          )}
        </main>

        <Footer bordered={false} />
      </div>
    </NextIntlClientProvider>
  );
}
