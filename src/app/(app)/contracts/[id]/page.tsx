import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import {
  Building2,
  Calendar,
  Clock,
  FileEdit,
  FileSignature,
  FileText,
  FolderKanban,
  History,
  Layers,
  ListOrdered,
  Receipt,
  ScrollText,
  Wallet,
} from "lucide-react";
import { db } from "@/db";
import { clients, projects } from "@/db/schema";
import { getLocale, getTranslations } from "next-intl/server";
import { ContractDocumentViewer } from "@/components/forms/ContractDocumentViewer";
import { ContractDraftActions } from "@/components/forms/ContractDraftActions";
import { ContractLifecycleActions } from "@/components/forms/ContractLifecycleActions";
import { FinalizeRetryBanner } from "@/components/forms/FinalizeRetryBanner";
import { Badge, contractStatusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { smoothLoading } from "@/lib/smooth-loader";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { cn } from "@/components/ui/cn";
import { formatInstant } from "@/lib/dates";
import { AppError } from "@/lib/errors";
import { isLocale } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import type { CurrencyCode } from "@/lib/constants";
import { can } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { listAuditEntries } from "@/server/services/audit";
import {
  getContractDetail,
  listContractVersions,
} from "@/server/services/contracts";
import { listContractSignatories } from "@/server/services/contracts-lifecycle";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await smoothLoading();
  const user = await requireUserPage();
  const t = await getTranslations("contracts");
  const tc = await getTranslations("common");
  const { id } = await params;

  let detail;
  try {
    detail = getContractDetail(id);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  const { contract, items, milestones, clauses } = detail;
  const project = db
    .select()
    .from(projects)
    .where(eq(projects.id, contract.projectId))
    .get();
  const client = project
    ? db.select().from(clients).where(eq(clients.id, project.clientId)).get()
    : undefined;
  const rawLocale = await getLocale();
  const locale = isLocale(rawLocale) ? rawLocale : "ar";
  const canWrite = can(user, "contracts.write");
  const currency = contract.currency as CurrencyCode;

  const versions = listContractVersions(id);
  const signatories = listContractSignatories(id);
  const history = listAuditEntries({
    entityType: "contract",
    entityId: id,
    page: 1,
  });

  const contractTitle =
    locale === "ar"
      ? (contract.titleAr || contract.titleEn || "-")
      : (contract.titleEn || contract.titleAr || "-");
  const contractDir =
    locale === "ar"
      ? (contract.titleAr ? "rtl" : "ltr")
      : (contract.titleEn ? "ltr" : "rtl");

  const signedCount = signatories.filter((s) => s.status === "signed").length;

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      {/* 1. Header Bar matching Invoices */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <FileText size={20} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {contract.number ?? (contractTitle !== "-" ? contractTitle : t("new"))}
              </h1>
              <Badge tone={contractStatusTone(contract.status)} className="translate-y-0.5">
                {t(`status.${contract.status}`)}
              </Badge>
              {contract.number && contractTitle && contractTitle !== "-" ? (
                <span className="text-sm font-medium text-muted-foreground translate-y-0.5">
                  · <span dir={contractDir}>{contractTitle}</span>
                </span>
              ) : null}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
              {contract.startDate ? (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>{t("startDate")}:</span>
                  <span dir="ltr" className="font-mono text-foreground">
                    {contract.startDate}
                  </span>
                </span>
              ) : null}
              {contract.endDate ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{t("endDate")}:</span>
                  <span dir="ltr" className="font-mono text-foreground">
                    {contract.endDate}
                  </span>
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Header Action Buttons */}
        {contract.status === "draft" && canWrite ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/contracts/${contract.id}/edit`}>
              <Button type="button" className="gap-1.5 font-medium shadow-xs">
                <FileEdit size={15} aria-hidden="true" />
                <span>{t("openBuilder")}</span>
              </Button>
            </Link>
            <ContractDraftActions
              contractId={contract.id}
              canDelete={contract.number === null}
            />
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <ContractLifecycleActions
              contractId={contract.id}
              status={contract.status}
              canWrite={canWrite}
              canSend={can(user, "contracts.send")}
              canCancel={can(user, "contracts.cancel")}
              canTerminate={can(user, "contracts.terminate")}
            />
          </div>
        )}
      </div>

      {/* 2. Top Metric Cards Row matching Invoices */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded border border-border/80 bg-card p-3 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">{tc("total")}</span>
          <span className="text-lg font-bold font-mono tabular-nums text-foreground">
            {formatMoney(contract.totalMinor, currency, locale)}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded border border-border/80 bg-card p-3 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">{t("items")}</span>
          <span className="text-lg font-bold font-mono tabular-nums text-foreground">
            {items.length}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded border border-border/80 bg-card p-3 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">{t("milestones")}</span>
          <span className="text-lg font-bold font-mono tabular-nums text-foreground">
            {milestones.length}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded border border-border/80 bg-card p-3 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">{t("signatories")}</span>
          <span className="text-lg font-bold font-mono tabular-nums text-foreground">
            {signedCount} / {signatories.length}
          </span>
        </div>
      </div>

      {contract.status === "signed" && contract.finalPdfFileId === null ? (
        <FinalizeRetryBanner
          contractId={contract.id}
          attempts={contract.pdfAttempts}
          canRetry={canWrite}
        />
      ) : null}

      {/* 3. Unified 12-Column Grid (8 cols main + 4 cols sidebar) identical to Invoices */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left Column (8 cols): Document Viewer & Content Sections */}
        <div className="flex flex-col gap-6 lg:col-span-8">
          {/* Document Viewer Card - Live Preview front and center */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="inline-flex items-center gap-2">
                <FileText size={18} className="text-primary" aria-hidden="true" />
                <span>{t("document")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ContractDocumentViewer
                id={contract.id}
                languageMode={contract.languageMode}
                canDownload={can(user, "contracts.read")}
              />
            </CardContent>
          </Card>

          {/* Deliverables Table (if contract.hasFees and items exist) */}
          {contract.hasFees && items.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <ListOrdered size={18} className="text-primary" aria-hidden="true" />
                  <span>{t("items")}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    ({items.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded border border-border">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>
                          {locale === "ar" ? "الوصف" : "Description"}
                        </TableHeaderCell>
                        <TableHeaderCell className="text-end">
                          {locale === "ar" ? "الكمية" : "Qty"}
                        </TableHeaderCell>
                        <TableHeaderCell className="text-end">
                          {locale === "ar" ? "سعر الوحدة" : "Unit Price"}
                        </TableHeaderCell>
                        <TableHeaderCell className="text-end">
                          {locale === "ar" ? "الإجمالي" : "Total"}
                        </TableHeaderCell>
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
                              {item.qtyMilli / 1000}
                            </TableCell>
                            <TableCell className="text-end font-mono text-xs tabular-nums">
                              {formatMoney(item.unitPriceMinor, currency, locale)}
                            </TableCell>
                            <TableCell className="text-end font-semibold tabular-nums">
                              {formatMoney(item.lineTotalMinor, currency, locale)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Payment Milestones Table */}
          {milestones.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <Layers size={18} className="text-primary" aria-hidden="true" />
                  <span>{t("milestones")}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    ({milestones.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto rounded border border-border">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableHeaderCell>
                          {locale === "ar" ? "الدفعة / المرحلة" : "Milestone"}
                        </TableHeaderCell>
                        <TableHeaderCell className="text-end">
                          {locale === "ar" ? "النسبة" : "%"}
                        </TableHeaderCell>
                        <TableHeaderCell className="text-end">
                          {locale === "ar" ? "المبلغ" : "Amount"}
                        </TableHeaderCell>
                        <TableHeaderCell className="text-center">
                          {locale === "ar" ? "الاستحقاق" : "Due Date"}
                        </TableHeaderCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {milestones.map((m) => {
                        const mTitle =
                          locale === "ar"
                            ? (m.titleAr || m.titleEn)
                            : (m.titleEn || m.titleAr);
                        const mTrigger =
                          locale === "ar"
                            ? m.triggerNoteAr || m.triggerNoteEn
                            : m.triggerNoteEn || m.triggerNoteAr;
                        return (
                          <TableRow key={m.id}>
                            <TableCell className="font-medium text-foreground">
                              <span>{mTitle}</span>
                              {mTrigger ? (
                                <span className="block text-xs text-muted-foreground mt-0.5">
                                  {mTrigger}
                                </span>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-end font-mono text-xs tabular-nums">
                              {m.percentBp !== null ? `${(m.percentBp / 100).toFixed(1)}%` : "—"}
                            </TableCell>
                            <TableCell className="text-end font-semibold tabular-nums">
                              {formatMoney(m.amountMinor, currency, locale)}
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs text-muted-foreground">
                              {m.dueDate ?? "—"}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Clauses List */}
          {clauses.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <FileSignature size={18} className="text-primary" aria-hidden="true" />
                  <span>{t("clauses")}</span>
                  <span className="text-xs font-normal text-muted-foreground">
                    ({clauses.length})
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {clauses.map((c) => {
                  const clTitle =
                    locale === "ar"
                      ? (c.titleAr || c.titleEn)
                      : (c.titleEn || c.titleAr);
                  return (
                    <div
                      key={c.id}
                      className="flex items-center gap-3 rounded-lg border border-border/70 bg-card p-3 transition-colors hover:border-primary/40"
                    >
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold font-mono text-primary shrink-0">
                        {locale === "ar" ? `المادة ${c.position}` : `Art. ${c.position}`}
                      </span>
                      <span className="text-sm font-semibold text-foreground">
                        {clTitle}
                      </span>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : null}

          {/* Scope & Notes */}
          {contract.internalNotes || contract.scopeAr || contract.scopeEn ? (
            <Card>
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <ScrollText size={18} className="text-primary" aria-hidden="true" />
                  <span>{t("internalNotes")}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {contract.scopeAr ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">{t("scopeAr")}</span>
                    <p className="rounded border border-border/60 bg-muted/20 p-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed" dir="rtl">
                      {contract.scopeAr}
                    </p>
                  </div>
                ) : null}
                {contract.scopeEn ? (
                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-medium text-muted-foreground">{t("scopeEn")}</span>
                    <p className="rounded border border-border/60 bg-muted/20 p-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed" dir="ltr">
                      {contract.scopeEn}
                    </p>
                  </div>
                ) : null}
                {contract.internalNotes ? (
                  <div className="flex flex-col gap-1 border-t border-border/40 pt-3">
                    <span className="text-xs font-medium text-muted-foreground">{t("internalNotes")}</span>
                    <p className="rounded border border-border/60 bg-muted/20 p-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                      {contract.internalNotes}
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Right Column (4 cols): Financial Summary, Meta, Signatories, Audit */}
        <div className="flex flex-col gap-6 lg:col-span-4">
          {/* Summary Card identical to Invoices */}
          {contract.hasFees ? (
            <Card>
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <Wallet size={18} className="text-primary" aria-hidden="true" />
                  <span>{t("summary")}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {milestones.length > 0 ? (
                  <div className="flex flex-col gap-2 rounded border border-border bg-surface p-3.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{t("milestones")}</span>
                      <span className="font-semibold text-foreground">
                        {milestones.length} {t("milestones")}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-border">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{
                          width: `${Math.min(
                            100,
                            Math.max(
                              0,
                              Math.round(
                                milestones.reduce(
                                  (acc, m) => acc + (m.percentBp ?? 0),
                                  0,
                                ) / 100,
                              ),
                            ),
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between border-t border-border/50 pt-2 text-xs">
                      <span className="text-muted-foreground">{tc("total")}</span>
                      <span className="font-bold text-foreground tabular-nums">
                        {formatMoney(contract.totalMinor, currency, locale)}
                      </span>
                    </div>
                  </div>
                ) : null}

                <dl className="flex flex-col gap-2 text-sm">
                  <Money
                    label={tc("subtotal")}
                    value={formatMoney(contract.subtotalMinor, currency, locale)}
                  />
                  {contract.discountMinor > 0 ? (
                    <Money
                      label={t("discountLabel")}
                      value={`-${formatMoney(contract.discountMinor, currency, locale)}`}
                    />
                  ) : null}
                  <Money
                    label={t("net")}
                    value={formatMoney(contract.netMinor, currency, locale)}
                  />
                  <Money
                    label={t("tax")}
                    value={formatMoney(contract.taxMinor, currency, locale)}
                  />
                  <div className="my-1 border-t border-border" />
                  <Money
                    label={tc("total")}
                    value={formatMoney(contract.totalMinor, currency, locale)}
                    strong
                  />
                </dl>
              </CardContent>
            </Card>
          ) : null}

          {/* Project & Client Card */}
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <FolderKanban size={18} className="text-primary" aria-hidden="true" />
                <span>{t("contractData")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {project ? (
                <div className="flex flex-col gap-1 rounded-lg border border-border/70 bg-card p-3 transition-colors hover:border-primary/40">
                  <span className="text-xs font-medium text-muted-foreground">{t("project")}</span>
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
                    {project.code ? (
                      <span className="font-mono text-xs text-muted-foreground font-normal" dir="ltr">
                        ({project.code})
                      </span>
                    ) : null}
                  </Link>
                </div>
              ) : null}

              {client ? (
                <div className="flex flex-col gap-1 rounded-lg border border-border/70 bg-card p-3 transition-colors hover:border-primary/40">
                  <span className="text-xs font-medium text-muted-foreground">{t("client")}</span>
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
                <span className="font-mono font-semibold text-foreground">{contract.currency}</span>
              </div>
              <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                <span>{t("languageMode")}</span>
                <span className="font-semibold text-foreground">{t(`languageModes.${contract.languageMode}`)}</span>
              </div>
              <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                <span>{t("startDate")}</span>
                <span className="font-semibold text-foreground">{contract.startDate ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                <span>{t("endDate")}</span>
                <span className="font-semibold text-foreground">{contract.endDate ?? "—"}</span>
              </div>
              {contract.signingDeadline ? (
                <div className="flex items-center justify-between px-1 text-xs text-muted-foreground">
                  <span>{t("signingDeadline")}</span>
                  <span className="font-semibold text-foreground">{contract.signingDeadline}</span>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Signatories Card */}
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <FileSignature size={18} className="text-primary" aria-hidden="true" />
                <span>{t("signatoriesTitle")}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  ({signedCount}/{signatories.length})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {signatories.length === 0 ? (
                <EmptyState title={t("signatures.empty")} />
              ) : (
                <div className="flex flex-col gap-2.5">
                  {signatories.map((sig) => (
                    <div
                      key={sig.id}
                      className="flex flex-col gap-1.5 rounded-lg border border-border/70 bg-card p-3 text-xs transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground">{sig.name}</span>
                        <Badge
                          tone={sig.status === "signed" ? "green" : sig.status === "declined" ? "red" : "gray"}
                        >
                          {t(`signatures.statusLabel.${sig.status}`)}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span>{t(`signatures.roles.${sig.role}`)}</span>
                        {sig.title ? <span>{sig.title}</span> : null}
                      </div>
                      {sig.signedAt ? (
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                          <span>{t("signatures.signedAt")}</span>
                          <span className="font-mono">{formatInstant(sig.signedAt, "UTC", locale)}</span>
                        </div>
                      ) : null}
                      {sig.status === "declined" && sig.declineReason ? (
                        <p className="text-xs text-destructive pt-1 border-t border-border/40">
                          {t("signatures.reason")}: {sig.declineReason}
                        </p>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Audit Trail & Versions */}
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <History size={18} className="text-primary" aria-hidden="true" />
                <span>{t("history.activity")}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  ({history.total})
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {history.rows.length === 0 ? (
                <EmptyState title={t("history.noActivity")} />
              ) : (
                <div className="flex flex-col gap-2 text-xs">
                  {history.rows.slice(0, 5).map((row) => (
                    <div key={row.id} className="flex flex-col gap-0.5 border-b border-border/40 pb-2 last:border-b-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-semibold text-foreground">{row.action}</span>
                        <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                          {formatInstant(row.ts, "UTC", locale)}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {row.actorType}
                        {row.actorId ? <span className="ms-1 font-mono" dir="ltr">({row.actorId.slice(0, 8)})</span> : null}
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
      <dd
        className={
          strong
            ? "font-semibold tabular-nums text-foreground"
            : "tabular-nums text-foreground"
        }
      >
        {value}
      </dd>
    </div>
  );
}
