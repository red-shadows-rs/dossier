// Dossier - Subscription Detail View Component
// https://github.com/red-shadows-rs/dossier

"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Ban,
  Building2,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Clock,
  Copy,
  CreditCard,
  ExternalLink,
  FolderKanban,
  ListOrdered,
  Mail,
  Pause,
  Pencil,
  Phone,
  Play,
  Receipt,
  Wallet,
} from "lucide-react";
import { PaymentCardItem } from "@/components/forms/PaymentCardItem";
import { Badge, invoiceStatusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { useToast } from "@/components/ui/Toast";
import type { CurrencyCode } from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import { parsePaymentInstructionsToCards } from "@/lib/payment-methods";
import { subscriptionStatusTone } from "@/lib/subscriptions";
import type { BankAccount } from "@/lib/validation/settings";
import {
  cancelSubscriptionAction,
  duplicateSubscriptionAction,
  generateSubscriptionInvoiceAction,
  pauseSubscriptionAction,
  resumeSubscriptionAction,
} from "@/server/actions/subscriptions";
import type {
  clients,
  projects,
  subscriptionItems,
  subscriptions,
} from "@/db/schema";

type SubscriptionRow = typeof subscriptions.$inferSelect;
type ItemRow = typeof subscriptionItems.$inferSelect;
type ClientRow = typeof clients.$inferSelect;
type ProjectRow = typeof projects.$inferSelect;

interface InvoiceSummary {
  id: string;
  number: string | null;
  status: string;
  issueDate: string | null;
  dueDate: string | null;
  totalMinor: number;
  paidMinor: number;
  currency: string;
  createdAt: number;
}

interface SubscriptionDetailViewProps {
  subscription: SubscriptionRow;
  client: ClientRow | null;
  project: ProjectRow | null;
  items: ItemRow[];
  invoices: InvoiceSummary[];
  canWrite: boolean;
  canPause: boolean;
  canCancel: boolean;
  canGenerateInvoice: boolean;
  companyAccounts?: BankAccount[];
  locale: "ar" | "en";
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
      <dd
        className={
          strong
            ? "font-semibold tabular-nums text-foreground font-mono"
            : "tabular-nums text-foreground font-mono"
        }
      >
        {value}
      </dd>
    </div>
  );
}

export function SubscriptionDetailView({
  subscription,
  client,
  project,
  items,
  invoices,
  canWrite,
  canPause,
  canCancel,
  canGenerateInvoice,
  companyAccounts,
  locale,
}: SubscriptionDetailViewProps) {
  const t = useTranslations("subscriptions");
  const tInv = useTranslations("invoices");
  const tCommon = useTranslations("common");
  const toast = useToast();
  const router = useRouter();

  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<
    "generate" | "pause" | "resume" | "cancel" | "duplicate" | null
  >(null);

  const currency = subscription.currency as CurrencyCode;

  const clientName =
    (locale === "ar"
      ? client?.nameAr || client?.nameEn
      : client?.nameEn || client?.nameAr) ?? "";

  const projectName =
    (locale === "ar"
      ? project?.nameAr || project?.nameEn
      : project?.nameEn || project?.nameAr) ?? project?.code;

  const title =
    (locale === "ar"
      ? subscription.titleAr || subscription.titleEn
      : subscription.titleEn || subscription.titleAr) ||
    subscription.titleAr ||
    subscription.titleEn;

  const paymentCards = useMemo(
    () =>
      parsePaymentInstructionsToCards(
        subscription.paymentInstructionsAr || "",
        companyAccounts,
        locale,
      ),
    [subscription.paymentInstructionsAr, companyAccounts, locale],
  );

  async function handleGenerateNow() {
    setPendingAction("generate");
    const res = await generateSubscriptionInvoiceAction(subscription.id);
    setPendingAction(null);
    setConfirmDialog(null);

    if (res.ok) {
      toast({
        title: t("invoiceGeneratedSuccess"),
        tone: "success",
      });
      router.refresh();
    } else {
      toast({
        title: tCommon(`errors.${res.error.code}`),
        tone: "error",
      });
    }
  }

  async function handlePause() {
    setPendingAction("pause");
    const res = await pauseSubscriptionAction(subscription.id);
    setPendingAction(null);
    setConfirmDialog(null);

    if (res.ok) {
      toast({
        title: t("pausedSuccess"),
        tone: "success",
      });
      router.refresh();
    } else {
      toast({
        title: tCommon(`errors.${res.error.code}`),
        tone: "error",
      });
    }
  }

  async function handleResume() {
    setPendingAction("resume");
    const res = await resumeSubscriptionAction(subscription.id);
    setPendingAction(null);
    setConfirmDialog(null);

    if (res.ok) {
      toast({
        title: t("resumedSuccess"),
        tone: "success",
      });
      router.refresh();
    } else {
      toast({
        title: tCommon(`errors.${res.error.code}`),
        tone: "error",
      });
    }
  }

  async function handleCancel() {
    setPendingAction("cancel");
    const res = await cancelSubscriptionAction(subscription.id);
    setPendingAction(null);
    setConfirmDialog(null);

    if (res.ok) {
      toast({
        title: t("cancelledSuccess"),
        tone: "success",
      });
      router.refresh();
    } else {
      toast({
        title: tCommon(`errors.${res.error.code}`),
        tone: "error",
      });
    }
  }

  async function handleDuplicate() {
    setPendingAction("duplicate");
    const res = await duplicateSubscriptionAction({ id: subscription.id });
    setPendingAction(null);
    setConfirmDialog(null);

    if (res.ok) {
      toast({
        title: t("duplicatedToast"),
        tone: "success",
      });
      router.push(`/subscriptions/${res.data.id}/edit`);
    } else {
      toast({
        title: tCommon(`errors.${res.error.code}`),
        tone: "error",
      });
    }
  }

  const frequencyLabel =
    subscription.frequency === "custom"
      ? `${subscription.intervalCount} ${t("frequencies.custom")}`
      : t(`frequencies.${subscription.frequency}`);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 rounded-xl border border-border/80 bg-card p-5 sm:p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="font-mono text-sm font-bold text-muted-foreground">
                {subscription.number}
              </span>
              <Badge tone={subscriptionStatusTone(subscription.status)}>
                {t(`statuses.${subscription.status}`)}
              </Badge>
              <Badge tone="gray" className="font-mono text-xs">
                {frequencyLabel}
              </Badge>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground truncate">
              {title}
            </h1>
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              {client ? (
                <Link
                  href={`/clients/${client.id}`}
                  className="inline-flex items-center gap-1.5 hover:text-foreground hover:underline transition-colors"
                >
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  <span>{clientName}</span>
                </Link>
              ) : null}
              {project ? (
                <Link
                  href={`/projects/${project.id}`}
                  className="inline-flex items-center gap-1.5 hover:text-foreground hover:underline transition-colors"
                >
                  <FolderKanban className="h-3.5 w-3.5 text-primary" />
                  <span>{projectName}</span>
                </Link>
              ) : null}
              <span className="inline-flex items-center gap-1.5 font-mono">
                <Calendar className="h-3.5 w-3.5" />
                <span>
                  {t("startDate")}: {subscription.startDate}
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap sm:justify-end">
            {canGenerateInvoice && subscription.status === "active" ? (
              <Button
                variant="primary"
                onClick={() => setConfirmDialog("generate")}
                disabled={Boolean(pendingAction)}
                className="gap-1.5 shadow-sm"
              >
                <Receipt className="h-4 w-4" />
                <span>{t("generateNow")}</span>
              </Button>
            ) : null}

            {canWrite ? (
              <Link href={`/subscriptions/${subscription.id}/edit`}>
                <Button variant="secondary" className="gap-1.5">
                  <Pencil className="h-4 w-4" />
                  <span>{t("edit")}</span>
                </Button>
              </Link>
            ) : null}

            {canWrite ? (
              <Button
                variant="secondary"
                onClick={() => setConfirmDialog("duplicate")}
                disabled={Boolean(pendingAction)}
                className="gap-1.5"
              >
                <Copy className="h-4 w-4" />
                <span>{t("duplicate")}</span>
              </Button>
            ) : null}

            {canPause && subscription.status === "active" ? (
              <Button
                variant="secondary"
                onClick={() => setConfirmDialog("pause")}
                disabled={Boolean(pendingAction)}
                className="gap-1.5 text-amber-600 dark:text-amber-400"
              >
                <Pause className="h-4 w-4" />
                <span>{t("pause")}</span>
              </Button>
            ) : null}

            {canPause && subscription.status === "paused" ? (
              <Button
                variant="secondary"
                onClick={() => setConfirmDialog("resume")}
                disabled={Boolean(pendingAction)}
                className="gap-1.5 text-emerald-600 dark:text-emerald-400"
              >
                <Play className="h-4 w-4" />
                <span>{t("resume")}</span>
              </Button>
            ) : null}

            {canCancel &&
            (subscription.status === "active" ||
              subscription.status === "paused") ? (
              <Button
                variant="danger"
                onClick={() => setConfirmDialog("cancel")}
                disabled={Boolean(pendingAction)}
                className="gap-1.5"
              >
                <Ban className="h-4 w-4" />
                <span>{t("cancel")}</span>
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded-xl border border-border/70 bg-card p-4 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">
            {t("total")}
          </span>
          <span className="text-xl font-bold font-mono tabular-nums text-foreground truncate">
            {formatMoney(subscription.totalMinor, currency, locale)}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {frequencyLabel}
          </span>
        </div>

        <div className="flex flex-col gap-1 rounded-xl border border-border/70 bg-card p-4 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">
            {t("nextRunDate")}
          </span>
          <span className="text-lg font-bold font-mono tabular-nums text-foreground truncate flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4 text-primary shrink-0" />
            <span>{subscription.nextRunDate}</span>
          </span>
          <span className="text-[11px] text-muted-foreground">
            {subscription.status === "active"
              ? subscription.autoIssueInvoice
                ? t("autoIssue")
                : t("statuses.active")
              : t(`statuses.${subscription.status}`)}
          </span>
        </div>

        <div className="flex flex-col gap-1 rounded-xl border border-border/70 bg-card p-4 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">
            {t("invoicesCount")}
          </span>
          <span className="text-xl font-bold font-mono tabular-nums text-foreground">
            {subscription.invoicesCount}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {subscription.lastRunDate
              ? `${t("lastRunDate")}: ${subscription.lastRunDate}`
              : t("empty")}
          </span>
        </div>

        <div className="flex flex-col gap-1 rounded-xl border border-border/70 bg-card p-4 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">
            {t("settingsTitle")}
          </span>
          <div className="flex flex-col gap-0.5 text-xs text-foreground mt-0.5">
            <span className="flex items-center gap-1.5 text-[11px]">
              <CheckCircle2
                className={`h-3.5 w-3.5 ${
                  subscription.autoIssueInvoice ? "text-emerald-500" : "text-muted-foreground/40"
                }`}
              />
              <span>{subscription.autoIssueInvoice ? t("autoIssue") : t("autoIssueDraft")}</span>
            </span>
            <span className="flex items-center gap-1.5 text-[11px]">
              <Mail
                className={`h-3.5 w-3.5 ${
                  subscription.autoSendEmail ? "text-emerald-500" : "text-muted-foreground/40"
                }`}
              />
              <span>{subscription.autoSendEmail ? t("emailEnabled") : t("emailDisabled")}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <ListOrdered size={18} className="text-primary" aria-hidden="true" />
                <span>{t("items")}</span>
                <span className="text-xs font-normal text-muted-foreground font-mono">
                  ({items.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>{t("description")}</TableHeaderCell>
                      <TableHeaderCell className="text-end">{t("quantity")}</TableHeaderCell>
                      <TableHeaderCell className="text-end">{t("unitPrice")}</TableHeaderCell>
                      <TableHeaderCell className="text-end">{t("total")}</TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {items.map((item) => {
                      const desc =
                        locale === "ar"
                          ? (item.descriptionAr ?? item.descriptionEn ?? "-")
                          : (item.descriptionEn ?? item.descriptionAr ?? "-");
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium text-foreground">
                            {desc}
                          </TableCell>
                          <TableCell className="text-end font-mono text-xs tabular-nums">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-end font-mono text-xs tabular-nums">
                            {formatMoney(item.unitPriceMinor, currency, locale)}
                          </TableCell>
                          <TableCell className="text-end font-semibold tabular-nums font-mono">
                            {formatMoney(item.totalMinor, currency, locale)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <CalendarClock size={18} className="text-primary" aria-hidden="true" />
                <span>{t("invoicesHistory")}</span>
                <span className="text-xs font-normal text-muted-foreground font-mono">
                  ({invoices.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoices.length === 0 ? (
                <EmptyState
                  title={tInv("empty")}
                  description={t("noInvoicesYet")}
                />
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>{tInv("number")}</TableHeaderCell>
                        <TableHeaderCell>{tInv("issueDate")}</TableHeaderCell>
                        <TableHeaderCell>{tInv("dueDate")}</TableHeaderCell>
                        <TableHeaderCell className="text-end">{tInv("total")}</TableHeaderCell>
                        <TableHeaderCell className="text-center">{tInv("status")}</TableHeaderCell>
                        <TableHeaderCell className="text-end"></TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {invoices.map((inv) => (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono font-medium">
                            <Link
                              href={`/invoices/${inv.id}`}
                              className="text-primary hover:underline"
                            >
                              {inv.number}
                            </Link>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {inv.issueDate}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {inv.dueDate || "-"}
                          </TableCell>
                          <TableCell className="text-end font-mono font-semibold text-sm">
                            {formatMoney(inv.totalMinor, inv.currency as CurrencyCode, locale)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge tone={invoiceStatusTone(inv.status)}>
                              {tInv(`statuses.${inv.status}`)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-end">
                            <Link href={`/invoices/${inv.id}`}>
                              <Button size="sm" variant="ghost" className="gap-1 text-xs">
                                <span>{t("viewInvoice")}</span>
                                <ExternalLink className="h-3.5 w-3.5" />
                              </Button>
                            </Link>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <Wallet size={18} className="text-primary" aria-hidden="true" />
                <span>{t("summary")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <dl className="flex flex-col gap-2 text-sm">
                <Money
                  label={t("subtotal")}
                  value={formatMoney(subscription.subtotalMinor, currency, locale)}
                />
                {subscription.discountMinor > 0 ? (
                  <Money
                    label={t("discount")}
                    value={`-${formatMoney(subscription.discountMinor, currency, locale)}`}
                  />
                ) : null}
                <Money
                  label={t("net")}
                  value={formatMoney(subscription.netMinor, currency, locale)}
                />
                <Money
                  label={t("tax")}
                  value={formatMoney(subscription.taxMinor, currency, locale)}
                />
                <div className="my-1 border-t border-border" />
                <Money
                  label={t("total")}
                  value={formatMoney(subscription.totalMinor, currency, locale)}
                  strong
                />
              </dl>
            </CardContent>
          </Card>

          {client ? (
            <Card>
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="inline-flex items-center gap-2 text-base font-semibold">
                  <Building2 className="h-4 w-4 text-primary" />
                  <span>{t("client")}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex flex-col gap-1">
                  <Link
                    href={`/clients/${client.id}`}
                    className="font-semibold text-foreground hover:text-primary hover:underline transition-colors"
                  >
                    {clientName}
                  </Link>
                  {client.email ? (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />
                      <span>{client.email}</span>
                    </span>
                  ) : null}
                  {client.phone ? (
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />
                      <span dir="ltr">{client.phone}</span>
                    </span>
                  ) : null}
                  {client.taxNumber ? (
                    <span className="text-xs text-muted-foreground">
                      {client.taxNumber}
                    </span>
                  ) : null}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader className="pb-3 border-b border-border/60">
              <CardTitle className="inline-flex items-center gap-2 text-base font-semibold">
                <CreditCard className="h-4 w-4 text-primary" />
                <span>{t("paymentMethods")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3">
              {paymentCards.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {paymentCards.map((card, idx) => (
                    <PaymentCardItem key={idx} card={card} />
                  ))}
                </div>
              ) : subscription.paymentInstructionsAr ? (
                <p className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {subscription.paymentInstructionsAr}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t("noAccountsHint")}
                </p>
              )}
            </CardContent>
          </Card>

          {subscription.notesAr ? (
            <Card>
              <CardHeader className="pb-3 border-b border-border/60">
                <CardTitle className="inline-flex items-center gap-2 text-base font-semibold">
                  <Clock className="h-4 w-4 text-primary" />
                  <span>{t("notes")}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="rounded-lg border border-border/60 bg-muted/20 p-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {subscription.notesAr}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDialog === "generate"}
        onClose={() => setConfirmDialog(null)}
        onConfirm={handleGenerateNow}
        title={t("generateNowConfirmTitle")}
        message={t("generateNowConfirmMsg")}
        confirmLabel={t("generateNow")}
        cancelLabel={tCommon("cancel")}
        pending={pendingAction === "generate"}
        tone="primary"
      />

      <ConfirmDialog
        open={confirmDialog === "pause"}
        onClose={() => setConfirmDialog(null)}
        onConfirm={handlePause}
        title={t("pauseConfirmTitle")}
        message={t("pauseConfirmMsg")}
        confirmLabel={t("pause")}
        cancelLabel={tCommon("cancel")}
        pending={pendingAction === "pause"}
        tone="danger"
      />

      <ConfirmDialog
        open={confirmDialog === "resume"}
        onClose={() => setConfirmDialog(null)}
        onConfirm={handleResume}
        title={t("resumeConfirmTitle")}
        message={t("resumeConfirmMsg")}
        confirmLabel={t("resume")}
        cancelLabel={tCommon("cancel")}
        pending={pendingAction === "resume"}
        tone="primary"
      />

      <ConfirmDialog
        open={confirmDialog === "cancel"}
        onClose={() => setConfirmDialog(null)}
        onConfirm={handleCancel}
        title={t("cancelConfirmTitle")}
        message={t("cancelConfirmMsg")}
        confirmLabel={t("cancel")}
        cancelLabel={tCommon("cancel")}
        pending={pendingAction === "cancel"}
        tone="danger"
      />

      <ConfirmDialog
        open={confirmDialog === "duplicate"}
        onClose={() => setConfirmDialog(null)}
        onConfirm={handleDuplicate}
        title={t("duplicate")}
        message={t("duplicateConfirm")}
        confirmLabel={t("duplicate")}
        cancelLabel={tCommon("cancel")}
        pending={pendingAction === "duplicate"}
        tone="primary"
      />
    </div>
  );
}
