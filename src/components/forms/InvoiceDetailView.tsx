// Dossier - Invoice Detail View Forms Component
// https://github.com/red-shadows-rs/dossier

"use client";

import React, { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Building2,
  Calendar,
  Check,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  FileText,
  FolderKanban,
  ListOrdered,
  Receipt,
  Wallet,
} from "lucide-react";
import {
  InvoiceActions,
  VoidPaymentButton,
} from "@/components/forms/InvoiceActions";
import { InvoiceDocumentViewer } from "@/components/forms/InvoiceDocumentViewer";
import { Badge, invoiceStatusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
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
import { UrlTabs } from "@/components/ui/UrlTabs";
import { cn } from "@/components/ui/cn";
import type { CurrencyCode } from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import {
  parsePaymentInstructionsToCards,
  stripPaymentMetadata,
  type PaymentCardData,
} from "@/lib/payment-methods";
import type { BankAccount } from "@/lib/validation/settings";
import type {
  clients,
  invoiceLines,
  invoices,
  payments as paymentsTable,
  projects,
} from "@/db/schema";

type InvoiceRow = typeof invoices.$inferSelect;
type LineRow = typeof invoiceLines.$inferSelect;
type PaymentRow = typeof paymentsTable.$inferSelect;
type ProjectRow = typeof projects.$inferSelect;
type ClientRow = typeof clients.$inferSelect;

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

interface InvoiceDetailViewProps {
  invoice: InvoiceRow;
  lines: LineRow[];
  payments: PaymentRow[];
  project?: ProjectRow | null;
  client?: ClientRow | null;
  canWrite: boolean;
  canIssue: boolean;
  canVoid: boolean;
  canPay: boolean;
  canRead: boolean;
  canVoidPayment: boolean;
  paymentInstructions: string;
  companyAccounts?: BankAccount[];
  overdue: boolean;
  locale: "ar" | "en";
}

export function InvoiceDetailView({
  invoice,
  lines,
  payments,
  project,
  client,
  canWrite,
  canIssue,
  canVoid,
  canPay,
  canRead,
  canVoidPayment,
  paymentInstructions,
  companyAccounts,
  overdue,
  locale,
}: InvoiceDetailViewProps) {
  const t = useTranslations("invoices");

  const paymentCards = useMemo(
    () =>
      parsePaymentInstructionsToCards(
        paymentInstructions,
        companyAccounts,
        locale,
      ),
    [paymentInstructions, companyAccounts, locale],
  );

  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "preview";
  const [, setActiveTab] = useState(currentTab);

  const currency = invoice.currency as CurrencyCode;
  const percentPaid = Math.min(
    100,
    Math.round((invoice.paidMinor / (invoice.totalMinor || 1)) * 100),
  );

  const clientName =
    (locale === "ar"
      ? client?.nameAr || client?.nameEn
      : client?.nameEn || client?.nameAr) ?? "";

  const projectName =
    (locale === "ar"
      ? project?.nameAr || project?.nameEn
      : project?.nameEn || project?.nameAr) ?? project?.code;

  const tabs = [
    {
      id: "preview",
      label: t("tabs.preview"),
      icon: FileText,
    },
    {
      id: "details",
      label: t("tabs.details"),
      icon: ListOrdered,
      badge: lines.length,
    },
    {
      id: "payments",
      label: t("tabs.payments"),
      icon: CreditCard,
      badge: payments.length,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <Link
            href="/invoices"
            className="hover:text-foreground transition-colors"
          >
            {t("title")}
          </Link>
          <span className="text-border">/</span>
          <span className={cn("text-foreground font-medium", invoice.number ? "font-mono" : "font-sans")}>
            {invoice.number ?? t("draftTitle")}
          </span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary">
              <Receipt size={20} aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className={cn("text-xl sm:text-2xl font-bold tracking-tight text-foreground", invoice.number ? "font-mono" : "font-sans")}>
                  {invoice.number ?? t("draftTitle")}
                </h1>
                <Badge
                  tone={invoiceStatusTone(invoice.status, overdue)}
                  className="translate-y-0.5"
                >
                  {overdue ? t("overdue") : t(`status.${invoice.status}`)}
                </Badge>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {invoice.issueDate && (
                  <span className="inline-flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>{t("issueDate")}:</span>
                    <span dir="ltr" className="font-mono text-foreground">
                      {invoice.issueDate}
                    </span>
                  </span>
                )}
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
                    <span className="text-muted-foreground">
                      {t("noDueDate")}
                    </span>
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
            canWrite={canWrite}
            canIssue={canIssue}
            canVoid={canVoid}
            canPay={canPay}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded border border-border bg-card p-3 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">
            {t("total")}
          </span>
          <span className="text-lg font-bold font-mono tabular-nums text-foreground truncate">
            {formatMoney(invoice.totalMinor, currency, locale)}
          </span>
        </div>

        <div className="flex flex-col gap-1 rounded border border-border bg-card p-3 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">
            {t("paid")}
          </span>
          <span className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 truncate">
            {formatMoney(invoice.paidMinor, currency, locale)}
          </span>
        </div>

        <div className="flex flex-col gap-1 rounded border border-border bg-card p-3 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">
            {t("balance")}
          </span>
          <span className="text-lg font-bold font-mono tabular-nums text-foreground truncate">
            {formatMoney(
              invoice.totalMinor - invoice.paidMinor,
              currency,
              locale,
            )}
          </span>
        </div>

        <div className="flex flex-col gap-1 rounded border border-border bg-card p-3 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">
            {t("paymentsTitle")}
          </span>
          <span className="text-lg font-bold font-mono tabular-nums text-foreground">
            {payments.length}
          </span>
        </div>
      </div>

      <UrlTabs tabs={tabs} defaultTab="preview" onChange={setActiveTab} />

      <div className={currentTab === "preview" ? "block space-y-6" : "hidden"}>
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
              canDownload={canRead}
              hasPayments={payments.some((p) => p.voidedAt === null)}
            />
          </CardContent>
        </Card>
      </div>

      <div className={currentTab === "details" ? "block space-y-6" : "hidden"}>
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-8">
            <Card>
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <ListOrdered
                    size={18}
                    className="text-primary"
                    aria-hidden="true"
                  />
                  <span>{t("linesTitle")}</span>
                  <span className="text-xs font-normal text-muted-foreground font-mono">
                    ({lines.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {lines.length === 0 ? (
                  <EmptyState title={t("noLines")} />
                ) : (
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableHeaderCell>
                            {t("lineDescription")}
                          </TableHeaderCell>
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
                            locale === "ar"
                              ? (line.descriptionAr ??
                                line.descriptionEn ??
                                "-")
                              : (line.descriptionEn ??
                                line.descriptionAr ??
                                "-");
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
                                  locale,
                                )}
                              </TableCell>
                              <TableCell className="text-end font-semibold tabular-nums font-mono">
                                {formatMoney(
                                  line.lineTotalMinor,
                                  currency,
                                  locale,
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

            {(invoice.notesAr || invoice.notesEn || paymentInstructions) && (
              <Card>
                <CardHeader>
                  <CardTitle className="inline-flex items-center gap-2">
                    <FileText
                      size={18}
                      className="text-primary"
                      aria-hidden="true"
                    />
                    <span>{t("notes")}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {invoice.notesAr && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {t("notesAr")}
                      </span>
                      <p
                        className="rounded border border-border/60 bg-muted/20 p-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed"
                        dir="rtl"
                      >
                        {invoice.notesAr}
                      </p>
                    </div>
                  )}
                  {invoice.notesEn && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-muted-foreground">
                        {t("notesEn")}
                      </span>
                      <p
                        className="rounded border border-border/60 bg-muted/20 p-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed"
                        dir="ltr"
                      >
                        {invoice.notesEn}
                      </p>
                    </div>
                  )}
                  {paymentInstructions && (
                    <div className="flex flex-col gap-2.5 border-t border-border/40 pt-3">
                      <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <CreditCard className="h-3.5 w-3.5 text-primary" />
                        <span>{t("paymentInstructions")}</span>
                      </span>
                      {paymentCards.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-1">
                          {paymentCards.map((card, idx) => (
                            <PaymentCardItem key={idx} card={card} />
                          ))}
                        </div>
                      ) : (
                        <p className="rounded border border-border/60 bg-muted/20 p-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                          {stripPaymentMetadata(paymentInstructions)}
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="flex flex-col gap-6 lg:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <Wallet
                    size={18}
                    className="text-primary"
                    aria-hidden="true"
                  />
                  <span>{t("summary")}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-2 rounded-lg border border-border/80 bg-muted/20 p-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">{t("paid")}</span>
                    <span className="font-semibold text-foreground font-mono">
                      {formatMoney(invoice.paidMinor, currency, locale)} /{" "}
                      {formatMoney(invoice.totalMinor, currency, locale)}
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
                    <span className="font-bold text-foreground font-mono tabular-nums">
                      {formatMoney(
                        invoice.totalMinor - invoice.paidMinor,
                        currency,
                        locale,
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
                      locale,
                    )}
                  />
                  {invoice.discountMinor > 0 && (
                    <Money
                      label={t("discount")}
                      value={`-${formatMoney(
                        invoice.discountMinor,
                        currency,
                        locale,
                      )}`}
                    />
                  )}
                  <Money
                    label={t("net")}
                    value={formatMoney(invoice.netMinor, currency, locale)}
                  />
                  <Money
                    label={t("tax")}
                    value={formatMoney(invoice.taxMinor, currency, locale)}
                  />
                  <div className="my-1 border-t border-border" />
                  <Money
                    label={t("total")}
                    value={formatMoney(invoice.totalMinor, currency, locale)}
                    strong
                  />
                  <Money
                    label={t("paid")}
                    value={formatMoney(invoice.paidMinor, currency, locale)}
                  />
                  <Money
                    label={t("balance")}
                    value={formatMoney(
                      invoice.totalMinor - invoice.paidMinor,
                      currency,
                      locale,
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
                {project && (
                  <div className="flex flex-col gap-1 rounded-lg border border-border/70 bg-card p-3 transition-colors hover:border-primary/40">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("project")}
                    </span>
                    <Link
                      href={`/projects/${project.id}`}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-foreground transition-colors hover:text-primary"
                    >
                      <FolderKanban
                        className="h-4 w-4 text-primary/70 shrink-0"
                        aria-hidden="true"
                      />
                      <span>{projectName}</span>
                      {project.code && (project.nameAr || project.nameEn) && (
                        <span
                          className="font-mono text-xs text-muted-foreground font-normal"
                          dir="ltr"
                        >
                          ({project.code})
                        </span>
                      )}
                    </Link>
                  </div>
                )}

                {client && (
                  <div className="flex flex-col gap-1 rounded-lg border border-border/70 bg-card p-3 transition-colors hover:border-primary/40">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("client")}
                    </span>
                    <Link
                      href={`/clients/${client.id}`}
                      className="inline-flex items-center gap-2 text-sm font-semibold text-foreground transition-colors hover:text-primary"
                    >
                      <Building2
                        className="h-4 w-4 text-primary/70 shrink-0"
                        aria-hidden="true"
                      />
                      <span>{clientName}</span>
                    </Link>
                    {client.email ? (
                      <span className="text-xs text-muted-foreground font-mono" dir="ltr">
                        {client.email}
                      </span>
                    ) : null}
                    {client.phone ? (
                      <span className="text-xs text-muted-foreground font-mono" dir="ltr">
                        {client.phone}
                      </span>
                    ) : null}
                  </div>
                )}

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
                  <span className="font-semibold text-foreground font-mono">
                    {invoice.dueDate ?? "—"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className={currentTab === "payments" ? "block space-y-6" : "hidden"}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="inline-flex items-center gap-2">
              <CreditCard
                size={18}
                className="text-primary"
                aria-hidden="true"
              />
              <span>{t("paymentsTitle")}</span>
              <span className="text-xs font-normal text-muted-foreground font-mono">
                ({payments.length})
              </span>
            </CardTitle>
            {payments.some((p) => p.voidedAt === null) && canRead && (
              <a
                href={`/api/invoices/${invoice.id}/receipt/pdf?inline=1`}
                target="_blank"
                rel="noreferrer"
              >
                <Button variant="secondary" className="gap-1.5 font-medium shadow-xs">
                  <Receipt size={15} />
                  <span>{t("viewReceiptPdf")}</span>
                </Button>
              </a>
            )}
          </CardHeader>
          <CardContent>
            {payments.length === 0 ? (
              <EmptyState title={t("noPayments")} />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex flex-col justify-between gap-3 rounded-lg border border-border/70 bg-card p-4 transition-all duration-150 hover:border-primary/40 shadow-xs"
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-bold font-mono text-foreground">
                          {formatMoney(payment.amountMinor, currency, locale)}
                        </span>
                        <span className="font-mono text-xs text-muted-foreground">
                          {payment.paidOn}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{t(`methods.${payment.method}`)}</span>
                        {payment.reference && (
                          <span className="font-mono">{payment.reference}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-border/40">
                      {payment.voidedAt === null &&
                      canVoidPayment &&
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
  );
}

function PaymentCardItem({ card }: { card: PaymentCardData }) {
  const t = useTranslations("invoices");
  const [copied, setCopied] = useState<string | null>(null);

  function copy(val: string, key: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(val);
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    }
  }

  const isBinance = card.provider === "binance";
  const isPaypal = card.provider === "paypal";

  return (
    <div className="flex flex-col rounded-lg border border-border/70 bg-surface/50 p-3.5 gap-2.5 shadow-2xs transition-all hover:border-border">
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-card p-1 shadow-2xs">
            {card.icon ? (
              <Image
                src={card.icon}
                alt={card.bankName}
                width={26}
                height={26}
                unoptimized
                className="max-h-6 max-w-6 object-contain"
              />
            ) : (
              <Building2 className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          <div className="flex flex-col min-w-0 flex-1">
            <span className="text-xs font-bold text-foreground truncate">
              {card.bankName}
            </span>
            {card.accountHolder ? (
              <span className="text-[11px] text-muted-foreground truncate">
                <span className="text-muted-foreground/70">{t("beneficiary")}:</span> {card.accountHolder}
              </span>
            ) : null}
          </div>
        </div>

        {card.currency ? (
          <Badge tone="gray" className="text-[10px] px-2 py-0.5 font-mono shrink-0">
            {card.currency}
          </Badge>
        ) : null}
      </div>

      {isBinance ? (
        <div className="flex flex-col gap-1.5">
          {card.binanceUid ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-background/50 px-2.5 py-1.5 text-xs">
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[10px] text-muted-foreground font-medium">
                  Binance UID
                </span>
                <span className="font-mono font-semibold text-foreground truncate" dir="ltr">
                  {card.binanceUid}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copy(card.binanceUid ?? "", "uid")}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border/60 bg-card hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={copied === "uid" ? t("copiedToClipboard") : t("copy")}
              >
                {copied === "uid" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ) : null}

          {card.username ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-border/40 bg-background/30 px-2.5 py-1 text-xs">
              <span className="text-[10px] text-muted-foreground font-medium">
                Handle:
              </span>
              <span className="font-mono text-xs font-semibold text-foreground" dir="ltr">
                {card.username.startsWith("@") ? card.username : `@${card.username}`}
              </span>
            </div>
          ) : null}

          {card.identifierValue && card.identifierValue !== card.binanceUid ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-background/50 px-2.5 py-1.5 text-xs">
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[10px] text-muted-foreground font-medium">
                  {card.network ? `Wallet (${card.network})` : card.identifierLabel}
                </span>
                <span className="font-mono font-semibold text-foreground truncate" dir="ltr">
                  {card.identifierValue}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copy(card.identifierValue, "wallet")}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border/60 bg-card hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={copied === "wallet" ? t("copiedToClipboard") : t("copy")}
              >
                {copied === "wallet" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ) : null}
        </div>
      ) : isPaypal ? (
        <div className="flex flex-col gap-1.5">
          {card.identifierValue ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-background/50 px-2.5 py-1.5 text-xs">
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[10px] text-muted-foreground font-medium">
                  PayPal Email
                </span>
                <span className="font-mono font-semibold text-foreground truncate" dir="ltr">
                  {card.identifierValue}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copy(card.identifierValue, "email")}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border/60 bg-card hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={copied === "email" ? t("copiedToClipboard") : t("copy")}
              >
                {copied === "email" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ) : null}

          {card.username ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-border/40 bg-background/30 px-2.5 py-1 text-xs">
              <span className="text-[10px] text-muted-foreground font-medium">
                Username:
              </span>
              <span className="font-mono text-xs font-semibold text-foreground" dir="ltr">
                {card.username.startsWith("@") ? card.username : `@${card.username}`}
              </span>
            </div>
          ) : null}

          {card.paymentUrl ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-primary/5 px-2.5 py-1.5 text-xs">
              <span className="text-[10px] text-primary font-medium">
                PayPal.Me
              </span>
              <a
                href={
                  card.paymentUrl.startsWith("http://") || card.paymentUrl.startsWith("https://")
                    ? card.paymentUrl
                    : `https://${card.paymentUrl}`
                }
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-1 font-mono text-xs text-primary font-semibold hover:underline"
                dir="ltr"
              >
                <span>{card.paymentUrl}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          {card.identifierValue ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-border/50 bg-background/50 px-2.5 py-1.5 text-xs">
              <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[10px] text-muted-foreground font-medium">
                  {card.identifierLabel}
                </span>
                <span className="font-mono font-semibold text-foreground truncate" dir="ltr">
                  {card.identifierValue}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copy(card.identifierValue, "id")}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded border border-border/60 bg-card hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={copied === "id" ? t("copiedToClipboard") : t("copy")}
              >
                {copied === "id" ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Copy className="h-3.5 w-3.5" />
                )}
              </button>
            </div>
          ) : null}

          {card.swift ? (
            <div className="flex items-center justify-between gap-2 rounded-md border border-border/40 bg-background/30 px-2.5 py-1 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-muted-foreground font-medium">
                  {t("swiftLabel")}:
                </span>
                <span className="font-mono text-xs font-semibold text-foreground" dir="ltr">
                  {card.swift}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (card.swift) copy(card.swift, "swift");
                }}
                className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                title={copied === "swift" ? t("copiedToClipboard") : t("copy")}
              >
                {copied === "swift" ? (
                  <Check className="h-3 w-3 text-emerald-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
