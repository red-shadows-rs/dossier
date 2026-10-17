import type { Metadata } from "next";
import Image from "next/image";
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
  FileX,
  Fingerprint,
  Receipt,
  ShieldCheck,
  User,
  XCircle,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
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

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="flex min-h-dvh flex-col bg-background">
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

        <main dir={dir} className="flex-1 px-4 py-8 sm:px-6 sm:py-12">
          <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
            <div className="flex flex-col items-center text-center gap-2.5">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-lg ring-4 ${
                  limited
                    ? "bg-amber-500/10 text-amber-600 ring-amber-500/5 dark:bg-amber-500/20 dark:text-amber-400"
                    : result === null
                      ? "bg-destructive/10 text-destructive ring-destructive/5"
                      : isValid
                        ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/5 dark:bg-emerald-500/20 dark:text-emerald-400"
                        : "bg-destructive/10 text-destructive ring-destructive/5"
                }`}
              >
                {limited ? (
                  <AlertOctagon className="h-7 w-7" />
                ) : result === null ? (
                  <FileX className="h-7 w-7" />
                ) : isValid ? (
                  <ShieldCheck className="h-7 w-7" />
                ) : (
                  <XCircle className="h-7 w-7" />
                )}
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                {limited
                  ? t.rateLimited
                  : result === null
                    ? t.notFound
                    : isValid
                      ? t.found
                      : t.states[result.state] ?? t.title}
              </h1>

              <p className="text-sm text-muted-foreground max-w-md">
                {limited
                  ? t.rateLimited
                  : result === null
                    ? locale === "ar"
                      ? "لم يتم العثور على مستند مطابق لرمز التحقق."
                      : "No document matching this verification code was found in the system."
                    : isValid
                      ? locale === "ar"
                        ? "تم التحقق من صحة المستند ومطابقته لسجلات النظام."
                        : "This document has been verified against official system records."
                      : locale === "ar"
                        ? "هذا المستند غير سارٍ حالياً في سجلات النظام."
                        : "This document is no longer active in system records."}
              </p>

              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {t.codeLabel}:
                </span>
                <span
                  className="rounded-lg border border-border bg-muted/60 px-3 py-1 font-mono text-xs font-bold tracking-wider text-foreground select-all"
                  dir="ltr"
                >
                  {code}
                </span>
              </div>
            </div>

            {limited ? (
              <Notice tone="error" text={t.rateLimited} />
            ) : result === null ? (
              <div className="flex flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border bg-card/60 p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  {t.notFound}
                </p>
                <Link
                  href="/verify"
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-xs font-medium text-foreground hover:bg-muted/80 no-underline transition-colors"
                >
                  <FileSearch className="h-3.5 w-3.5" />
                  <span>{locale === "ar" ? "البحث برمز آخر" : "Try another code"}</span>
                </Link>
              </div>
            ) : result.kind === "contract" ? (
              <ContractCard result={result} code={code} locale={locale} t={t} />
            ) : (
              <InvoiceCard result={result} code={code} locale={locale} t={t} />
            )}

            {result !== null ? (
              <VerificationPdfChecker code={code} />
            ) : null}

            <div className="flex items-center justify-center pt-2">
              <Link
                href="/verify"
                className="inline-flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground no-underline transition-colors"
              >
                <FileSearch className="h-3.5 w-3.5" />
                <span>
                  {locale === "ar"
                    ? "التحقق من مستند آخر يدويًا"
                    : "Verify another document manually"}
                </span>
              </Link>
            </div>
          </div>
        </main>

        <Footer bordered={false} />
      </div>
    </NextIntlClientProvider>
  );
}

function Notice({ tone, text }: { tone: "error" | "success"; text: string }) {
  return (
    <div
      role="status"
      className={
        tone === "success"
          ? "rounded-md border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm font-medium text-emerald-700 dark:text-emerald-300"
          : "rounded-md border border-destructive/30 bg-destructive/10 p-4 text-sm font-medium text-destructive"
      }
    >
      {text}
    </div>
  );
}

type Messages = {
  title: string;
  notFound: string;
  rateLimited: string;
  found: string;
  codeLabel: string;
  contract: Record<string, string>;
  invoice: Record<string, string>;
  states: Record<string, string>;
  fields: Record<string, string>;
};

function DetailItem({
  icon,
  label,
  value,
  dir,
  mono = false,
}: {
  icon?: React.ReactNode;
  label: string;
  value: React.ReactNode;
  dir?: "ltr" | "rtl";
  mono?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-md border border-border/50 bg-muted/20 p-3 sm:p-3.5">
      <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon ? <span className="text-muted-foreground/70">{icon}</span> : null}
        <span>{label}</span>
      </dt>
      <dd
        className={`text-sm font-semibold text-foreground ${mono ? "font-mono select-all" : ""}`}
        dir={dir}
      >
        {value}
      </dd>
    </div>
  );
}

function ContractCard({
  result,
  code,
  locale,
  t,
}: {
  result: Extract<VerificationResult, { kind: "contract" }>;
  code: string;
  locale: Locale;
  t: Messages;
}) {
  const title =
    locale === "ar"
      ? result.titleAr ?? result.titleEn
      : result.titleEn ?? result.titleAr;
  const isValid = result.state === "valid";

  return (
    <div className="relative overflow-hidden flex flex-col gap-5 rounded-lg border border-border bg-card p-5 sm:p-7 shadow-sm">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary/80 via-primary to-rose-400" />

      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">
              {t.contract.heading}
            </div>
            <div className="font-mono text-base font-bold text-foreground" dir="ltr">
              {result.number ?? "-"}
            </div>
          </div>
        </div>
        <StateBadge
          label={t.states[result.state] ?? result.state}
          valid={isValid}
        />
      </div>

      {isValid && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{locale === "ar" ? "مستند معتمد ومطابق لسجلات النظام" : "Verified Official Record"}</span>
        </div>
      )}

      <div className="flex flex-col items-center justify-center gap-1.5 rounded-md border border-border/70 bg-muted/20 py-3.5 px-4 text-center">
        <div
          className="max-w-[280px] overflow-hidden"
          dangerouslySetInnerHTML={{ __html: renderCode39Svg(code, 28) }}
        />
        <div className="flex items-center gap-2 mt-1">
          <span className="font-mono text-xs font-bold tracking-widest text-muted-foreground select-all" dir="ltr">
            {code}
          </span>
        </div>
      </div>

      <div className="rounded-md border border-border/70 bg-muted/30 p-4">
        <div className="text-xs font-medium text-muted-foreground">{t.fields.title}</div>
        <div className="mt-0.5 text-base font-semibold text-foreground">{title ?? "-"}</div>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DetailItem
          icon={<Building2 className="h-4 w-4" />}
          label={t.fields.provider}
          value={result.providerName ?? "-"}
        />
        <DetailItem
          icon={<User className="h-4 w-4" />}
          label={t.fields.client}
          value={result.clientName ?? "-"}
        />
        <DetailItem
          icon={<Clock className="h-4 w-4" />}
          label={t.fields.signedAt}
          value={result.signedAt ? formatInstant(result.signedAt, "UTC", locale) : "-"}
          dir="ltr"
        />
      </dl>

      <div className="flex flex-col gap-1.5 rounded-md border border-border/70 bg-muted/40 p-3.5">
        <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Fingerprint className="h-3.5 w-3.5 text-primary" />
          <span>{t.fields.contentHash}</span>
        </div>
        <code className="break-all font-mono text-[11px] leading-relaxed text-foreground select-all" dir="ltr">
          {result.contentHash ?? "-"}
        </code>
      </div>
    </div>
  );
}

function InvoiceCard({
  result,
  code,
  locale,
  t,
}: {
  result: Extract<VerificationResult, { kind: "invoice" }>;
  code: string;
  locale: Locale;
  t: Messages;
}) {
  const isValid = result.state === "valid";

  return (
    <div className="relative overflow-hidden flex flex-col gap-5 rounded-lg border border-border bg-card p-5 sm:p-7 shadow-sm">
      <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary/80 via-primary to-rose-400" />

      <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-medium text-muted-foreground">
              {t.invoice.heading}
            </div>
            <div className="font-mono text-base font-bold text-foreground" dir="ltr">
              {result.number ?? "-"}
            </div>
          </div>
        </div>
        <StateBadge
          label={t.states[result.state] ?? result.state}
          valid={isValid}
        />
      </div>

      {isValid && (
        <div className="flex items-center gap-2 rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{locale === "ar" ? "فاتورة معتمدة ومطابقة لسجلات النظام" : "Verified Official Invoice"}</span>
        </div>
      )}

      <div className="flex flex-col items-center justify-center gap-1.5 rounded-md border border-border/70 bg-muted/20 py-3.5 px-4 text-center">
        <div
          className="max-w-[280px] overflow-hidden"
          dangerouslySetInnerHTML={{ __html: renderCode39Svg(code, 28) }}
        />
        <div className="flex items-center gap-2 mt-1">
          <span className="font-mono text-xs font-bold tracking-widest text-muted-foreground select-all" dir="ltr">
            {code}
          </span>
        </div>
      </div>

      <div className="rounded-md border border-primary/20 bg-primary/5 p-4 sm:p-5">
        <div className="text-xs font-semibold uppercase tracking-wider text-primary">
          {t.fields.total}
        </div>
        <div className="mt-1 font-mono text-2xl font-extrabold text-foreground sm:text-3xl" dir="ltr">
          {result.totalFormatted}
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <DetailItem
          icon={<Building2 className="h-4 w-4" />}
          label={t.fields.issuer}
          value={result.issuerName ?? "-"}
        />
        <DetailItem
          icon={<Calendar className="h-4 w-4" />}
          label={t.fields.issueDate}
          value={result.issueDate ?? "-"}
          dir="ltr"
        />
      </dl>
    </div>
  );
}

function StateBadge({ label, valid }: { label: string; valid: boolean }) {
  return (
    <Badge
      tone={valid ? "green" : "red"}
      className="gap-1.5 px-3 py-1 text-xs font-semibold"
    >
      {valid ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <XCircle className="h-3.5 w-3.5" />
      )}
      <span>{label}</span>
    </Badge>
  );
}
