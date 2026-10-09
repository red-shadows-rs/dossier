import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
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

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<SearchParams>;
}) {
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
  const contracts = listProjectContracts(id);
  const summary = getProjectSummary(id);
  const milestones = listInvoiceableMilestones(id);
  const projectInvoices = listInvoices({ projectId: id, page: 1 }).rows;
  const attachments = listProjectAttachments(id);
  const activity = listProjectActivity(id);
  const rawLocale = await getLocale();
  const locale = isLocale(rawLocale) ? rawLocale : "ar";
  const taskboardHref = resolveTaskboardUrl(
    project.taskboardRef,
    env.TASKBOARD_API_URL,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">
            <span dir="rtl" lang="ar">
              {project.nameAr ?? project.nameEn ?? "—"}
            </span>
          </h1>
          <Badge tone="gray" className="font-mono">
            {project.code}
          </Badge>
          {project.archivedAt ? (
            <Badge tone="gray">{t("archived")}</Badge>
          ) : (
            <Badge tone="blue">{t(`status.${project.status}`)}</Badge>
          )}
        </div>
        {canWrite ? (
          <div className="flex items-center gap-2">
            <Link href={`/projects/${project.id}/edit`}>
              <Button type="button" variant="secondary">
                {t("edit")}
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

      <nav className="flex gap-1 overflow-x-auto border-b border-border">
        {TABS.map((value) => (
          <Link
            key={value}
            href={`/projects/${project.id}?tab=${value}`}
            aria-current={tab === value ? "page" : undefined}
            className={cn(
              "whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors",
              tab === value
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {t(`tabs.${value}`)}
          </Link>
        ))}
      </nav>

      {tab === "overview" ? (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t("tabs.overview")}</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <Field label={t("client")}>
                  <Link
                    href={`/clients/${client.id}`}
                    className="hover:text-primary"
                  >
                    {client.nameAr ?? client.nameEn ?? client.id}
                  </Link>
                </Field>
                <Field label={t("currency")} ltr>
                  {project.currency}
                </Field>
                <Field label={t("statusLabel")}>
                  {t(`status.${project.status}`)}
                </Field>
                <Field label={t("startDate")} ltr>
                  {project.startDate ?? "—"}
                </Field>
                <Field label={t("endDate")} ltr>
                  {project.endDate ?? "—"}
                </Field>
                {project.taskboardRef ? (
                  <Field label={t("taskboardRef")} ltr>
                    {taskboardHref ? (
                      <a
                        href={taskboardHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={t("taskboardOpen")}
                        className="text-primary hover:underline"
                      >
                        {project.taskboardRef}
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
                    <span className="whitespace-pre-wrap">
                      {project.description}
                    </span>
                  </Field>
                ) : null}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("summary.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              {summary.length === 0 ? (
                <EmptyState title={t("summary.empty")} />
              ) : (
                <div className="flex flex-col gap-4">
                  {summary.map((row) => {
                    const currency = row.currency as CurrencyCode;
                    const money = (minor: number) =>
                      formatMoney(minor, currency, "en");
                    return (
                      <dl
                        key={row.currency}
                        className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6"
                        dir="ltr"
                      >
                        <Field label={t("summary.contracted")}>
                          {money(row.contractedMinor)}
                        </Field>
                        <Field label={t("summary.invoiced")}>
                          {money(row.invoicedMinor)}
                        </Field>
                        <Field label={t("summary.paid")}>
                          {money(row.paidMinor)}
                        </Field>
                        <Field label={t("summary.outstanding")}>
                          {money(row.outstandingMinor)}
                        </Field>
                        <Field label={t("summary.overdue")}>
                          {money(row.overdueMinor)}
                        </Field>
                        <Field label={t("summary.remaining")}>
                          {money(row.remainingToInvoiceMinor)}
                        </Field>
                      </dl>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("milestonesToInvoice")}</CardTitle>
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
            <CardTitle>{t("tabs.contracts")}</CardTitle>
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
                        <Link
                          href={`/contracts/${contract.id}`}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          <span dir="rtl" lang="ar">
                            {contract.titleAr ?? contract.titleEn ?? "—"}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell dir="ltr" className="text-start font-mono">
                        {contract.number ?? "—"}
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
            <CardTitle>{t("tabs.invoices")}</CardTitle>
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
                      <TableCell dir="ltr" className="text-start font-mono">
                        {invoice.number ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge tone={invoiceStatusTone(invoice.status)}>
                          {tinvoices(`status.${invoice.status}`)}
                        </Badge>
                      </TableCell>
                      <TableCell dir="ltr" className="text-start tabular-nums">
                        {formatMoney(
                          invoice.totalMinor,
                          invoice.currency as CurrencyCode,
                          "en",
                        )}
                      </TableCell>
                      <TableCell dir="ltr" className="text-start">
                        {invoice.dueDate ?? "—"}
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
            <CardTitle>{t("tabs.files")}</CardTitle>
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
            <CardTitle>{t("tabs.activity")}</CardTitle>
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
}: {
  label: string;
  children: React.ReactNode;
  ltr?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground" dir={ltr ? "ltr" : undefined}>
        {children}
      </dd>
    </div>
  );
}
