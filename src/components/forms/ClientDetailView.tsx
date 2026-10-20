// Dossier - Client Detail View Forms Component
// https://github.com/red-shadows-rs/dossier

"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Building2,
  Calendar,
  CreditCard,
  FileText,
  FolderKanban,
  MapPin,
  Pencil,
  Plus,
  Receipt,
  ShieldCheck,
  User,
} from "lucide-react";
import { ClientArchiveButton } from "@/components/forms/ClientArchiveButton";
import { ClientDeleteButton } from "@/components/forms/ClientDeleteButton";
import {
  Badge,
  contractStatusTone,
  invoiceStatusTone,
  projectStatusTone,
} from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { UrlTabs } from "@/components/ui/UrlTabs";
import type { CurrencyCode } from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import type { ClientRow } from "@/server/services/clients";
import type { ContractRow } from "@/server/services/contracts";
import type { InvoiceRow } from "@/server/services/invoices";
import type { ProjectRow } from "@/server/services/projects";

function Row({
  label,
  value,
  dir,
}: {
  label: string;
  value: string | null | undefined;
  dir?: "ltr" | "rtl";
}) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1 rounded border border-border/60 bg-muted/20 p-2.5 transition-colors hover:bg-muted/30">
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd
        dir={dir}
        className="text-sm font-semibold tracking-tight text-foreground break-words"
      >
        {value}
      </dd>
    </div>
  );
}

interface ClientDetailViewProps {
  client: ClientRow;
  projects: ProjectRow[];
  contracts: ContractRow[];
  invoices: InvoiceRow[];
  canWrite: boolean;
  canDelete: boolean;
  locale: "ar" | "en";
}

export function ClientDetailView({
  client,
  projects,
  contracts,
  invoices,
  canWrite,
  canDelete,
  locale,
}: ClientDetailViewProps) {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "overview";
  const [, setActiveTab] = useState(currentTab);

  const clientDisplayName =
    (locale === "ar"
      ? client.nameAr || client.nameEn
      : client.nameEn || client.nameAr) ?? "-";

  const clientDir =
    locale === "ar"
      ? client.nameAr
        ? "rtl"
        : "ltr"
      : client.nameEn
        ? "ltr"
        : "rtl";

  const activeProjectsCount = projects.filter(
    (p) => p.status === "active" || p.status === "lead",
  ).length;
  const signedContractsCount = contracts.filter(
    (c) => c.status === "signed" || c.status === "completed",
  ).length;
  const unpaidInvoicesCount = invoices.filter(
    (i) => i.status === "issued" || i.status === "partially_paid",
  ).length;

  const totalInvoicedMinor = invoices
    .filter((i) => i.status !== "void" && i.status !== "draft")
    .reduce((acc, inv) => acc + (inv.totalMinor || 0), 0);

  const primaryCurrency = (invoices[0]?.currency || "SAR") as CurrencyCode;

  const tabs = [
    {
      id: "overview",
      label: t("clients.tabs.overview"),
      icon: Building2,
    },
    {
      id: "projectsAndContracts",
      label: t("clients.tabs.projectsAndContracts"),
      icon: FolderKanban,
      badge: projects.length + contracts.length,
    },
    {
      id: "invoices",
      label: t("clients.tabs.invoices"),
      icon: Receipt,
      badge: invoices.length,
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
            href="/clients"
            className="hover:text-foreground transition-colors"
          >
            {t("clients.title")}
          </Link>
          <span className="text-border">/</span>
          <span className="text-foreground font-medium truncate max-w-[240px]">
            {clientDisplayName}
          </span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary">
              <Building2 size={20} aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  <span dir={clientDir}>{clientDisplayName}</span>
                </h1>
                {client.archivedAt ? (
                  <Badge tone="gray">{t("clients.archived")}</Badge>
                ) : (
                  <Badge tone="green">{t("clients.active")}</Badge>
                )}
                <Badge tone="gray">
                  {t(`clients.type.${client.type}`)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {client.city ? `${client.city}, ` : ""}
                {client.country || ""}
                {client.email ? ` · ${client.email}` : ""}
              </p>
            </div>
          </div>

          {canWrite && (
            <div className="flex flex-wrap items-center gap-2">
              <Link href={`/clients/${client.id}/edit`}>
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-1.5 font-medium shadow-xs"
                >
                  <Pencil size={15} aria-hidden="true" />
                  <span>{t("common.edit")}</span>
                </Button>
              </Link>
              <ClientArchiveButton
                clientId={client.id}
                archived={client.archivedAt !== null}
              />
              {canDelete && <ClientDeleteButton clientId={client.id} />}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded border border-border bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {t("clients.projects")}
            </span>
            <FolderKanban className="h-4 w-4 text-primary/60" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold font-mono tabular-nums text-foreground">
              {projects.length}
            </span>
            <span className="text-xs text-muted-foreground">
              ({activeProjectsCount} {t("projects.status.active")})
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1 rounded border border-border bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {t("clients.contracts")}
            </span>
            <FileText className="h-4 w-4 text-primary/60" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold font-mono tabular-nums text-foreground">
              {contracts.length}
            </span>
            <span className="text-xs text-muted-foreground">
              ({signedContractsCount} {t("contracts.status.signed")})
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1 rounded border border-border bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {t("clients.invoices")}
            </span>
            <Receipt className="h-4 w-4 text-primary/60" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold font-mono tabular-nums text-foreground">
              {invoices.length}
            </span>
            <span className="text-xs text-muted-foreground">
              ({unpaidInvoicesCount} {t("invoices.status.issued")})
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1 rounded border border-border bg-card p-3 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {t("common.total")}
            </span>
            <CreditCard className="h-4 w-4 text-primary/60" />
          </div>
          <span className="text-lg font-bold font-mono tabular-nums text-foreground truncate">
            {formatMoney(totalInvoicedMinor, primaryCurrency, locale)}
          </span>
        </div>
      </div>

      <UrlTabs tabs={tabs} defaultTab="overview" onChange={setActiveTab} />

      <div className={currentTab === "overview" ? "block space-y-6" : "hidden"}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <Building2 size={18} className="text-primary" aria-hidden="true" />
                <span>{t("clients.identity")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Row
                  label={t("clients.typeLabel")}
                  value={t(`clients.type.${client.type}`)}
                />
                <Row
                  label={t("clients.preferredLanguage")}
                  value={
                    client.preferredLanguage === "ar"
                      ? t("locale.ar")
                      : t("locale.en")
                  }
                />
                <Row
                  label={t("clients.nameAr")}
                  value={client.nameAr}
                  dir="rtl"
                />
                <Row
                  label={t("clients.nameEn")}
                  value={client.nameEn}
                  dir="ltr"
                />
                <Row
                  label={t("clients.legalNameAr")}
                  value={client.legalNameAr}
                  dir="rtl"
                />
                <Row
                  label={t("clients.legalNameEn")}
                  value={client.legalNameEn}
                  dir="ltr"
                />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <MapPin size={18} className="text-primary" aria-hidden="true" />
                <span>{t("clients.contact")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Row label={t("clients.email")} value={client.email} dir="ltr" />
                <Row label={t("clients.phone")} value={client.phone} dir="ltr" />
                <Row
                  label={t("clients.country")}
                  value={client.country}
                  dir="ltr"
                />
                <Row label={t("clients.city")} value={client.city} />
                <Row
                  label={t("clients.addressAr")}
                  value={client.addressAr}
                  dir="rtl"
                />
                <Row
                  label={t("clients.addressEn")}
                  value={client.addressEn}
                  dir="ltr"
                />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <ShieldCheck size={18} className="text-primary" aria-hidden="true" />
                <span>{t("clients.legal")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Row
                  label={t("clients.taxNumber")}
                  value={client.taxNumber}
                  dir="ltr"
                />
                <Row
                  label={t("clients.crNumber")}
                  value={client.crNumber}
                  dir="ltr"
                />
                <Row
                  label={t("clients.repNameAr")}
                  value={client.repNameAr}
                  dir="rtl"
                />
                <Row
                  label={t("clients.repNameEn")}
                  value={client.repNameEn}
                  dir="ltr"
                />
                <Row
                  label={t("clients.repTitleAr")}
                  value={client.repTitleAr}
                  dir="rtl"
                />
                <Row
                  label={t("clients.repTitleEn")}
                  value={client.repTitleEn}
                  dir="ltr"
                />
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <User size={18} className="text-primary" aria-hidden="true" />
                <span>{t("clients.notes")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {client.notes ? (
                <div className="rounded border border-border/60 bg-muted/20 p-3 text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                  {client.notes}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  {t("common.noResults")}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div
        className={
          currentTab === "projectsAndContracts" ? "block space-y-6" : "hidden"
        }
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="inline-flex items-center gap-2">
              <FolderKanban size={18} className="text-primary" aria-hidden="true" />
              <span>{t("clients.projects")}</span>
              <span className="text-xs text-muted-foreground font-mono">
                ({projects.length})
              </span>
            </CardTitle>
            {canWrite && (
              <Link href={`/projects/new?clientId=${client.id}`}>
                <Button variant="secondary" className="gap-1.5 font-medium shadow-xs">
                  <Plus size={15} />
                  <span>{t("projects.new")}</span>
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {projects.length === 0 ? (
              <EmptyState title={t("clients.noProjects")} />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {projects.map((proj) => {
                  const projName =
                    (locale === "ar"
                      ? proj.nameAr || proj.nameEn
                      : proj.nameEn || proj.nameAr) ?? proj.code;
                  return (
                    <Link
                      key={proj.id}
                      href={`/projects/${proj.id}`}
                      className="group flex flex-col justify-between gap-3 rounded-lg border border-border/70 bg-card p-4 transition-all duration-150 hover:border-primary/50 hover:shadow-xs"
                    >
                      <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-mono text-xs font-semibold text-muted-foreground">
                            {proj.code}
                          </span>
                          <Badge tone={projectStatusTone(proj.status)}>
                            {t(`projects.status.${proj.status}`)}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {projName}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs text-muted-foreground">
                        <span>{t("common.details")}</span>
                        <span className="font-mono font-medium text-foreground">
                          {proj.budgetMinor
                            ? formatMoney(
                                proj.budgetMinor,
                                proj.currency as CurrencyCode,
                                locale,
                              )
                            : "-"}
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
              <FileText size={18} className="text-primary" aria-hidden="true" />
              <span>{t("clients.contracts")}</span>
              <span className="text-xs text-muted-foreground font-mono">
                ({contracts.length})
              </span>
            </CardTitle>
            {canWrite && (
              <Link href={`/contracts/new?clientId=${client.id}`}>
                <Button variant="secondary" className="gap-1.5 font-medium shadow-xs">
                  <Plus size={15} />
                  <span>{t("contracts.new")}</span>
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {contracts.length === 0 ? (
              <EmptyState title={t("clients.noContracts")} />
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
                            {con.number || t("contracts.status.draft")}
                          </span>
                          <Badge tone={contractStatusTone(con.status)}>
                            {t(`contracts.status.${con.status}`)}
                          </Badge>
                        </div>
                        <h4 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                          {conTitle}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span className="font-mono">{con.startDate || "-"}</span>
                        </span>
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
      </div>

      <div className={currentTab === "invoices" ? "block space-y-6" : "hidden"}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="inline-flex items-center gap-2">
              <Receipt size={18} className="text-primary" aria-hidden="true" />
              <span>{t("clients.invoices")}</span>
              <span className="text-xs text-muted-foreground font-mono">
                ({invoices.length})
              </span>
            </CardTitle>
            {canWrite && (
              <Link href={`/invoices/new?clientId=${client.id}`}>
                <Button variant="secondary" className="gap-1.5 font-medium shadow-xs">
                  <Plus size={15} />
                  <span>{t("invoices.new")}</span>
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <EmptyState title={t("clients.noInvoices")} />
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
                          {t(`invoices.status.${inv.status}`)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3.5 w-3.5" />
                        <span>{t("invoices.issueDate")}:</span>
                        <span className="font-mono text-foreground">
                          {inv.issueDate}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs text-muted-foreground">
                      <span>{t("common.total")}</span>
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
    </div>
  );
}

