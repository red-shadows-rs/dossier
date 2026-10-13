import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import MuiAlert from "@mui/material/Alert";
import MuiCard from "@mui/material/Card";
import MuiCardContent from "@mui/material/CardContent";
import MuiChip from "@mui/material/Chip";
import MuiDivider from "@mui/material/Divider";
import MuiGrid from "@mui/material/Grid";
import MuiStack from "@mui/material/Stack";
import MuiTypography from "@mui/material/Typography";
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
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <MuiCard variant="outlined" sx={{ height: "100%" }}>
      <MuiCardContent
        sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}
      >
        <MuiTypography variant="caption" color="text.secondary">
          {label}
        </MuiTypography>
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

function StatusBreakdown({
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
  return (
    <MuiCard variant="outlined" sx={{ height: "100%" }}>
      <MuiCardContent>
        <MuiTypography variant="subtitle2" sx={{ mb: 1 }}>
          {title}
        </MuiTypography>
        <MuiStack spacing={0.5}>
          {statuses.map((status, index) => (
            <Fragment key={status}>
              {index > 0 ? <MuiDivider /> : null}
              <MuiStack
                direction="row"
                sx={{ alignItems: "center", justifyContent: "space-between" }}
              >
                <MuiTypography variant="body2" color="text.secondary">
                  {labels(status)}
                </MuiTypography>
                <MuiTypography variant="body2" sx={{ fontWeight: 600 }}>
                  {counts[status] ?? 0}
                </MuiTypography>
              </MuiStack>
            </Fragment>
          ))}
        </MuiStack>
      </MuiCardContent>
    </MuiCard>
  );
}

export default async function DashboardPage() {
  const user = await requireUserPage();
  const t = await getTranslations("dashboard");
  const tContracts = await getTranslations("contracts");
  const tInvoices = await getTranslations("invoices");
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
        <MuiGrid size={{ xs: 12, sm: 6, md: 3 }}>
          <Kpi
            label={t("outstanding")}
            value={<AmountList amounts={data.outstanding} locale={locale} />}
            hint={t("outstandingHint")}
          />
        </MuiGrid>
        <MuiGrid size={{ xs: 12, sm: 6, md: 3 }}>
          <Kpi
            label={t("overdue")}
            value={
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
            }
            hint={t("overdueHint")}
          />
        </MuiGrid>
        <MuiGrid size={{ xs: 12, sm: 6, md: 3 }}>
          <Kpi
            label={t("collectedThisMonth")}
            value={
              <AmountList amounts={data.revenue.currentMonth} locale={locale} />
            }
            hint={`${t("lastMonth")}: ${
              currencyLines(data.revenue.previousMonth) ?? "-"
            }`}
          />
        </MuiGrid>
        <MuiGrid size={{ xs: 12, sm: 6, md: 3 }}>
          <Kpi
            label={t("issuedThisMonth")}
            value={
              <AmountList
                amounts={data.issuedThisMonth.amounts}
                locale={locale}
              />
            }
            hint={t("invoicesCount", { count: data.issuedThisMonth.count })}
          />
        </MuiGrid>
      </MuiGrid>

      <MuiTypography variant="overline" color="text.secondary">
        {t("operations")}
      </MuiTypography>
      <MuiGrid container spacing={2}>
        <MuiGrid size={{ xs: 12, sm: 6, md: 3 }}>
          <Kpi
            label={t("awaitingSignature")}
            value={
              <span dir="ltr" style={{ fontVariantNumeric: "tabular-nums" }}>
                {data.awaitingSignature.count}
              </span>
            }
            hint={t("awaitingHint")}
          />
        </MuiGrid>
        <MuiGrid size={{ xs: 12, sm: 6, md: 3 }}>
          <Kpi
            label={t("contractsActive")}
            value={
              <span dir="ltr" style={{ fontVariantNumeric: "tabular-nums" }}>
                {data.contractsActive}
              </span>
            }
            hint={t("signedLast30Days", { count: data.signedLast30Days })}
          />
        </MuiGrid>
        <MuiGrid size={{ xs: 12, sm: 6, md: 3 }}>
          <Kpi
            label={t("projectsActive")}
            value={
              <span dir="ltr" style={{ fontVariantNumeric: "tabular-nums" }}>
                {data.projectsActive}
              </span>
            }
            hint={t("drafts", {
              contracts: data.draftContracts,
              invoices: data.draftInvoices,
            })}
          />
        </MuiGrid>
        <MuiGrid size={{ xs: 12, sm: 6, md: 3 }}>
          <Kpi
            label={t("clients")}
            value={
              <span dir="ltr" style={{ fontVariantNumeric: "tabular-nums" }}>
                {data.clientsTotal}
              </span>
            }
            hint={t("clientsNew", { count: data.clientsNewThisMonth })}
          />
        </MuiGrid>
      </MuiGrid>

      <MuiGrid container spacing={2}>
        <MuiGrid size={{ xs: 12, md: 6 }}>
          <StatusBreakdown
            title={t("contractsByStatus")}
            statuses={CONTRACT_STATUSES}
            counts={data.contractsByStatus}
            labels={(status) => tContracts(`status.${status}`)}
          />
        </MuiGrid>
        <MuiGrid size={{ xs: 12, md: 6 }}>
          <StatusBreakdown
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

      <MuiCard variant="outlined">
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

      <MuiCard variant="outlined">
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
                <TableHeaderCell className="text-end">{t("outstanding")}</TableHeaderCell>
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

      <MuiCard variant="outlined">
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

      <MuiCard variant="outlined">
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
        </MuiCardContent>
      </MuiCard>
    </MuiStack>
  );
}