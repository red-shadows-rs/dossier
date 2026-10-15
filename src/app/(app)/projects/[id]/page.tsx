import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  Building2,
  Calendar,
  Clock,
  Coins,
  Compass,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  FolderKanban,
  History,
  Layers,
  Paperclip,
  Pencil,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import { CreateInvoiceFromMilestoneButton } from "@/components/forms/CreateInvoiceFromMilestoneButton";
import { ProjectActions } from "@/components/forms/ProjectActions";
import { ProjectFiles } from "@/components/forms/ProjectFiles";
import {
  Badge,
  contractStatusTone,
  invoiceStatusTone,
} from "@/components/ui/Badge";
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
import type { CurrencyCode } from "@/lib/constants";
import { formatInstant } from "@/lib/dates";
import { env } from "@/lib/env";
import { AppError } from "@/lib/errors";
import { isLocale } from "@/lib/i18n";
import { formatMoney } from "@/lib/money";
import { resolveTaskboardUrl } from "@/lib/taskboard";
import { can } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { listProjectContracts } from "@/server/services/contracts";
import {
  getProjectSummary,
  listProjectActivity,
  listProjectAttachments,
} from "@/server/services/project-summary";
import {
  listInvoiceableMilestones,
  listInvoices,
} from "@/server/services/invoices";
import { getProjectWithClient } from "@/server/services/projects";

type SearchParams = Record<string, string | string[] | undefined>;

const TABS = [
  "overview",
  "contracts",
  "invoices",
  "files",
  "activity",
] as const;
type Tab = (typeof TABS)[number];

const TAB_ICONS = {
  overview: Compass,
  contracts: FileText,
  invoices: Receipt,
  files: Paperclip,
  activity: History,
} as const;

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
  await smoothLoading();
  const user = await requireUserPage();
  const t = await getTranslations("projects");
  const tc = await getTranslations("common");
  const tcontracts = await getTranslations("contracts");
  const tinvoices = await getTranslations("invoices");
  const { id } = await params;
  const sp = await searchParams;
  const tabParam = Array.isArray(sp.tab) ? sp.tab[0] : sp.tab;
  const tab: Tab = (TABS as readonly string[]).includes(tabParam ?? "")
    ? (tabParam as Tab)
    : "overview";

  let data;
  try {
    data = getProjectWithClient(id);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  const { project, client } = data;
  const canWrite = can(user, "projects.write");
  const rawLocale = await getLocale();
  const locale = isLocale(rawLocale) ? rawLocale : "ar";
  const contracts = listProjectContracts(id);
  const summary = getProjectSummary(id);
  const milestones = listInvoiceableMilestones(id, locale);
  const projectInvoices = listInvoices({ projectId: id, page: 1 }).rows;
  const attachments = listProjectAttachments(id);
  const activity = listProjectActivity(id);
  const taskboardHref = resolveTaskboardUrl(
    project.taskboardRef,
    env.TASKBOARD_API_URL,
  );

  const projectName =
    (locale === "ar"
      ? project.nameAr || project.nameEn
      : project.nameEn || project.nameAr) ?? "-";
  const projectDir =
    locale === "ar"
      ? (project.nameAr ? "rtl" : "ltr")
      : (project.nameEn ? "ltr" : "rtl");

  const tabCounts: Record<Tab, number | null> = {
    overview: null,
    contracts: contracts.length,
    invoices: projectInvoices.length,
    files: attachments.length,
    activity: activity.length,
  };

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <FolderKanban size={20} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                <span dir={projectDir}>
                  {projectName}
                </span>
              </h1>
              <Badge tone="gray" className="font-mono translate-y-0.5">
                {project.code}
              </Badge>
              {project.archivedAt ? (
                <Badge tone="gray" className="translate-y-0.5">{t("archived")}</Badge>
              ) : (
                <Badge tone="blue" className="translate-y-0.5">{t(`status.${project.status}`)}</Badge>
              )}
            </div>
          </div>
        </div>
        {canWrite ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/projects/${project.id}/edit`}>
              <Button type="button" variant="secondary" className="gap-1.5 font-medium shadow-xs">
                <Pencil size={15} aria-hidden="true" />
                <span>{t("edit")}</span>
              </Button>
            </Link>
            <ProjectActions
              projectId={project.id}
              status={project.status}
              archived={project.archivedAt !== null}
            />
          </div>
        ) : null}
      </div>

      <nav className="flex gap-1 overflow-x-auto border-b border-border/60">
        {TABS.map((value) => {
          const Icon = TAB_ICONS[value];
          const count = tabCounts[value];
          return (
            <Link
              key={value}
              href={`/projects/${project.id}?tab=${value}`}
              aria-current={tab === value ? "page" : undefined}
              className={cn(
                "inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
                tab === value
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon size={16} aria-hidden="true" />
              <span>{t(`tabs.${value}`)}</span>
              {count !== null ? (
                <span
                  className={cn(
                    "rounded px-1.5 py-0.5 text-[11px] font-mono font-medium",
                    tab === value
                      ? "bg-primary/15 text-primary"
                      : "bg-muted/60 text-muted-foreground",
                  )}
                >
                  {count}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>

      {tab === "overview" ? (
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader className="border-b border-border/40 pb-3">
              <CardTitle className="inline-flex items-center gap-2 text-base">
                <Compass size={18} className="text-primary" aria-hidden="true" />
                <span>{t("tabs.overview")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <Field label={t("client")} icon={Building2}>
                  <Link
                    href={`/clients/${client.id}`}
                    className="hover:text-primary transition-colors inline-flex items-center gap-1.5"
                  >
                    <span>
                      {(locale === "ar"
                        ? client.nameAr || client.nameEn
                        : client.nameEn || client.nameAr) ?? client.id}
                    </span>
                  </Link>
                </Field>
                <Field label={t("currency")} ltr icon={Coins}>
                  {project.currency}
                </Field>
                <Field label={t("statusLabel")} icon={Clock}>
                  <Badge tone={project.archivedAt ? "gray" : "blue"}>
                    {t(`status.${project.status}`)}
                  </Badge>
                </Field>
                <Field label={t("startDate")} ltr icon={Calendar}>
                  {project.startDate ?? "-"}
                </Field>
                <Field label={t("endDate")} ltr icon={Calendar}>
                  {project.endDate ?? "-"}
                </Field>
                {project.taskboardRef ? (
                  <Field label={t("taskboardRef")} ltr icon={ExternalLink}>
                    {taskboardHref ? (
                      <a
                        href={taskboardHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={t("taskboardOpen")}
                        className="text-primary hover:text-primary/80 no-underline inline-flex items-center gap-1"
                      >
                        <span>{project.taskboardRef}</span>
                        <ExternalLink size={12} aria-hidden />
                      </a>
                    ) : (
                      project.taskboardRef
                    )}
                  </Field>
                ) : null}
                {project.description ? (
                  <Field
                    label={t("description")}
                    className="sm:col-span-2 lg:col-span-3"
                  >
                    <span className="whitespace-pre-wrap leading-relaxed text-muted-foreground">
                      {project.description}
                    </span>
                  </Field>
                ) : null}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-border/40 pb-3">
              <CardTitle className="inline-flex items-center gap-2 text-base">
                <FileSpreadsheet size={18} className="text-primary" aria-hidden="true" />
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
                        className="flex flex-col gap-4 rounded border border-border/80 bg-background/40 p-4"
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
                            {overdue > 0 ? (
                              <span className="inline-flex items-center gap-1.5 font-semibold text-rose-500">
                                <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" />
                                <span>
                                  {t("summary.overdue")}:{" "}
                                  <strong className="font-mono">
                                    {money(overdue)}
                                  </strong>
                                </span>
                              </span>
                            ) : null}
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
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-foreground",
                              )}
                            >
                              {money(overdue)}
                            </span>
                          </div>
                          <div className="flex flex-col gap-0.5 rounded border border-border/70 bg-card p-2.5 shadow-2xs">
                            <span className="text-[11px] font-medium text-muted-foreground">
                              {t("summary.remaining")}
                            </span>
                            <span className="text-sm font-bold font-mono tabular-nums text-muted-foreground">
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

          <Card>
            <CardHeader>
              <CardTitle className="inline-flex items-center gap-2">
                <Layers size={18} className="text-primary" aria-hidden="true" />
                <span>{t("milestonesToInvoice")}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {milestones.length === 0 ? (
                <EmptyState title={t("noMilestonesToInvoice")} />
              ) : (
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableHeaderCell>{t("milestone")}</TableHeaderCell>
                      <TableHeaderCell className="text-end">
                        {tc("actions")}
                      </TableHeaderCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {milestones.map((milestone) => (
                      <TableRow key={milestone.milestoneId}>
                        <TableCell>{milestone.label}</TableCell>
                        <TableCell className="text-end">
                          {can(user, "invoices.write") ? (
                            <CreateInvoiceFromMilestoneButton
                              milestoneId={milestone.milestoneId}
                            />
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {tab === "contracts" ? (
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <FileText size={18} className="text-primary" aria-hidden="true" />
              <span>{t("tabs.contracts")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {contracts.length === 0 ? (
              <EmptyState title={t("noContracts")} />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>{tc("status")}</TableHeaderCell>
                    <TableHeaderCell>{t("name")}</TableHeaderCell>
                    <TableHeaderCell>{t("code")}</TableHeaderCell>
                    <TableHeaderCell className="text-end">
                      {tc("actions")}
                    </TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {contracts.map((contract) => (
                    <TableRow key={contract.id}>
                      <TableCell>
                        <Badge tone={contractStatusTone(contract.status)}>
                          {tcontracts(`status.${contract.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {(() => {
                          const contractTitle =
                            locale === "ar"
                              ? (contract.titleAr || contract.titleEn || "-")
                              : (contract.titleEn || contract.titleAr || "-");
                          const contractDir =
                            locale === "ar"
                              ? (contract.titleAr ? "rtl" : "ltr")
                              : (contract.titleEn ? "ltr" : "rtl");
                          return (
                            <Link
                              href={`/contracts/${contract.id}`}
                              className="font-medium text-foreground hover:text-primary"
                            >
                              <span dir={contractDir}>
                                {contractTitle}
                              </span>
                            </Link>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="text-start font-mono">
                        {contract.number ?? "-"}
                      </TableCell>
                      <TableCell className="text-end">
                        <Link
                          href={`/contracts/${contract.id}`}
                          className="text-sm text-muted-foreground hover:text-foreground"
                        >
                          {tc("preview")}
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "invoices" ? (
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <Receipt size={18} className="text-primary" aria-hidden="true" />
              <span>{t("tabs.invoices")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {projectInvoices.length === 0 ? (
              <EmptyState title={t("noInvoices")} />
            ) : (
              <Table>
                <TableHead>
                  <TableRow>
                    <TableHeaderCell>{tinvoices("number")}</TableHeaderCell>
                    <TableHeaderCell>{tc("status")}</TableHeaderCell>
                    <TableHeaderCell>{tinvoices("total")}</TableHeaderCell>
                    <TableHeaderCell>{tinvoices("dueDate")}</TableHeaderCell>
                    <TableHeaderCell className="text-end">
                      {tc("actions")}
                    </TableHeaderCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {projectInvoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="text-start font-mono">
                        {invoice.number ?? "-"}
                      </TableCell>
                      <TableCell>
                        <Badge tone={invoiceStatusTone(invoice.status)}>
                          {tinvoices(`status.${invoice.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-start tabular-nums">
                        {formatMoney(
                          invoice.totalMinor,
                          invoice.currency as CurrencyCode,
                          user.locale,
                        )}
                      </TableCell>
                      <TableCell className="text-start tabular-nums">
                        {invoice.dueDate ?? "-"}
                      </TableCell>
                      <TableCell className="text-end">
                        <Link
                          href={`/invoices/${invoice.id}`}
                          className="text-sm text-muted-foreground hover:text-foreground"
                        >
                          {tc("preview")}
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : null}

      {tab === "files" ? (
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <Paperclip size={18} className="text-primary" aria-hidden="true" />
              <span>{t("tabs.files")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectFiles
              projectId={project.id}
              attachments={attachments.map((attachment) => ({
                id: attachment.id,
                originalName: attachment.originalName,
                sizeBytes: attachment.sizeBytes,
              }))}
              canWrite={canWrite}
            />
          </CardContent>
        </Card>
      ) : null}

      {tab === "activity" ? (
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <History size={18} className="text-primary" aria-hidden="true" />
              <span>{t("tabs.activity")}</span>
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
                  </TableRow>
                </TableHead>
                <TableBody>
                  {activity.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatInstant(row.ts, "UTC", locale)}
                      </TableCell>
                      <TableCell dir="ltr">{row.action}</TableCell>
                      <TableCell dir="ltr" className="text-start text-xs">
                        {row.entityType}:{row.entityId}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
  ltr,
  className,
  icon: Icon,
}: {
  label: string;
  children: React.ReactNode;
  ltr?: boolean;
  className?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5 rounded border border-border/70 bg-card p-3 shadow-2xs transition-colors hover:border-primary/40", className)}>
      <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {Icon ? <Icon size={13} className="text-primary/70 shrink-0" aria-hidden /> : null}
        <span>{label}</span>
      </dt>
      <dd className="text-sm font-semibold tracking-tight text-foreground break-words" dir={ltr ? "ltr" : undefined}>
        {children}
      </dd>
    </div>
  );
}
