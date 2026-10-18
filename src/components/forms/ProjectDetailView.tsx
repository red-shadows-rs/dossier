"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Building2,
  Calendar,
  Clock,
  Coins,
  Compass,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  History,
  Paperclip,
  Pencil,
  Plus,
  Receipt,
} from "lucide-react";
import { CreateInvoiceFromMilestoneButton } from "@/components/forms/CreateInvoiceFromMilestoneButton";
import { ProjectActions } from "@/components/forms/ProjectActions";
import { formatAuditAction, formatAuditEntity } from "@/lib/audit-format";
import {
  ProjectFiles,
  type AttachmentItem,
} from "@/components/forms/ProjectFiles";
import {
  Badge,
  contractStatusTone,
  invoiceStatusTone,
  projectStatusTone,
} from "@/components/ui/Badge";
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
import type { CurrencyCode, PROJECT_STATUSES } from "@/lib/constants";
import { formatInstant } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import type { ClientRow } from "@/server/services/clients";
import type { ContractStatus } from "@/server/services/contracts";
import type { InvoiceRow } from "@/server/services/invoices";
import type { CurrencySummary } from "@/server/services/project-summary";
import type { ProjectRow } from "@/server/services/projects";

function InfoRow({
  label,
  children,
  dir,
  className,
}: {
  label: string;
  children: React.ReactNode;
  dir?: "ltr" | "rtl";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded border border-border/60 bg-muted/20 p-2.5 transition-colors hover:bg-muted/30",
        className,
      )}
    >
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd
        dir={dir}
        className="text-sm font-semibold tracking-tight text-foreground break-words"
      >
        {children}
      </dd>
    </div>
  );
}

export interface ProjectContractItem {
  id: string;
  number: string | null;
  status: ContractStatus;
  titleAr: string | null;
  titleEn: string | null;
  totalMinor: number;
  currency: string;
}

export interface ProjectMilestoneItem {
  milestoneId: string;
  contractId: string;
  projectId: string;
  label: string;
}

export interface ProjectActivityItem {
  id: number;
  ts: number;
  actorType: "user" | "signer" | "system";
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  ip: string | null;
  userAgent: string | null;
  metaJson: string | null;
}

interface ProjectDetailViewProps {
  project: ProjectRow;
  client: ClientRow;
  contracts: ProjectContractItem[];
  invoices: InvoiceRow[];
  milestones: ProjectMilestoneItem[];
  summary: CurrencySummary[];
  attachments: AttachmentItem[];
  activity: ProjectActivityItem[];
  canWrite: boolean;
  locale: "ar" | "en";
}


export function ProjectDetailView({
  project,
  client,
  contracts,
  invoices,
  milestones,
  summary,
  attachments,
  activity,
  canWrite,
  locale,
}: ProjectDetailViewProps) {
  const t = useTranslations("projects");
  const tc = useTranslations("common");
  const tcontracts = useTranslations("contracts");
  const tinvoices = useTranslations("invoices");

  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "overview";
  const [, setActiveTab] = useState(currentTab);

  const projectName =
    (locale === "ar"
      ? project.nameAr || project.nameEn
      : project.nameEn || project.nameAr) ?? project.code;

  const projectDir =
    locale === "ar"
      ? project.nameAr
        ? "rtl"
        : "ltr"
      : project.nameEn
        ? "ltr"
        : "rtl";

  const clientName =
    (locale === "ar"
      ? client.nameAr || client.nameEn
      : client.nameEn || client.nameAr) ?? client.id;

  const primaryCurrency = (project.currency || "SAR") as CurrencyCode;

  const totalContractedMinor = summary.reduce(
    (acc, row) => acc + row.contractedMinor,
    0,
  );
  const totalInvoicedMinor = summary.reduce(
    (acc, row) => acc + row.invoicedMinor,
    0,
  );
  const totalPaidMinor = summary.reduce((acc, row) => acc + row.paidMinor, 0);

  const collectedPct =
    totalContractedMinor > 0
      ? Math.min(100, Math.round((totalPaidMinor / totalContractedMinor) * 100))
      : 0;

  const tabs = [
    {
      id: "overview",
      label: t("tabs.overview"),
      icon: Compass,
    },
    {
      id: "contracts",
      label: t("tabs.contracts"),
      icon: FileText,
      badge: contracts.length,
    },
    {
      id: "invoices",
      label: t("tabs.invoices"),
      icon: Receipt,
      badge: invoices.length,
    },
    {
      id: "files",
      label: t("tabs.files"),
      icon: Paperclip,
      badge: attachments.length,
    },
    {
      id: "activity",
      label: t("tabs.activity"),
      icon: History,
      badge: activity.length,
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
            href="/projects"
            className="hover:text-foreground transition-colors"
          >
            {t("title")}
          </Link>
          <span className="text-border">/</span>
          <span className="text-foreground font-medium truncate max-w-[240px]">
            {projectName}
          </span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary">
              <FolderKanban size={20} aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  <span dir={projectDir}>{projectName}</span>
                </h1>
                <span
                  className="inline-flex items-center rounded border border-border/60 bg-muted/40 px-2 py-0.5 text-xs font-mono font-medium text-muted-foreground"
                  dir="ltr"
                >
                  {project.code}
                </span>
                {project.archivedAt ? (
                  <Badge tone="gray">{t("archived")}</Badge>
                ) : (
                  <Badge tone={projectStatusTone(project.status)}>
                    {t(`status.${project.status}`)}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                <Link
                  href={`/clients/${client.id}`}
                  className="hover:text-primary transition-colors font-medium"
                >
                  {clientName}
                </Link>
                {project.startDate ? ` · ${t("startDate")}: ${project.startDate}` : ""}
                {project.endDate ? ` · ${t("endDate")}: ${project.endDate}` : ""}
              </p>
            </div>
          </div>

          {canWrite && (
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/projects/${project.id}/edit`}>
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-1.5 font-medium shadow-xs"
                >
                  <Pencil size={15} aria-hidden="true" />
                  <span>{tc("edit")}</span>
                </Button>
              </Link>
              <ProjectActions
                projectId={project.id}
                status={project.status as (typeof PROJECT_STATUSES)[number]}
                archived={project.archivedAt !== null}
              />
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded border border-border bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {t("budget")}
            </span>
            <Coins className="h-4 w-4 text-primary/60" />
          </div>
          <span className="text-lg font-bold font-mono tabular-nums text-foreground truncate">
            {project.budgetMinor
              ? formatMoney(project.budgetMinor, primaryCurrency, locale)
              : "-"}
          </span>
        </div>

        <div className="flex flex-col gap-1 rounded border border-border bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {t("summary.contracted")}
            </span>
            <FileText className="h-4 w-4 text-primary/60" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold font-mono tabular-nums text-foreground truncate">
              {formatMoney(totalContractedMinor, primaryCurrency, locale)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1 rounded border border-border bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {t("summary.invoiced")}
            </span>
            <Receipt className="h-4 w-4 text-primary/60" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold font-mono tabular-nums text-foreground truncate">
              {formatMoney(totalInvoicedMinor, primaryCurrency, locale)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1 rounded border border-border bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {t("summary.paid")}
            </span>
            <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
              {collectedPct}%
            </span>
          </div>
          <span className="text-lg font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 truncate">
            {formatMoney(totalPaidMinor, primaryCurrency, locale)}
          </span>
        </div>
      </div>

      <UrlTabs tabs={tabs} defaultTab="overview" onChange={setActiveTab} />

      <div className={currentTab === "overview" ? "block space-y-6" : "hidden"}>
        <Card>
          <CardHeader className="border-b border-border/40 pb-3">
            <CardTitle className="inline-flex items-center gap-2 text-base">
              <Compass size={18} className="text-primary" aria-hidden="true" />
              <span>{t("details")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <InfoRow label={t("client")}>
                <Link
                  href={`/clients/${client.id}`}
                  className="hover:text-primary transition-colors inline-flex items-center gap-1.5"
                >
                  <Building2 size={15} className="text-muted-foreground" />
                  <span>{clientName}</span>
                </Link>
              </InfoRow>
              <InfoRow label={t("currency")} dir="ltr">
                {project.currency}
              </InfoRow>
              <InfoRow label={t("statusLabel")}>
                <Badge tone={projectStatusTone(project.status)}>
                  {t(`status.${project.status}`)}
                </Badge>
              </InfoRow>
              <InfoRow label={t("startDate")} dir="ltr">
                {project.startDate ?? "-"}
              </InfoRow>
              <InfoRow label={t("endDate")} dir="ltr">
                {project.endDate ?? "-"}
              </InfoRow>
              {project.description && (
                <InfoRow
                  label={t("description")}
                  className="sm:col-span-2 lg:col-span-3"
                >
                  <span className="whitespace-pre-wrap leading-relaxed text-muted-foreground font-normal">
                    {project.description}
                  </span>
                </InfoRow>
              )}
              {project.notes && (
                <InfoRow
                  label={t("notes")}
                  className="sm:col-span-2 lg:col-span-3"
                >
                  <span className="whitespace-pre-wrap leading-relaxed text-muted-foreground font-normal">
                    {project.notes}
                  </span>
                </InfoRow>
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b border-border/40 pb-3">
            <CardTitle className="inline-flex items-center gap-2 text-base">
              <FileSpreadsheet
                size={18}
                className="text-primary"
                aria-hidden="true"
              />
              <span>{t("summary.title")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {summary.length === 0 ? (
              <EmptyState title={t("summary.empty")} />
            ) : (
              <div className="flex flex-col gap-6">
                {summary.map((row) => {
                  const currency = row.currency as CurrencyCode;
                  const money = (minor: number) =>
                    formatMoney(minor, currency, locale);

                  const contracted = row.contractedMinor;
                  const invoiced = row.invoicedMinor;
                  const paid = row.paidMinor;
                  const remaining = row.remainingToInvoiceMinor;
                  const overdue = row.overdueMinor;

                  const invoicedPct =
                    contracted > 0
                      ? Math.min(100, Math.round((invoiced / contracted) * 100))
                      : 0;
                  const paidPct =
                    contracted > 0
                      ? Math.min(100, Math.round((paid / contracted) * 100))
                      : 0;
                  const unbilledPct =
                    contracted > 0 ? Math.max(0, 100 - invoicedPct) : 0;
                  const outstandingPct =
                    contracted > 0 ? Math.max(0, invoicedPct - paidPct) : 0;

                  return (
                    <div
                      key={row.currency}
                      className="flex flex-col gap-4 rounded-lg border border-border/80 bg-background/40 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="flex h-7 w-7 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary font-mono text-xs font-bold">
                            {currency}
                          </span>
                          <span className="text-sm font-bold text-foreground">
                            {t("summary.contracted")}:{" "}
                            <span className="tabular-nums font-mono">
                              {money(contracted)}
                            </span>
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-medium">
                          <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-emerald-600 dark:text-emerald-400 font-mono font-semibold">
                            {paidPct}% {locale === "ar" ? "محصل" : "collected"}
                          </span>
                          <span className="rounded bg-primary/10 px-2 py-0.5 text-primary font-mono font-semibold">
                            {invoicedPct}% {locale === "ar" ? "مفوتر" : "invoiced"}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        <div className="flex h-3 w-full overflow-hidden rounded bg-muted/60 shadow-inner">
                          <div
                            style={{ width: `${paidPct}%` }}
                            className="bg-emerald-500 transition-all"
                            title={`${t("summary.paid")}: ${money(paid)} (${paidPct}%)`}
                          />
                          <div
                            style={{ width: `${outstandingPct}%` }}
                            className="bg-sky-500 transition-all"
                            title={`${t("summary.outstanding")}: ${money(row.outstandingMinor)} (${outstandingPct}%)`}
                          />
                          <div
                            style={{ width: `${unbilledPct}%` }}
                            className="bg-muted-foreground/20 transition-all"
                            title={`${t("summary.remaining")}: ${money(remaining)} (${unbilledPct}%)`}
                          />
                        </div>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                          <div className="flex flex-wrap items-center gap-3">
                            <span className="inline-flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                              <span>
                                {t("summary.paid")}:{" "}
                                <strong className="text-foreground font-mono">
                                  {money(paid)}
                                </strong>
                              </span>
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-sky-500 shrink-0" />
                              <span>
                                {t("summary.outstanding")}:{" "}
                                <strong className="text-foreground font-mono">
                                  {money(row.outstandingMinor)}
                                </strong>
                              </span>
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                              <span className="h-2 w-2 rounded-full bg-muted-foreground/40 shrink-0" />
                              <span>
                                {t("summary.remaining")}:{" "}
                                <strong className="text-foreground font-mono">
                                  {money(remaining)}
                                </strong>
                              </span>
                            </span>
                          </div>
                          {overdue > 0 && (
                            <span className="inline-flex items-center gap-1.5 font-semibold text-rose-500">
                              <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                              <span>
                                {t("summary.overdue")}:{" "}
                                <strong className="font-mono">
                                  {money(overdue)}
                                </strong>
                              </span>
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6 pt-1">
                        <div className="flex flex-col gap-0.5 rounded border border-border/70 bg-card p-2.5 shadow-2xs">
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {t("summary.contracted")}
                          </span>
                          <span className="text-sm font-bold font-mono tabular-nums text-foreground">
                            {money(contracted)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5 rounded border border-border/70 bg-card p-2.5 shadow-2xs">
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {t("summary.invoiced")}
                          </span>
                          <span className="text-sm font-bold font-mono tabular-nums text-primary">
                            {money(invoiced)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5 rounded border border-border/70 bg-card p-2.5 shadow-2xs">
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {t("summary.paid")}
                          </span>
                          <span className="text-sm font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
                            {money(paid)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5 rounded border border-border/70 bg-card p-2.5 shadow-2xs">
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {t("summary.outstanding")}
                          </span>
                          <span className="text-sm font-bold font-mono tabular-nums text-foreground">
                            {money(row.outstandingMinor)}
                          </span>
                        </div>
                        <div
                          className={cn(
                            "flex flex-col gap-0.5 rounded border p-2.5 shadow-2xs",
                            overdue > 0
                              ? "border-rose-500/30 bg-rose-500/5"
                              : "border-border/70 bg-card",
                          )}
                        >
                          <span
                            className={cn(
                              "text-[11px] font-medium",
                              overdue > 0
                                ? "text-rose-500 font-semibold"
                                : "text-muted-foreground",
                            )}
                          >
                            {t("summary.overdue")}
                          </span>
                          <span
                            className={cn(
                              "text-sm font-bold font-mono tabular-nums",
                              overdue > 0
                                ? "text-rose-500"
                                : "text-muted-foreground",
                            )}
                          >
                            {money(overdue)}
                          </span>
                        </div>
                        <div className="flex flex-col gap-0.5 rounded border border-border/70 bg-card p-2.5 shadow-2xs">
                          <span className="text-[11px] font-medium text-muted-foreground">
                            {t("summary.remaining")}
                          </span>
                          <span className="text-sm font-bold font-mono tabular-nums text-foreground">
                            {money(remaining)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div
        className={currentTab === "contracts" ? "block space-y-6" : "hidden"}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="inline-flex items-center gap-2">
              <FileText size={18} className="text-primary" aria-hidden="true" />
              <span>{t("contractsTitle")}</span>
              <span className="text-xs text-muted-foreground font-mono">
                ({contracts.length})
              </span>
            </CardTitle>
            {canWrite && (
              <Link
                href={`/contracts/new?projectId=${project.id}&clientId=${client.id}`}
              >
                <Button size="sm" variant="secondary" className="gap-1 text-xs">
                  <Plus size={14} />
                  <span>{tcontracts("new")}</span>
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {contracts.length === 0 ? (
              <EmptyState title={t("noContracts")} />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {contracts.map((con) => {
                  const conTitle =
                    (locale === "ar"
                      ? con.titleAr || con.titleEn
                      : con.titleEn || con.titleAr) ?? con.number ?? "-";
                  return (
                    <Link
                      key={con.id}
                      href={`/contracts/${con.id}`}
                      className="group flex flex-col justify-between gap-3 rounded-lg border border-border/70 bg-card p-4 transition-all duration-150 hover:border-primary/50 hover:shadow-xs"
                    >
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-semibold text-muted-foreground">
                            {con.number || tcontracts("status.draft")}

                          </span>
                          <Badge tone={contractStatusTone(con.status)}>
                            {tcontracts(`status.${con.status}`)}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {conTitle}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs text-muted-foreground">
                        <span className="font-mono text-xs">{con.number || "-"}</span>
                        <span className="font-mono font-medium text-foreground">
                          {formatMoney(
                            con.totalMinor,
                            con.currency as CurrencyCode,
                            locale,
                          )}
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="inline-flex items-center gap-2">
              <Clock size={18} className="text-primary" aria-hidden="true" />
              <span>{t("invoiceableMilestones")}</span>
              <span className="text-xs text-muted-foreground font-mono">
                ({milestones.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {milestones.length === 0 ? (
              <EmptyState title={t("noMilestones")} />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>{t("milestonesTitle")}</TableHeaderCell>
                    {canWrite && (
                      <TableHeaderCell className="text-end">
                        {tc("actions")}
                      </TableHeaderCell>
                    )}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {milestones.map((ms) => (
                    <TableRow key={ms.milestoneId}>
                      <TableCell className="font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/contracts/${ms.contractId}`}
                            className="font-mono text-xs text-primary hover:underline"
                          >
                            {ms.contractId}
                          </Link>
                          <span>{ms.label}</span>
                        </div>
                      </TableCell>
                      {canWrite && (
                        <TableCell className="text-end">
                          <CreateInvoiceFromMilestoneButton
                            milestoneId={ms.milestoneId}
                          />
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

      </div>

      <div className={currentTab === "invoices" ? "block space-y-6" : "hidden"}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="inline-flex items-center gap-2">
              <Receipt size={18} className="text-primary" aria-hidden="true" />
              <span>{t("invoicesTitle")}</span>
              <span className="text-xs text-muted-foreground font-mono">
                ({invoices.length})
              </span>
            </CardTitle>
            {canWrite && (
              <Link
                href={`/invoices/new?projectId=${project.id}&clientId=${client.id}`}
              >
                <Button size="sm" variant="secondary" className="gap-1 text-xs">
                  <Plus size={14} />
                  <span>{tinvoices("new")}</span>
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <EmptyState title={t("noInvoices")} />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {invoices.map((inv) => (
                  <Link
                    key={inv.id}
                    href={`/invoices/${inv.id}`}
                    className="group flex flex-col justify-between gap-3 rounded-lg border border-border/70 bg-card p-4 transition-all duration-150 hover:border-primary/50 hover:shadow-xs"
                  >
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-semibold text-muted-foreground">
                          {inv.number}
                        </span>
                        <Badge tone={invoiceStatusTone(inv.status)}>
                          {tinvoices(`status.${inv.status}`)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{tinvoices("issueDate")}:</span>
                        <span className="font-mono text-foreground">
                          {inv.issueDate}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs text-muted-foreground">
                      <span>{tc("total")}</span>
                      <span className="font-mono font-bold text-foreground">
                        {formatMoney(
                          inv.totalMinor,
                          inv.currency as CurrencyCode,
                          locale,
                        )}
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className={currentTab === "files" ? "block space-y-6" : "hidden"}>
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <Paperclip size={18} className="text-primary" aria-hidden="true" />
              <span>{t("tabs.files")}</span>
              <span className="text-xs text-muted-foreground font-mono">
                ({attachments.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectFiles
              projectId={project.id}
              attachments={attachments}
              canWrite={canWrite}
            />
          </CardContent>
        </Card>
      </div>

      <div className={currentTab === "activity" ? "block space-y-6" : "hidden"}>
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <History size={18} className="text-primary" aria-hidden="true" />
              <span>{t("tabs.activity")}</span>
              <span className="text-xs text-muted-foreground font-mono">
                ({activity.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activity.length === 0 ? (
              <EmptyState title={t("noActivity")} />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>{t("activityWhen")}</TableHeaderCell>
                    <TableHeaderCell>{t("activityAction")}</TableHeaderCell>
                    <TableHeaderCell>{t("activityEntity")}</TableHeaderCell>
                    <TableHeaderCell>{tc("details")}</TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activity.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                        {formatInstant(item.ts, "UTC", locale)}
                      </TableCell>
                      <TableCell className="font-semibold text-foreground text-xs">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary/80 shrink-0" />
                          <span>{formatAuditAction(item.action, locale)}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-xs">
                        <span className="inline-flex items-center gap-1">
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-foreground">
                            {formatAuditEntity(item.entityType, locale)}
                          </span>
                          <span className="font-mono text-muted-foreground text-[11px]">
                            {item.entityId.slice(0, 8)}...
                          </span>
                        </span>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {item.actorId ?? "-"}
                        {item.ip ? ` (${item.ip})` : ""}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
