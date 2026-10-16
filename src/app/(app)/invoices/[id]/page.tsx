import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import {
  Building2,
  Calendar,
  Clock,
  CreditCard,
  FileText,
  FolderKanban,
  ListOrdered,
  Receipt,
  Wallet,
} from "lucide-react";
import { db } from "@/db";
import { clients, projects } from "@/db/schema";
import { getLocale, getTranslations } from "next-intl/server";
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
import { getSettings, buildPaymentInstructions } from "@/server/services/settings";
import { smoothLoading } from "@/lib/smooth-loader";

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await smoothLoading();
  const user = await requireUserPage();
  const t = await getTranslations("invoices");
  const rawLocale = await getLocale();
  const locale = rawLocale === "en" ? "en" : "ar";
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
  const percentPaid = Math.min(
    100,
    Math.round((invoice.paidMinor / (invoice.totalMinor || 1)) * 100),
  );
  const company = getSettings("company");
  const fallbackInstructions = buildPaymentInstructions(company, locale);
  const paymentInstructions =
    (locale === "ar"
      ? invoice.paymentInstructionsAr || invoice.paymentInstructionsEn
      : invoice.paymentInstructionsEn || invoice.paymentInstructionsAr) ||
    fallbackInstructions;

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <Receipt size={20} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {invoice.number ?? t("draftTitle")}
              </h1>
              <Badge tone={invoiceStatusTone(invoice.status, overdue)} className="translate-y-0.5">
                {overdue ? t("overdue") : t(`status.${invoice.status}`)}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {invoice.issueDate ? (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{t("issueDate")}:</span>
                  <span dir="ltr" className="font-mono text-foreground">
                    {invoice.issueDate}
                  </span>
                </span>
              ) : null}
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{t("dueDate")}:</span>
                {invoice.dueDate ? (
                  <span
                    dir="ltr"
                    className={`font-mono ${
                      overdue
                        ? "font-semibold text-destructive"
                        : "text-foreground"
                    }`}
                  >
                    {invoice.dueDate}
                  </span>
                ) : (
                  <span className="text-muted-foreground">{t("noDueDate")}</span>
                )}
              </span>
            </div>
          </div>
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded border border-border/80 bg-card p-3 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">{t("total")}</span>
          <span className="text-lg font-bold font-mono tabular-nums text-foreground">
            {formatMoney(invoice.totalMinor, currency, locale)}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded border border-border/80 bg-card p-3 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">{t("paid")}</span>
          <span className="text-lg font-bold font-mono tabular-nums text-emerald-500">
            {formatMoney(invoice.paidMinor, currency, locale)}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded border border-border/80 bg-card p-3 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">{t("balance")}</span>
          <span className="text-lg font-bold font-mono tabular-nums text-foreground">
            {formatMoney(invoice.totalMinor - invoice.paidMinor, currency, locale)}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded border border-border/80 bg-card p-3 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">{t("paymentsTitle")}</span>
          <span className="text-lg font-bold font-mono tabular-nums text-foreground">
            {payments.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="inline-flex items-center gap-2">
                <FileText size={18} className="text-primary" aria-hidden="true" />
                <span>{t("documentTitle")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <InvoiceDocumentViewer
                id={invoice.id}
                languageMode={invoice.languageMode}
                canDownload={can(user, "invoices.read")}
                hasPayments={payments.some((p) => p.voidedAt === null)}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <ListOrdered size={18} className="text-primary" aria-hidden="true" />
                <span>{t("linesTitle")}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  ({lines.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {lines.length === 0 ? (
                <EmptyState title={t("noLines")} />
              ) : (
                <div className="overflow-x-auto rounded border border-border">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>{t("lineDescription")}</TableHeaderCell>
                        <TableHeaderCell className="text-end">
                          {t("lineQty")}
                        </TableHeaderCell>
                        <TableHeaderCell className="text-end">
                          {t("lineUnit")}
                        </TableHeaderCell>
                        <TableHeaderCell className="text-end">
                          {t("lineTotal")}
                        </TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lines.map((line) => {
                        const desc =
                          user.locale === "ar"
                            ? (line.descriptionAr ?? line.descriptionEn ?? "-")
                            : (line.descriptionEn ?? line.descriptionAr ?? "-");
                        return (
                          <TableRow key={line.id}>
                            <TableCell className="font-medium text-foreground">
                              {desc}
                            </TableCell>
                            <TableCell className="text-end font-mono text-xs tabular-nums">
                              {line.qtyMilli / 1000}
                            </TableCell>
                            <TableCell className="text-end font-mono text-xs tabular-nums">
                              {formatMoney(
                                line.unitPriceMinor,
                                currency,
                                user.locale,
                              )}
                            </TableCell>
                            <TableCell className="text-end font-semibold tabular-nums">
                              {formatMoney(
                                line.lineTotalMinor,
                                currency,
                                user.locale,
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {invoice.notesAr || invoice.notesEn || paymentInstructions ? (
            <Card>
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <FileText size={18} className="text-primary" aria-hidden="true" />
                  <span>{t("notes")}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {invoice.notesAr ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">{t("notesAr")}</span>
                    <p className="rounded border border-border/60 bg-muted/20 p-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed" dir="rtl">
                      {invoice.notesAr}
                    </p>
                  </div>
                ) : null}
                {invoice.notesEn ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">{t("notesEn")}</span>
                    <p className="rounded border border-border/60 bg-muted/20 p-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed" dir="ltr">
                      {invoice.notesEn}
                    </p>
                  </div>
                ) : null}
                {paymentInstructions ? (
                  <div className="flex flex-col gap-1 border-t border-border/40 pt-3">
                    <span className="text-xs font-medium text-muted-foreground">{t("paymentInstructions")}</span>
                    <p className="rounded border border-border/60 bg-muted/20 p-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {paymentInstructions}
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="flex flex-col gap-6 lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <Wallet size={18} className="text-primary" aria-hidden="true" />
                <span>{t("summary")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-2 rounded border border-border bg-surface p-3.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{t("paid")}</span>
                  <span className="font-semibold text-foreground">
                    {formatMoney(invoice.paidMinor, currency, user.locale)} /{" "}
                    {formatMoney(invoice.totalMinor, currency, user.locale)}
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{ width: `${percentPaid}%` }}
                  />
                </div>
                <div className="flex items-center justify-between border-t border-border/50 pt-2 text-xs">
                  <span className="text-muted-foreground">{t("balance")}</span>
                  <span className="font-bold text-foreground tabular-nums">
                    {formatMoney(
                      invoice.totalMinor - invoice.paidMinor,
                      currency,
                      user.locale,
                    )}
                  </span>
                </div>
              </div>

              <dl className="flex flex-col gap-2 text-sm">
                <Money
                  label={t("subtotal")}
                  value={formatMoney(
                    invoice.subtotalMinor,
                    currency,
                    user.locale,
                  )}
                />
                {invoice.discountMinor > 0 ? (
                  <Money
                    label={t("discount")}
                    value={`-${formatMoney(
                      invoice.discountMinor,
                      currency,
                      user.locale,
                    )}`}
                  />
                ) : null}
                <Money
                  label={t("net")}
                  value={formatMoney(invoice.netMinor, currency, user.locale)}
                />
                <Money
                  label={t("tax")}
                  value={formatMoney(invoice.taxMinor, currency, user.locale)}
                />
                <div className="my-1 border-t border-border" />
                <Money
                  label={t("total")}
                  value={formatMoney(invoice.totalMinor, currency, user.locale)}
                  strong
                />
                <Money
                  label={t("paid")}
                  value={formatMoney(invoice.paidMinor, currency, user.locale)}
                />
                <Money
                  label={t("balance")}
                  value={formatMoney(
                    invoice.totalMinor - invoice.paidMinor,
                    currency,
                    user.locale,
                  )}
                  strong
                />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <FolderKanban
                  size={18}
                  className="text-primary"
                  aria-hidden="true"
                />
                <span>{t("metaTitle")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {project ? (
                <div className="flex flex-col gap-1 rounded-lg border border-border/70 bg-card p-3 transition-colors hover:border-primary/40">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("project")}
                  </span>
                  <Link
                    href={`/projects/${project.id}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-foreground transition-colors hover:text-primary"
                  >
                    <FolderKanban className="h-4 w-4 text-primary/70 shrink-0" aria-hidden="true" />
                    <span>
                      {(locale === "ar"
                        ? project.nameAr || project.nameEn
                        : project.nameEn || project.nameAr) ?? project.code}
                    </span>
                    {project.code && (project.nameAr || project.nameEn) ? (
                      <span className="font-mono text-xs text-muted-foreground font-normal" dir="ltr">
                        ({project.code})
                      </span>
                    ) : null}
                  </Link>
                </div>
              ) : null}

              {client ? (
                <div className="flex flex-col gap-1 rounded-lg border border-border/70 bg-card p-3 transition-colors hover:border-primary/40">
                  <span className="text-xs font-medium text-muted-foreground">
                    {t("client")}
                  </span>
                  <Link
                    href={`/clients/${client.id}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-foreground transition-colors hover:text-primary"
                  >
                    <Building2 className="h-4 w-4 text-primary/70 shrink-0" aria-hidden="true" />
                    <span>
                      {(locale === "ar"
                        ? client.nameAr || client.nameEn
                        : client.nameEn || client.nameAr) ?? ""}
                    </span>
                  </Link>
                </div>
              ) : null}

              <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                <span>{t("currency")}</span>
                <span className="font-mono font-semibold text-foreground">
                  {invoice.currency}
                </span>
              </div>
              <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                <span>{t("languageMode")}</span>
                <span className="font-semibold text-foreground">
                  {t(`languageModes.${invoice.languageMode}`)}
                </span>
              </div>
              <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                <span>{t("dueDate")}</span>
                <span className="font-semibold text-foreground">
                  {invoice.dueDate ?? "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <CreditCard
                  size={18}
                  className="text-primary"
                  aria-hidden="true"
                />
                <span>{t("paymentsTitle")}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  ({payments.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <EmptyState title={t("noPayments")} />
              ) : (
                <div className="flex flex-col gap-3">
                  {payments.some((p) => p.voidedAt === null) && can(user, "invoices.read") ? (
                    <a
                      href={`/api/invoices/${invoice.id}/receipt/pdf?inline=1`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full"
                    >
                      <button
                        type="button"
                        className="flex w-full items-center justify-center gap-1.5 rounded border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-semibold text-primary transition-colors hover:bg-primary/20 cursor-pointer"
                      >
                        <Receipt className="h-3.5 w-3.5" />
                        <span>{t("viewReceiptPdf")}</span>
                      </button>
                    </a>
                  ) : null}
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex flex-col gap-1.5 rounded border border-border bg-surface p-3 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">
                          {formatMoney(
                            payment.amountMinor,
                            currency,
                            user.locale,
                          )}
                        </span>
                        <span className="font-mono text-muted-foreground">
                          {payment.paidOn}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>{t(`methods.${payment.method}`)}</span>
                        {payment.reference ? (
                          <span className="font-mono">{payment.reference}</span>
                        ) : null}
                      </div>
                      <div className="flex justify-end pt-1">
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
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
