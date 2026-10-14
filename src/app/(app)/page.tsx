import Link from "next/link";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  FileCheck2,
  FileSignature,
  FolderKanban,
  Receipt,
  TrendingUp,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import MuiAlert from "@mui/material/Alert";
import MuiBox from "@mui/material/Box";
import MuiCard from "@mui/material/Card";
import MuiCardContent from "@mui/material/CardContent";
import MuiChip from "@mui/material/Chip";
import MuiGrid from "@mui/material/Grid";
import MuiStack from "@mui/material/Stack";
import MuiTypography from "@mui/material/Typography";
import { BarChart } from "@mui/x-charts/BarChart";
import { PieChart } from "@mui/x-charts/PieChart";
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
import { CONTRACT_STATUSES, INVOICE_STATUSES } from "@/lib/constants";
import { formatInstant, nowMs } from "@/lib/dates";
import { isLocale } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { workerHeartbeatSchema } from "@/lib/validation/settings";
import { requireUserPage } from "@/server/auth/require-user";
import {
  getDashboard,
  type CurrencyAmount,
  type MonthlyPoint,
} from "@/server/services/dashboard";
import { getInternalSetting, getSettings } from "@/server/services/settings";

const HEARTBEAT_STALE_MS = 5 * 60 * 1000;

const CHART_COLORS = [
  "var(--mui-palette-primary-main)",
  "var(--mui-palette-info-main)",
  "var(--mui-palette-warning-main)",
  "var(--mui-palette-success-main)",
  "var(--mui-palette-error-main)",
  "var(--mui-palette-text-disabled)",
];

function AmountList({
  amounts,
  locale,
}: {
  amounts: CurrencyAmount[];
  locale: Locale;
}) {
  if (amounts.length === 0) {
    return (
      <MuiTypography component="span" color="text.secondary">
        -
      </MuiTypography>
    );
  }
  return (
    <MuiStack
      component="span"
      direction="row"
      spacing={1}
      dir="ltr"
      sx={{
        flexWrap: "wrap",
        alignItems: "baseline",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {amounts.map((entry) => (
        <span key={entry.currency}>
          {formatMoney(entry.amountMinor, entry.currency as CurrencyCode, locale)}
        </span>
      ))}
    </MuiStack>
  );
}

function Kpi({
  label,
  value,
  hint,
  icon: Icon,
  accent,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon?: LucideIcon;
  accent?: string;
}) {
  return (
    <MuiCard sx={{ height: "100%" }}>
      <MuiCardContent
        sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
      >
        <MuiStack direction="row" spacing={0.75} sx={{ alignItems: "center" }}>
          {Icon ? (
            <MuiBox
              component="span"
              sx={{ display: "inline-flex", color: accent ?? "text.disabled" }}
            >
              <Icon size={18} aria-hidden="true" />
            </MuiBox>
          ) : null}
          <MuiTypography variant="caption" color="text.secondary">
            {label}
          </MuiTypography>
        </MuiStack>
        <MuiTypography
          component="div"
          variant="h6"
          sx={{ fontWeight: 600, lineHeight: 1.35 }}
        >
          {value}
        </MuiTypography>
        {hint ? (
          <MuiTypography variant="caption" color="text.secondary">
            {hint}
          </MuiTypography>
        ) : null}
      </MuiCardContent>
    </MuiCard>
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
    <MuiStack component="span" direction="column">
      <span dir="rtl" lang="ar">
        {nameAr ?? nameEn ?? "-"}
      </span>
      {nameEn && nameAr ? (
        <MuiTypography
          component="span"
          variant="caption"
          color="text.secondary"
          dir="ltr"
          lang="en"
        >
          {nameEn}
        </MuiTypography>
      ) : null}
    </MuiStack>
  );
}

function MonthlyChart({
  points,
  locale,
  issuedLabel,
  signedLabel,
}: {
  points: MonthlyPoint[];
  locale: Locale;
  issuedLabel: string;
  signedLabel: string;
}) {
  const fmt = new Intl.DateTimeFormat(locale === "ar" ? "ar" : "en", {
    month: "short",
  });
  const months = points.map((point) =>
    fmt.format(new Date(`${point.month}-01T00:00:00Z`)),
  );

  return (
    <MuiBox sx={{ width: "100%" }}>
      <BarChart
        height={300}
        xAxis={[{ scaleType: "band", data: months }]}
        series={[
          {
            data: points.map((point) => point.issued),
            label: issuedLabel,
            color: "var(--mui-palette-primary-main)",
          },
          {
            data: points.map((point) => point.signed),
            label: signedLabel,
            color: "var(--mui-palette-info-main)",
          },
        ]}
        borderRadius={6}
        grid={{ horizontal: true }}
        margin={{ top: 10, bottom: 10, left: 30, right: 10 }}
      />
    </MuiBox>
  );
}

function StatusDonut({
  title,
  statuses,
  counts,
  labels,
}: {
  title: string;
  statuses: readonly string[];
  counts: Record<string, number>;
  labels: (status: string) => string;
}) {
  const data = statuses
    .map((status, index) => ({
      id: index,
      value: counts[status] ?? 0,
      label: labels(status),
      color: CHART_COLORS[index % CHART_COLORS.length],
    }))
    .filter((entry) => entry.value > 0);
  const total = data.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <MuiCard sx={{ height: "100%" }}>
      <MuiCardContent>
        <MuiTypography variant="subtitle2" sx={{ mb: 1 }}>
          {title}
        </MuiTypography>
        {total === 0 ? (
          <MuiTypography variant="body2" color="text.secondary">
            -
          </MuiTypography>
        ) : (
          <MuiStack spacing={1} sx={{ alignItems: "center" }}>
            <MuiBox sx={{ width: "100%" }}>
              <PieChart
                height={200}
                series={[
                  {
                    data: data.map((entry) => ({
                      id: entry.id,
                      value: entry.value,
                      label: entry.label,
                    })),
                    innerRadius: 58,
                    paddingAngle: 2,
                    cornerRadius: 3,
                  },
                ]}
                colors={data.map((entry) => entry.color)}
                margin={{ left: 0, right: 0, top: 0, bottom: 0 }}
              />
            </MuiBox>
            <MuiStack spacing={0.5} sx={{ width: "100%" }}>
              {data.map((entry) => (
                <MuiStack
                  key={entry.id}
                  direction="row"
                  sx={{ alignItems: "center", justifyContent: "space-between" }}
                >
                  <MuiStack
                    direction="row"
                    spacing={0.75}
                    sx={{ alignItems: "center" }}
                  >
                    <MuiBox
                      component="span"
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        bgcolor: entry.color,
                      }}
                    />
                    <MuiTypography variant="body2" color="text.secondary">
                      {entry.label}
                    </MuiTypography>
                  </MuiStack>
                  <MuiTypography variant="body2" sx={{ fontWeight: 600 }}>
                    {entry.value}
                  </MuiTypography>
                </MuiStack>
              ))}
            </MuiStack>
          </MuiStack>
        )}
      </MuiCardContent>
    </MuiCard>
  );
}

export default async function DashboardPage() {
  const user = await requireUserPage();
  const t = await getTranslations("dashboard");
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
      accent: "primary.main",
    },
    {
      label: t("overdue"),
      value: (
        <MuiStack
          component="span"
          direction="row"
          spacing={1}
          sx={{ alignItems: "baseline" }}
        >
          <span dir="ltr" style={{ fontVariantNumeric: "tabular-nums" }}>
            {data.overdue.count}
          </span>
          <AmountList amounts={data.overdue.amounts} locale={locale} />
        </MuiStack>
      ),
      hint: t("overdueHint"),
      icon: AlertTriangle,
      accent: "error.main",
    },
    {
      label: t("collectedThisMonth"),
      value: <AmountList amounts={data.revenue.currentMonth} locale={locale} />,
      hint: `${t("lastMonth")}: ${currencyLines(data.revenue.previousMonth) ?? "-"}`,
      icon: TrendingUp,
      accent: "success.main",
    },
    {
      label: t("issuedThisMonth"),
      value: (
        <AmountList amounts={data.issuedThisMonth.amounts} locale={locale} />
      ),
      hint: t("invoicesCount", { count: data.issuedThisMonth.count }),
      icon: Receipt,
      accent: "info.main",
    },
  ];

  const operations = [
    {
      label: t("awaitingSignature"),
      value: data.awaitingSignature.count,
      hint: t("awaitingHint"),
      icon: FileSignature,
      accent: "warning.main",
    },
    {
      label: t("contractsActive"),
      value: data.contractsActive,
      hint: t("signedLast30Days", { count: data.signedLast30Days }),
      icon: FileCheck2,
      accent: "success.main",
    },
    {
      label: t("projectsActive"),
      value: data.projectsActive,
      hint: t("drafts", {
        contracts: data.draftContracts,
        invoices: data.draftInvoices,
      }),
      icon: FolderKanban,
      accent: "primary.main",
    },
    {
      label: t("clients"),
      value: data.clientsTotal,
      hint: t("clientsNew", { count: data.clientsNewThisMonth }),
      icon: Users,
      accent: "info.main",
    },
  ];

  return (
    <MuiStack spacing={2}>
      <MuiStack spacing={0.5}>
        <MuiTypography component="h1" variant="h5" sx={{ fontWeight: 700 }}>
          {t("title")}
        </MuiTypography>
        <MuiTypography variant="body2" color="text.secondary">
          {t("subtitle")}
        </MuiTypography>
      </MuiStack>

      {workerStale ? (
        <MuiAlert severity="warning">{t("workerStale")}</MuiAlert>
      ) : null}

      <MuiTypography variant="overline" color="text.secondary">
        {t("finance")}
      </MuiTypography>
      <MuiGrid container spacing={2}>
        {financial.map((item) => (
          <MuiGrid key={item.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Kpi
              label={item.label}
              value={item.value}
              hint={item.hint}
              icon={item.icon}
              accent={item.accent}
            />
          </MuiGrid>
        ))}
      </MuiGrid>

      <MuiTypography variant="overline" color="text.secondary">
        {t("operations")}
      </MuiTypography>
      <MuiGrid container spacing={2}>
        {operations.map((item) => (
          <MuiGrid key={item.label} size={{ xs: 12, sm: 6, md: 3 }}>
            <Kpi
              label={item.label}
              value={
                <span dir="ltr" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {item.value}
                </span>
              }
              hint={item.hint}
              icon={item.icon}
              accent={item.accent}
            />
          </MuiGrid>
        ))}
      </MuiGrid>

      <MuiCard>
        <MuiCardContent>
          <MuiTypography variant="subtitle2" sx={{ mb: 1 }}>
            {t("monthlyTitle")}
          </MuiTypography>
          <MonthlyChart
            points={data.monthlyActivity}
            locale={locale}
            issuedLabel={t("seriesIssued")}
            signedLabel={t("seriesSigned")}
          />
        </MuiCardContent>
      </MuiCard>

      <MuiGrid container spacing={2}>
        <MuiGrid size={{ xs: 12, md: 6 }}>
          <StatusDonut
            title={t("contractsByStatus")}
            statuses={CONTRACT_STATUSES}
            counts={data.contractsByStatus}
            labels={(status) => tContracts(`status.${status}`)}
          />
        </MuiGrid>
        <MuiGrid size={{ xs: 12, md: 6 }}>
          <StatusDonut
            title={t("invoicesByStatus")}
            statuses={INVOICE_STATUSES}
            counts={data.invoicesByStatus}
            labels={(status) => tInvoices(`status.${status}`)}
          />
        </MuiGrid>
      </MuiGrid>

      <MuiTypography variant="overline" color="text.secondary">
        {t("attention")}
      </MuiTypography>

      <MuiCard>
        <MuiCardContent>
          <MuiStack
            direction="row"
            sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}
          >
            <MuiTypography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {t("awaitingTitle")}
            </MuiTypography>
            <MuiChip
              size="small"
              variant="outlined"
              label={data.awaitingSignature.count}
            />
          </MuiStack>
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
                        {row.number ?? "-"}
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
        </MuiCardContent>
      </MuiCard>

      <MuiCard>
        <MuiCardContent>
          <MuiStack
            direction="row"
            sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}
          >
            <MuiTypography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {t("dueSoonTitle")}
            </MuiTypography>
            <MuiChip
              size="small"
              variant="outlined"
              label={data.dueSoon.length}
            />
          </MuiStack>
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
                        {row.number ?? "-"}
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
        </MuiCardContent>
      </MuiCard>

      <MuiCard>
        <MuiCardContent>
          <MuiStack
            direction="row"
            sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}
          >
            <MuiTypography variant="subtitle1" sx={{ fontWeight: 600 }}>
              {t("endingSoonTitle")}
            </MuiTypography>
            <MuiChip
              size="small"
              variant="outlined"
              label={data.endingSoon.count}
            />
          </MuiStack>
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
                        {row.number ?? "-"}
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
        </MuiCardContent>
      </MuiCard>

      <MuiCard>
        <MuiCardContent>
          <MuiTypography
            component="h2"
            variant="subtitle1"
            sx={{ fontWeight: 600, mb: 1 }}
          >
            {t("activityTitle")}
          </MuiTypography>
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
                  const entityLabel =
                    row.entityType === "contract"
                      ? tn("contracts")
                      : row.entityType === "invoice"
                        ? tn("invoices")
                        : row.entityType;
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
                            {entityLabel}
                          </Link>
                        ) : (
                          <span>{entityLabel}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </MuiCardContent>
      </MuiCard>
    </MuiStack>
  );
}