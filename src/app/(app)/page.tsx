import Link from "next/link";
import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import type { CurrencyCode, Locale } from "@/lib/constants";
import { formatInstant, nowMs } from "@/lib/dates";
import { isLocale } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { workerHeartbeatSchema } from "@/lib/validation/settings";
import { requireUserPage } from "@/server/auth/require-user";
import { getDashboard, type CurrencyAmount } from "@/server/services/dashboard";
import { getInternalSetting, getSettings } from "@/server/services/settings";

const HEARTBEAT_STALE_MS = 5 * 60 * 1000;

function AmountList({
  amounts,
  locale,
}: {
  amounts: CurrencyAmount[];
  locale: Locale;
}) {
  if (amounts.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span dir="ltr" className="tabular-nums">
      {amounts
        .map((entry) =>
          formatMoney(entry.amountMinor, entry.currency as CurrencyCode, locale),
        )
        .join(" · ")}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-lg font-semibold text-foreground">{value}</span>
      </CardContent>
    </Card>
  );
}

function ClientName({
  nameAr,
  nameEn,
}: {
  nameAr: string | null;
  nameEn: string | null;
}) {
  return (
    <span className="flex flex-col">
      <span dir="rtl" lang="ar">
        {nameAr ?? nameEn ?? "—"}
      </span>
      {nameEn && nameAr ? (
        <span dir="ltr" lang="en" className="text-xs text-muted-foreground">
          {nameEn}
        </span>
      ) : null}
    </span>
  );
}

export default async function DashboardPage() {
  const user = await requireUserPage();
  const t = await getTranslations("dashboard");
  const tc = await getTranslations("common");
  const rawLocale = await getLocale();
  const locale: Locale = isLocale(rawLocale) ? rawLocale : user.locale;

  const timezone = getSettings("defaults").timezone;
  const data = getDashboard();

  const heartbeat = getInternalSetting(
    "worker_heartbeat",
    workerHeartbeatSchema,
  );
  const workerStale =
    user.role === "owner" &&
    (heartbeat === null || nowMs() - heartbeat.ts > HEARTBEAT_STALE_MS);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>

      {workerStale ? (
        <Card className="border-destructive/40">
          <CardContent className="flex flex-col gap-1">
            <Badge tone="red">{t("workerStaleTitle")}</Badge>
            <p className="text-sm text-muted-foreground">
              {t("workerStaleHint")}
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat
          label={t("awaitingSignature")}
          value={
            <span dir="ltr" className="tabular-nums">
              {data.awaitingSignature.count}
            </span>
          }
        />
        <Stat
          label={t("signedLast30Days")}
          value={
            <span dir="ltr" className="tabular-nums">
              {data.signedLast30Days}
            </span>
          }
        />
        <Stat
          label={t("drafts")}
          value={
            <span dir="ltr" className="tabular-nums">
              {data.draftContracts} / {data.draftInvoices}
            </span>
          }
        />
        <Stat
          label={t("outstanding")}
          value={<AmountList amounts={data.outstanding} locale={locale} />}
        />
        <Stat
          label={t("overdue")}
          value={
            <span className="flex flex-col gap-0.5">
              <span className="tabular-nums" dir="ltr">
                {data.overdue.count}
              </span>
              <AmountList amounts={data.overdue.amounts} locale={locale} />
            </span>
          }
        />
        <Stat
          label={t("revenue")}
          value={
            <span className="flex flex-col gap-0.5">
              <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                {t("currentMonth")}
                <AmountList
                  amounts={data.revenue.currentMonth}
                  locale={locale}
                />
              </span>
              <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                {t("previousMonth")}
                <AmountList
                  amounts={data.revenue.previousMonth}
                  locale={locale}
                />
              </span>
            </span>
          }
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("awaitingTitle")}</CardTitle>
          <span className="text-sm text-muted-foreground" dir="ltr">
            {data.awaitingSignature.count}
          </span>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{t("number")}</TableHeaderCell>
                <TableHeaderCell>{t("client")}</TableHeaderCell>
                <TableHeaderCell className="text-end">
                  {t("daysWaiting")}
                </TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.awaitingSignature.rows.length === 0 ? (
                <TableEmpty colSpan={3}>{t("awaitingEmpty")}</TableEmpty>
              ) : (
                data.awaitingSignature.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link
                        href={`/contracts/${row.id}`}
                        className="font-medium text-foreground hover:text-primary"
                        dir="ltr"
                      >
                        {row.number ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <ClientName
                        nameAr={row.clientNameAr}
                        nameEn={row.clientNameEn}
                      />
                    </TableCell>
                    <TableCell className="text-end" dir="ltr">
                      {t("days", { count: row.daysWaiting })}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("dueSoonTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{t("number")}</TableHeaderCell>
                <TableHeaderCell>{t("client")}</TableHeaderCell>
                <TableHeaderCell>{t("dueDate")}</TableHeaderCell>
                <TableHeaderCell className="text-end">
                  {t("outstanding")}
                </TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.dueSoon.length === 0 ? (
                <TableEmpty colSpan={4}>{t("dueSoonEmpty")}</TableEmpty>
              ) : (
                data.dueSoon.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link
                        href={`/invoices/${row.id}`}
                        className="font-medium text-foreground hover:text-primary"
                        dir="ltr"
                      >
                        {row.number ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <ClientName
                        nameAr={row.clientNameAr}
                        nameEn={row.clientNameEn}
                      />
                    </TableCell>
                    <TableCell dir="ltr">{row.dueDate}</TableCell>
                    <TableCell className="text-end">
                      <span dir="ltr" className="tabular-nums">
                        {formatMoney(
                          row.outstandingMinor,
                          row.currency as CurrencyCode,
                          locale,
                        )}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("endingSoonTitle")}</CardTitle>
          <span className="text-sm text-muted-foreground" dir="ltr">
            {data.endingSoon.count}
          </span>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{t("number")}</TableHeaderCell>
                <TableHeaderCell>{t("client")}</TableHeaderCell>
                <TableHeaderCell>{t("endDate")}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.endingSoon.rows.length === 0 ? (
                <TableEmpty colSpan={3}>{t("endingSoonEmpty")}</TableEmpty>
              ) : (
                data.endingSoon.rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link
                        href={`/contracts/${row.id}`}
                        className="font-medium text-foreground hover:text-primary"
                        dir="ltr"
                      >
                        {row.number ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <ClientName
                        nameAr={row.clientNameAr}
                        nameEn={row.clientNameEn}
                      />
                    </TableCell>
                    <TableCell dir="ltr">{row.endDate}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("activityTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{t("when")}</TableHeaderCell>
                <TableHeaderCell>{t("action")}</TableHeaderCell>
                <TableHeaderCell>{t("entity")}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.recentActivity.length === 0 ? (
                <TableEmpty colSpan={3}>{t("activityEmpty")}</TableEmpty>
              ) : (
                data.recentActivity.map((row) => {
                  const href =
                    row.entityType === "contract"
                      ? `/contracts/${row.entityId}`
                      : row.entityType === "invoice"
                        ? `/invoices/${row.entityId}`
                        : null;
                  return (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatInstant(row.ts, timezone, locale)}
                      </TableCell>
                      <TableCell dir="ltr" className="text-start">
                        {row.action}
                      </TableCell>
                      <TableCell>
                        {href ? (
                          <Link
                            href={href}
                            className="text-foreground hover:text-primary"
                          >
                            <span dir="ltr">{row.entityType}</span>
                          </Link>
                        ) : (
                          <span dir="ltr">{row.entityType}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">{tc("tagline")}</p>
    </div>
  );
}
