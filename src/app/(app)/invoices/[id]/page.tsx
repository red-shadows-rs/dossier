import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, projects } from "@/db/schema";
import { getTranslations } from "next-intl/server";
import {
  InvoiceActions,
  VoidPaymentButton,
} from "@/components/forms/InvoiceActions";
import { InvoiceDocumentViewer } from "@/components/forms/InvoiceDocumentViewer";
import { Badge, invoiceStatusTone } from "@/components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import type { CurrencyCode } from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import { todayInTz } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { can } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { getInvoiceDetail, isOverdue } from "@/server/services/invoices";
import { listPayments } from "@/server/services/payments";
import { getSettings } from "@/server/services/settings";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUserPage();
  const t = await getTranslations("invoices");
  const { id } = await params;

  let detail;
  try {
    detail = getInvoiceDetail(id);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  const { invoice, lines } = detail;
  const project = db
    .select()
    .from(projects)
    .where(eq(projects.id, invoice.projectId))
    .get();
  const client = db
    .select()
    .from(clients)
    .where(eq(clients.id, invoice.clientId))
    .get();
  const payments = listPayments(id);
  const currency = invoice.currency as CurrencyCode;
  const today = todayInTz(getSettings("defaults").timezone);
  const overdue = isOverdue(invoice, today);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">
            {invoice.number ?? t("draftTitle")}
          </h1>
          <Badge tone={invoiceStatusTone(invoice.status, overdue)}>
            {overdue ? t("overdue") : t(`status.${invoice.status}`)}
          </Badge>
        </div>
        <InvoiceActions
          invoiceId={invoice.id}
          status={invoice.status}
          number={invoice.number}
          currency={invoice.currency}
          canWrite={can(user, "invoices.write")}
          canIssue={can(user, "invoices.issue")}
          canVoid={can(user, "invoices.void")}
          canPay={can(user, "payments.write")}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("summary")}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Row
              label={t("project")}
              value={project?.nameAr ?? project?.nameEn ?? "-"}
            />
            <Row
              label={t("client")}
              value={client?.nameAr ?? client?.nameEn ?? "-"}
            />
            <Row label={t("issueDate")} value={invoice.issueDate ?? "-"} ltr />
            <Row label={t("dueDate")} value={invoice.dueDate ?? "-"} ltr />
            <Row label={t("currency")} value={invoice.currency} ltr />
          </dl>
          <dl className="mt-4 flex flex-col gap-1" dir="ltr">
            <Money
              label={t("subtotal")}
              value={formatMoney(invoice.subtotalMinor, currency, "en")}
            />
            <Money
              label={t("discount")}
              value={formatMoney(invoice.discountMinor, currency, "en")}
            />
            <Money
              label={t("net")}
              value={formatMoney(invoice.netMinor, currency, "en")}
            />
            <Money
              label={t("tax")}
              value={formatMoney(invoice.taxMinor, currency, "en")}
            />
            <Money
              label={t("total")}
              value={formatMoney(invoice.totalMinor, currency, "en")}
              strong
            />
            <Money
              label={t("paid")}
              value={formatMoney(invoice.paidMinor, currency, "en")}
            />
            <Money
              label={t("balance")}
              value={formatMoney(
                invoice.totalMinor - invoice.paidMinor,
                currency,
                "en",
              )}
              strong
            />
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("linesTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {lines.length === 0 ? (
            <EmptyState title={t("noLines")} />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t("lineDescription")}</TableHeaderCell>
                  <TableHeaderCell>{t("lineQty")}</TableHeaderCell>
                  <TableHeaderCell>{t("lineUnit")}</TableHeaderCell>
                  <TableHeaderCell>{t("lineTotal")}</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.id}>
                    <TableCell>
                      {line.descriptionEn ?? line.descriptionAr ?? "-"}
                    </TableCell>
                    <TableCell dir="ltr" className="text-start tabular-nums">
                      {line.qtyMilli / 1000}
                    </TableCell>
                    <TableCell dir="ltr" className="text-start tabular-nums">
                      {formatMoney(line.unitPriceMinor, currency, "en")}
                    </TableCell>
                    <TableCell dir="ltr" className="text-start tabular-nums">
                      {formatMoney(line.lineTotalMinor, currency, "en")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("paymentsTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <EmptyState title={t("noPayments")} />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t("paidOn")}</TableHeaderCell>
                  <TableHeaderCell>{t("amountLabel")}</TableHeaderCell>
                  <TableHeaderCell>{t("method")}</TableHeaderCell>
                  <TableHeaderCell>{t("reference")}</TableHeaderCell>
                  <TableHeaderCell className="text-end" />
                </TableRow>
              </TableHead>
              <TableBody>
                {payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell dir="ltr" className="text-start">
                      {payment.paidOn}
                    </TableCell>
                    <TableCell dir="ltr" className="text-start tabular-nums">
                      {formatMoney(payment.amountMinor, currency, "en")}
                    </TableCell>
                    <TableCell>{t(`methods.${payment.method}`)}</TableCell>
                    <TableCell dir="ltr" className="text-start">
                      {payment.reference ?? "-"}
                    </TableCell>
                    <TableCell className="text-end">
                      {payment.voidedAt === null &&
                      can(user, "payments.void") &&
                      (invoice.status === "issued" ||
                        invoice.status === "partially_paid" ||
                        invoice.status === "paid") ? (
                        <VoidPaymentButton
                          paymentId={payment.id}
                          invoiceId={invoice.id}
                          amountMinor={payment.amountMinor}
                          currency={invoice.currency}
                        />
                      ) : payment.voidedAt !== null ? (
                        <Badge tone="gray">{t("paymentVoidedBadge")}</Badge>
                      ) : null}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("documentTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <InvoiceDocumentViewer
            id={invoice.id}
            languageMode={invoice.languageMode}
            canDownload={can(user, "invoices.read")}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function Row({
  label,
  value,
  ltr,
}: {
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground" dir={ltr ? "ltr" : undefined}>
        {value}
      </dd>
    </div>
  );
}

function Money({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={strong ? "font-semibold tabular-nums" : "tabular-nums"}>
        {value}
      </dd>
    </div>
  );
}
