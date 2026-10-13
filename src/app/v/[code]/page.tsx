import type { Metadata } from "next";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import type { Locale } from "@/lib/constants";
import { formatInstant } from "@/lib/dates";
import { env } from "@/lib/env";
import { isLocale, LOCALE_COOKIE } from "@/lib/i18n";
import { getRequestMeta } from "@/server/services/audit";
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
  const messages = (await import(`../../../../messages/${locale}.json`))
    .default;
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

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <main
        dir={dir}
        className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-4 p-6"
      >
        <h1 className="text-xl font-semibold text-foreground">
          {t.title}
        </h1>
        <p className="font-mono text-sm text-muted-foreground" dir="ltr">
          {code}
        </p>

        {limited ? (
          <Notice tone="error" text={t.rateLimited} />
        ) : result === null ? (
          <Notice tone="error" text={t.notFound} />
        ) : result.kind === "contract" ? (
          <ContractCard result={result} locale={locale} t={t} />
        ) : (
          <InvoiceCard result={result} t={t} />
        )}
      </main>
    </NextIntlClientProvider>
  );
}

function Notice({ tone, text }: { tone: "error" | "success"; text: string }) {
  return (
    <div
      role="status"
      className={
        tone === "success"
          ? "rounded-md border border-border bg-surface p-4 text-sm text-foreground"
          : "rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-foreground"
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
  contract: Record<string, string>;
  invoice: Record<string, string>;
  states: Record<string, string>;
  fields: Record<string, string>;
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground" dir="ltr">
        {value}
      </dd>
    </div>
  );
}

function ContractCard({
  result,
  locale,
  t,
}: {
  result: Extract<VerificationResult, { kind: "contract" }>;
  locale: Locale;
  t: Messages;
}) {
  const title =
    locale === "ar"
      ? result.titleAr ?? result.titleEn
      : result.titleEn ?? result.titleAr;
  return (
    <div className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">
          {t.contract.heading}
        </h2>
        <StateBadge
          label={t.states[result.state] ?? result.state}
          valid={result.state === "valid"}
        />
      </div>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Row label={t.fields.number} value={result.number ?? "-"} />
        <Row label={t.fields.title} value={title ?? "-"} />
        <Row label={t.fields.provider} value={result.providerName ?? "-"} />
        <Row label={t.fields.client} value={result.clientName ?? "-"} />
        <Row
          label={t.fields.signedAt}
          value={result.signedAt ? formatInstant(result.signedAt, "UTC", locale) : "-"}
        />
        <Row label={t.fields.contentHash} value={result.contentHash ?? "-"} />
      </dl>
    </div>
  );
}

function InvoiceCard({
  result,
  t,
}: {
  result: Extract<VerificationResult, { kind: "invoice" }>;
  t: Messages;
}) {
  return (
    <div className="flex flex-col gap-4 rounded-md border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-foreground">
          {t.invoice.heading}
        </h2>
        <StateBadge
          label={t.states[result.state] ?? result.state}
          valid={result.state === "valid"}
        />
      </div>
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Row label={t.fields.number} value={result.number ?? "-"} />
        <Row label={t.fields.issuer} value={result.issuerName ?? "-"} />
        <Row label={t.fields.issueDate} value={result.issueDate ?? "-"} />
        <Row label={t.fields.total} value={result.totalFormatted} />
      </dl>
    </div>
  );
}

function StateBadge({ label, valid }: { label: string; valid: boolean }) {
  return <Badge tone={valid ? "green" : "red"}>{label}</Badge>;
}
