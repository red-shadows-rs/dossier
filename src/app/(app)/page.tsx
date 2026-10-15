import Link from "next/link";
import type { ReactNode } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BarChart3,
  BellRing,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  FileCheck2,
  FileSignature,
  FileText,
  FolderKanban,
  Gauge,
  History,
  Layers,
  Receipt,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { MonthlyChart, StatusDonut } from "@/components/dashboard/InteractiveCharts";
import { cn } from "@/components/ui/cn";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import type { CurrencyCode, Locale } from "@/lib/constants";
import { CONTRACT_STATUSES, INVOICE_STATUSES } from "@/lib/constants";
import { formatInstant, nowMs } from "@/lib/dates";
import { isLocale } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { workerHeartbeatSchema } from "@/lib/validation/settings";
import { requireUserPage } from "@/server/auth/require-user";
import {
  getDashboard,
  type CurrencyAmount,
} from "@/server/services/dashboard";
import { getInternalSetting, getSettings } from "@/server/services/settings";
import { smoothLoading } from "@/lib/smooth-loader";

const HEARTBEAT_STALE_MS = 5 * 60 * 1000;



function SectionHeading({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 pt-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
      <Icon size={15} className="text-primary" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

function CardHeading({
  icon: Icon,
  children,
}: {
  icon: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 pb-3 mb-3 border-b border-border/40">
      <span className="flex h-7 w-7 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary">
        <Icon size={14} aria-hidden="true" />
      </span>
      <h2 className="text-sm font-semibold tracking-tight text-foreground">
        {children}
      </h2>
    </div>
  );
}

function AmountList({
  amounts,
  locale,
}: {
  amounts: CurrencyAmount[];
  locale: Locale;
}) {
  if (amounts.length === 0) {
    return <span className="text-muted-foreground">-</span>;
  }
  return (
    <div className="flex flex-wrap items-baseline gap-2 font-mono tabular-nums">
      {amounts.map((entry) => (
        <span key={entry.currency} className="font-bold">
          {formatMoney(entry.amountMinor, entry.currency as CurrencyCode, locale)}
        </span>
      ))}
    </div>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  accent = "primary",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  accent?: "primary" | "info" | "warning" | "success" | "danger";
}) {
  const accentClasses = {
    primary: "border-primary/20 bg-primary/10 text-primary",
    info: "border-sky-500/20 bg-sky-500/10 text-sky-500",
    warning: "border-amber-500/20 bg-amber-500/10 text-amber-500",
    success: "border-emerald-500/20 bg-emerald-500/10 text-emerald-500",
    danger: "border-rose-500/20 bg-rose-500/10 text-rose-500",
  }[accent];

  return (
    <div className="flex flex-col justify-between rounded border border-border/80 bg-card p-4 transition-all duration-150 hover:border-primary/40 hover:shadow-xs shadow-2xs">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
        {Icon ? (
          <span
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded border",
              accentClasses,
            )}
          >
            <Icon size={16} aria-hidden="true" />
          </span>
        ) : null}
      </div>
      <div className="mt-3">
        <div className="text-2xl font-bold tracking-tight font-mono tabular-nums text-foreground">
          {value}
        </div>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground leading-normal">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

function ClientName({
  nameAr,
  nameEn,
  locale,
}: {
  nameAr: string | null;
  nameEn: string | null;
  locale: Locale;
}) {
  const name =
    locale === "ar"
      ? (nameAr || nameEn || "-")
      : (nameEn || nameAr || "-");
  const dir =
    locale === "ar"
      ? (nameAr ? "rtl" : "ltr")
      : (nameEn ? "ltr" : "rtl");

  return (
    <span dir={dir} lang={dir === "rtl" ? "ar" : "en"}>
      {name}
    </span>
  );
}



export default async function DashboardPage() {
  await smoothLoading();
  const user = await requireUserPage();
  const t = await getTranslations("dashboard");
  const tc = await getTranslations("common");
  const tContracts = await getTranslations("contracts");
  const tInvoices = await getTranslations("invoices");
  const tn = await getTranslations("nav");
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

  const currencyLines = (amounts: CurrencyAmount[]) =>
    amounts.length === 0
      ? null
      : amounts
          .map((entry) =>
            formatMoney(
              entry.amountMinor,
              entry.currency as CurrencyCode,
              locale,
            ),
          )
          .join(" · ");

  const financial = [
    {
      label: t("outstanding"),
      value: <AmountList amounts={data.outstanding} locale={locale} />,
      hint: t("outstandingHint"),
      icon: Wallet,
      accent: "primary" as const,
    },
    {
      label: t("overdue"),
      value: (
        <div className="flex items-baseline gap-2">
          <span className="tabular-nums font-bold">
            {data.overdue.count}
          </span>
          <AmountList amounts={data.overdue.amounts} locale={locale} />
        </div>
      ),
      hint: t("overdueHint"),
      icon: AlertTriangle,
      accent: "danger" as const,
    },
    {
      label: t("collectedThisMonth"),
      value: <AmountList amounts={data.revenue.currentMonth} locale={locale} />,
      hint: `${t("lastMonth")}: ${currencyLines(data.revenue.previousMonth) ?? "-"}`,
      icon: TrendingUp,
      accent: "success" as const,
    },
    {
      label: t("issuedThisMonth"),
      value: (
        <AmountList amounts={data.issuedThisMonth.amounts} locale={locale} />
      ),
      hint: t("invoicesCount", { count: data.issuedThisMonth.count }),
      icon: Receipt,
      accent: "info" as const,
    },
  ];

  const operations = [
    {
      label: t("awaitingSignature"),
      value: data.awaitingSignature.count,
      hint: t("awaitingHint"),
      icon: FileSignature,
      accent: "warning" as const,
    },
    {
      label: t("contractsActive"),
      value: data.contractsActive,
      hint: t("signedLast30Days", { count: data.signedLast30Days }),
      icon: FileCheck2,
      accent: "success" as const,
    },
    {
      label: t("projectsActive"),
      value: data.projectsActive,
      hint: t("drafts", {
        contracts: data.draftContracts,
        invoices: data.draftInvoices,
      }),
      icon: FolderKanban,
      accent: "primary" as const,
    },
    {
      label: t("clients"),
      value: data.clientsTotal,
      hint: t("clientsNew", { count: data.clientsNewThisMonth }),
      icon: Users,
      accent: "info" as const,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <Gauge size={20} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
            <p className="text-xs text-muted-foreground">{t("subtitle")}</p>
          </div>
        </div>
      </div>

      {workerStale ? (
        <div className="flex items-center gap-2.5 rounded border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-600 dark:text-amber-400">
          <AlertTriangle size={18} className="shrink-0" aria-hidden="true" />
          <span>{t("workerStale")}</span>
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        <SectionHeading icon={Wallet}>{t("finance")}</SectionHeading>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {financial.map((item) => (
            <Kpi
              key={item.label}
              label={item.label}
              value={item.value}
              hint={item.hint}
              icon={item.icon}
              accent={item.accent}
            />
          ))}
        </div>

      </div>

      <div className="flex flex-col gap-3">
        <SectionHeading icon={Activity}>{t("operations")}</SectionHeading>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {operations.map((item) => (
            <Kpi
              key={item.label}
              label={item.label}
              value={
                <span className="tabular-nums font-bold">
                  {item.value}
                </span>
              }
              hint={item.hint}
              icon={item.icon}
              accent={item.accent}
            />
          ))}
        </div>
      </div>

      <div className="rounded border border-border/80 bg-card p-4 sm:p-5 shadow-xs">
        <CardHeading icon={BarChart3}>{t("monthlyTitle")}</CardHeading>
        <MonthlyChart
          points={data.monthlyActivity}
          locale={locale}
          issuedLabel={t("seriesIssued")}
          signedLabel={t("seriesSigned")}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <StatusDonut
          title={t("contractsByStatus")}
          kind="contracts"
          statuses={CONTRACT_STATUSES}
          counts={data.contractsByStatus}
          totalLabel={tc("total")}
          labels={Object.fromEntries(
            CONTRACT_STATUSES.map((status) => [
              status,
              tContracts(`status.${status}`),
            ]),
          )}
        />
        <StatusDonut
          title={t("invoicesByStatus")}
          kind="invoices"
          statuses={INVOICE_STATUSES}
          counts={data.invoicesByStatus}
          totalLabel={tc("total")}
          labels={Object.fromEntries(
            INVOICE_STATUSES.map((status) => [
              status,
              tInvoices(`status.${status}`),
            ]),
          )}
        />
      </div>

      <div className="flex flex-col gap-3">
        <SectionHeading icon={BellRing}>{t("attention")}</SectionHeading>

        <div className="overflow-hidden rounded border border-border/80 bg-card shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-2">
              <FileSignature size={16} className="text-primary" aria-hidden="true" />
              <span className="text-sm font-semibold tracking-tight text-foreground">
                {t("awaitingTitle")}
              </span>
            </div>
            <span className="inline-flex items-center gap-1 rounded border border-border/60 bg-card px-2 py-0.5 text-xs font-mono font-medium text-muted-foreground">
              <Clock size={12} aria-hidden="true" />
              <span>{data.awaitingSignature.count}</span>
            </span>
          </div>

          {data.awaitingSignature.rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground text-center">
              <CheckCircle2 size={32} className="text-emerald-500/80 mb-1" aria-hidden="true" />
              <span className="text-sm font-medium text-foreground">{t("awaitingEmpty")}</span>
            </div>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>
                    <span className="inline-flex items-center gap-1.5">
                      <FileSignature size={14} className="text-muted-foreground" aria-hidden="true" />
                      {t("number")}
                    </span>
                  </TableHeaderCell>
                  <TableHeaderCell>
                    <span className="inline-flex items-center gap-1.5">
                      <Users size={14} className="text-muted-foreground" aria-hidden="true" />
                      {t("client")}
                    </span>
                  </TableHeaderCell>
                  <TableHeaderCell className="text-end">
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={14} className="text-muted-foreground" aria-hidden="true" />
                      {t("daysWaiting")}
                    </span>
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.awaitingSignature.rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <Link
                        href={`/contracts/${row.id}`}
                        className="inline-flex items-center gap-1.5 font-medium font-mono text-foreground hover:text-primary transition-colors"
                      >
                        <FileText size={15} className="text-muted-foreground" aria-hidden="true" />
                        <span>{row.number ?? "-"}</span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <ClientName
                        nameAr={row.clientNameAr}
                        nameEn={row.clientNameEn}
                        locale={locale}
                      />
                    </TableCell>
                    <TableCell className="text-end tabular-nums font-medium">
                      {t("days", { count: row.daysWaiting })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="overflow-hidden rounded border border-border/80 bg-card shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-amber-500" aria-hidden="true" />
              <span className="text-sm font-semibold tracking-tight text-foreground">
                {t("dueSoonTitle")}
              </span>
            </div>
            <span className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs font-mono font-medium text-amber-500">
              <AlertCircle size={12} aria-hidden="true" />
              <span>{data.dueSoon.length}</span>
            </span>
          </div>

          {data.dueSoon.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground text-center">
              <CheckCircle2 size={32} className="text-emerald-500/80 mb-1" aria-hidden="true" />
              <span className="text-sm font-medium text-foreground">{t("dueSoonEmpty")}</span>
            </div>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>
                    <span className="inline-flex items-center gap-1.5">
                      <Receipt size={14} className="text-muted-foreground" aria-hidden="true" />
                      {t("number")}
                    </span>
                  </TableHeaderCell>
                  <TableHeaderCell>
                    <span className="inline-flex items-center gap-1.5">
                      <Users size={14} className="text-muted-foreground" aria-hidden="true" />
                      {t("client")}
                    </span>
                  </TableHeaderCell>
                  <TableHeaderCell>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar size={14} className="text-muted-foreground" aria-hidden="true" />
                      {t("dueDate")}
                    </span>
                  </TableHeaderCell>
                  <TableHeaderCell className="text-end">
                    <span className="inline-flex items-center gap-1.5">
                      <Wallet size={14} className="text-muted-foreground" aria-hidden="true" />
                      {t("outstanding")}
                    </span>
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.dueSoon.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <Link
                        href={`/invoices/${row.id}`}
                        className="inline-flex items-center gap-1.5 font-medium font-mono text-foreground hover:text-primary transition-colors"
                      >
                        <Receipt size={15} className="text-muted-foreground" aria-hidden="true" />
                        <span>{row.number ?? "-"}</span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <ClientName
                        nameAr={row.clientNameAr}
                        nameEn={row.clientNameEn}
                        locale={locale}
                      />
                    </TableCell>
                    <TableCell className="tabular-nums font-mono text-xs">{row.dueDate}</TableCell>
                    <TableCell className="text-end">
                      <span className="tabular-nums font-semibold font-mono">
                        {formatMoney(
                          row.outstandingMinor,
                          row.currency as CurrencyCode,
                          locale,
                        )}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="overflow-hidden rounded border border-border/80 bg-card shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-2">
              <CalendarClock size={16} className="text-sky-500" aria-hidden="true" />
              <span className="text-sm font-semibold tracking-tight text-foreground">
                {t("endingSoonTitle")}
              </span>
            </div>
            <span className="inline-flex items-center gap-1 rounded border border-border/60 bg-card px-2 py-0.5 text-xs font-mono font-medium text-muted-foreground">
              <CalendarClock size={12} aria-hidden="true" />
              <span>{data.endingSoon.count}</span>
            </span>
          </div>

          {data.endingSoon.rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground text-center">
              <CheckCircle2 size={32} className="text-emerald-500/80 mb-1" aria-hidden="true" />
              <span className="text-sm font-medium text-foreground">{t("endingSoonEmpty")}</span>
            </div>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>
                    <span className="inline-flex items-center gap-1.5">
                      <FileText size={14} className="text-muted-foreground" aria-hidden="true" />
                      {t("number")}
                    </span>
                  </TableHeaderCell>
                  <TableHeaderCell>
                    <span className="inline-flex items-center gap-1.5">
                      <Users size={14} className="text-muted-foreground" aria-hidden="true" />
                      {t("client")}
                    </span>
                  </TableHeaderCell>
                  <TableHeaderCell>
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar size={14} className="text-muted-foreground" aria-hidden="true" />
                      {t("endDate")}
                    </span>
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.endingSoon.rows.map((row) => (
                  <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <Link
                        href={`/contracts/${row.id}`}
                        className="inline-flex items-center gap-1.5 font-medium font-mono text-foreground hover:text-primary transition-colors"
                      >
                        <FileText size={15} className="text-muted-foreground" aria-hidden="true" />
                        <span>{row.number ?? "-"}</span>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <ClientName
                        nameAr={row.clientNameAr}
                        nameEn={row.clientNameEn}
                        locale={locale}
                      />
                    </TableCell>
                    <TableCell className="tabular-nums font-mono text-xs">{row.endDate}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        <div className="overflow-hidden rounded border border-border/80 bg-card shadow-xs">
          <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-4 py-3">
            <div className="flex items-center gap-2">
              <History size={16} className="text-muted-foreground" aria-hidden="true" />
              <span className="text-sm font-semibold tracking-tight text-foreground">
                {t("activityTitle")}
              </span>
            </div>
          </div>

          {data.recentActivity.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-10 text-muted-foreground text-center">
              <History size={32} className="text-muted-foreground/60 mb-1" aria-hidden="true" />
              <span className="text-sm font-medium text-foreground">{t("activityEmpty")}</span>
            </div>
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>
                    <span className="inline-flex items-center gap-1.5">
                      <Clock size={14} className="text-muted-foreground" aria-hidden="true" />
                      {t("when")}
                    </span>
                  </TableHeaderCell>
                  <TableHeaderCell>
                    <span className="inline-flex items-center gap-1.5">
                      <Activity size={14} className="text-muted-foreground" aria-hidden="true" />
                      {t("action")}
                    </span>
                  </TableHeaderCell>
                  <TableHeaderCell>
                    <span className="inline-flex items-center gap-1.5">
                      <Layers size={14} className="text-muted-foreground" aria-hidden="true" />
                      {t("entity")}
                    </span>
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {data.recentActivity.map((row) => {
                  const href =
                    row.entityType === "contract"
                      ? `/contracts/${row.entityId}`
                      : row.entityType === "invoice"
                        ? `/invoices/${row.entityId}`
                        : null;
                  const entityLabel =
                    row.entityType === "contract"
                      ? tn("contracts")
                      : row.entityType === "invoice"
                        ? tn("invoices")
                        : row.entityType;
                  return (
                    <TableRow key={row.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="whitespace-nowrap tabular-nums font-mono text-xs text-muted-foreground">
                        {formatInstant(row.ts, timezone, locale)}
                      </TableCell>
                      <TableCell>
                        <span className="rounded border border-border/60 bg-muted/30 px-2 py-0.5 font-mono text-xs font-medium text-foreground">
                          {row.action}
                        </span>
                      </TableCell>
                      <TableCell>
                        {href ? (
                          <Link
                            href={href}
                            className="inline-flex items-center gap-1.5 font-medium text-foreground hover:text-primary transition-colors"
                          >
                            {row.entityType === "contract" ? (
                              <FileText size={15} className="text-primary" aria-hidden="true" />
                            ) : (
                              <Receipt size={15} className="text-sky-500" aria-hidden="true" />
                            )}
                            <span>{entityLabel}</span>
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                            <FolderKanban size={15} aria-hidden="true" />
                            <span>{entityLabel}</span>
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
}