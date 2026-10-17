import Link from "next/link";
import { Plus, Receipt, RotateCcw, Search } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input, InputAdornment } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { InvoicesTable } from "@/components/tables/InvoicesTable";
import { FilterDropdown } from "@/components/tables/FilterDropdown";
import { deleteDraftInvoiceAction } from "@/server/actions/invoices";
import { INVOICE_STATUSES } from "@/lib/constants";
import { todayInTz } from "@/lib/dates";
import { can } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import {
  INVOICE_SORT_FIELDS,
  isOverdue,
  listInvoices,
} from "@/server/services/invoices";
import { listProjectOptions } from "@/server/services/projects";
import { getSettings } from "@/server/services/settings";
import { smoothLoading } from "@/lib/smooth-loader";

type SearchParams = Record<string, string | string[] | undefined>;

function readParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await smoothLoading();
  const user = await requireUserPage();
  const t = await getTranslations("invoices");
  const tc = await getTranslations("common");
  const rawLocale = await getLocale();
  const locale = rawLocale === "en" ? "en" : "ar";
  const params = await searchParams;

  const q = readParam(params.q);
  const statusParam = readParam(params.status);
  const status = (INVOICE_STATUSES as readonly string[]).includes(
    statusParam ?? "",
  )
    ? (statusParam as (typeof INVOICE_STATUSES)[number])
    : undefined;
  const projectId = readParam(params.projectId);
  const overdueParam = readParam(params.overdue);
  const overdue = overdueParam === "1" || overdueParam === "true";
  const sortParam = readParam(params.sort);
  const dirParam = readParam(params.dir);
  const pageParam = readParam(params.page);

  const { rows, total, page, pageSize } = listInvoices({
    q,
    status,
    projectId,
    overdue,
    sort: sortParam,
    dir: dirParam,
    page: pageParam ? Number(pageParam) : 1,
  });
  const today = todayInTz(getSettings("defaults").timezone);
  const projects = listProjectOptions();
  const canWrite = can(user, "invoices.write");
  const sort = (INVOICE_SORT_FIELDS as readonly string[]).includes(
    sortParam ?? "",
  )
    ? (sortParam as string)
    : "createdAt";
  const dir = dirParam === "asc" ? "asc" : "desc";

  const query: Record<string, string> = {};
  if (q) query.q = q;
  if (status) query.status = status;
  if (projectId) query.projectId = projectId;
  if (overdue) query.overdue = "1";
  if (sortParam) query.sort = sort;
  if (dirParam) query.dir = dir;

  const projectNames = Object.fromEntries(
    projects.map((project) => [
      project.id,
      (locale === "ar"
        ? project.nameAr || project.nameEn
        : project.nameEn || project.nameAr) ?? project.code,
    ]),
  );
  const tableRows = rows.map((row) => ({
    ...row,
    overdue: isOverdue(row, today),
  }));
  const labels = {
    number: t("number"),
    project: t("project"),
    statusLabel: t("statusLabel"),
    total: t("total"),
    dueDate: t("dueDate"),
    actions: tc("actions"),
    preview: tc("preview"),
    edit: tc("edit"),
    deleteTitle: t("deleteTitle"),
    deleteMessage: t("deleteMessage"),
    deleted: t("deleted"),
    overdue: t("overdue"),
    empty: t("empty"),
    statusValues: Object.fromEntries(
      INVOICE_STATUSES.map((value) => [value, t(`status.${value}`)]),
    ),
  };

  const hasActiveFilters = Boolean(
    q ||
      status ||
      projectId ||
      overdue ||
      (sortParam && sort !== "createdAt") ||
      (dirParam && dir !== "desc"),
  );
  const activeFilterCount =
    (status ? 1 : 0) +
    (projectId ? 1 : 0) +
    (overdue ? 1 : 0) +
    (sortParam && sort !== "createdAt" ? 1 : 0) +
    (dirParam && dir !== "desc" ? 1 : 0);

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <Receipt size={20} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
              <span className="inline-flex items-center rounded border border-border/60 bg-muted/40 px-2 py-0.5 text-xs font-mono font-medium text-muted-foreground translate-y-0.5">
                {total}
              </span>
            </div>
          </div>
        </div>
        {canWrite ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/invoices/new">
              <Button type="button" className="gap-1.5 font-medium shadow-xs">
                <Plus size={16} aria-hidden="true" />
                <span>{t("new")}</span>
              </Button>
            </Link>
          </div>
        ) : null}
      </div>

      <Card className="overflow-visible">
        <CardContent className="p-3 sm:p-4 overflow-visible">
          <form method="get" className="flex flex-col gap-2.5">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="flex flex-1 items-center gap-1.5 sm:gap-2">
                <div className="relative flex-1 min-w-0">
                  <Input
                    id="invoices-q"
                    name="q"
                    defaultValue={q ?? ""}
                    placeholder={t("searchPlaceholder")}
                    startAdornment={
                      <InputAdornment position="start">
                        <Search
                          size={16}
                          className="text-muted-foreground"
                          aria-hidden="true"
                        />
                      </InputAdornment>
                    }
                  />
                </div>
                <Button
                  type="submit"
                  variant="secondary"
                  className="shrink-0 gap-1.5 h-10 px-3 sm:px-4 border-border/80 font-medium"
                >
                  <Search size={15} aria-hidden="true" />
                  <span className="hidden sm:inline">{tc("search")}</span>
                </Button>

              <FilterDropdown
                label={tc("filter")}
                activeCount={activeFilterCount}
                title={tc("filterOptions")}
                applyLabel={tc("applyFilters")}
                resetLabel={tc("reset")}
                resetHref="/invoices"
              >
                <div>
                  <label
                    htmlFor="invoices-status"
                    className="mb-1 block text-xs font-semibold text-muted-foreground cursor-pointer select-none"
                  >
                    {labels.statusLabel}
                  </label>
                  <Select
                    id="invoices-status"
                    name="status"
                    defaultValue={status ?? ""}
                  >
                    <option value="">{t("allStatuses")}</option>
                    {INVOICE_STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {t(`status.${value}`)}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label
                    htmlFor="invoices-project"
                    className="mb-1 block text-xs font-semibold text-muted-foreground cursor-pointer select-none"
                  >
                    {labels.project}
                  </label>
                  <Select
                    id="invoices-project"
                    name="projectId"
                    defaultValue={projectId ?? ""}
                  >
                    <option value="">{t("allProjects")}</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.code} - {(locale === "ar" ? project.nameAr || project.nameEn : project.nameEn || project.nameAr) ?? ""}
                      </option>
                    ))}
                  </Select>
                </div>

                <label className="flex h-10 cursor-pointer items-center justify-between rounded border border-border/70 bg-muted/20 ps-3 pe-1 text-sm text-foreground hover:bg-muted/40 transition-colors select-none">
                  <span className="font-medium text-foreground">
                    {t("overdueOnly")}
                  </span>
                  <Checkbox
                    name="overdue"
                    value="1"
                    defaultChecked={overdue}
                    sx={{ p: 0.5 }}
                  />
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="invoices-sort"
                      className="mb-1 block text-xs font-semibold text-muted-foreground cursor-pointer select-none"
                    >
                      {tc("sort")}
                    </label>
                    <Select
                      id="invoices-sort"
                      name="sort"
                      defaultValue={sort}
                    >
                      {INVOICE_SORT_FIELDS.map((value) => (
                        <option key={value} value={value}>
                          {t(`sort.${value}`)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label
                      htmlFor="invoices-dir"
                      className="mb-1 block text-xs font-semibold text-muted-foreground cursor-pointer select-none"
                    >
                      {tc("direction")}
                    </label>
                    <Select
                      id="invoices-dir"
                      name="dir"
                      defaultValue={dir}
                    >
                      <option value="desc">{tc("desc")}</option>
                      <option value="asc">{tc("asc")}</option>
                    </Select>
                  </div>
                </div>
              </FilterDropdown>

              {hasActiveFilters ? (
                <Link href="/invoices" className="shrink-0 no-underline">
                  <Button
                    type="button"
                    variant="secondary"
                    className="gap-1.5 h-10 px-3"
                  >
                    <RotateCcw size={15} aria-hidden="true" />
                    <span>{tc("reset")}</span>
                  </Button>
                </Link>
              ) : null}
            </div>
          </div>

            {hasActiveFilters ? (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-border/40 pt-2.5 text-xs text-muted-foreground">
                <span className="font-medium text-foreground ms-0.5">
                  {tc("activeFilters")}:
                </span>
                {q ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-foreground">
                    <span>{tc("search")}: {q}</span>
                  </span>
                ) : null}
                {status ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-foreground">
                    <span>{labels.statusLabel}: {labels.statusValues[status] ?? status}</span>
                  </span>
                ) : null}
                {projectId ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-foreground">
                    <span>{labels.project}: {projectNames[projectId] ?? projectId}</span>
                  </span>
                ) : null}
                {overdue ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-foreground">
                    <span>{t("overdueOnly")}</span>
                  </span>
                ) : null}
                {sortParam && sort !== "createdAt" ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-foreground">
                    <span>{tc("sort")}: {t(`sort.${sort}`)}</span>
                  </span>
                ) : null}
                {dirParam && dir !== "desc" ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-foreground">
                    <span>{tc("direction")}: {tc("asc")}</span>
                  </span>
                ) : null}
                <Link
                  href="/invoices"
                  className="ms-auto text-xs text-muted-foreground hover:text-foreground no-underline"
                >
                  {tc("clearFilters")}
                </Link>
              </div>
            ) : null}
          </form>
        </CardContent>
      </Card>

      <div className="rounded border border-border bg-card overflow-hidden">
        <InvoicesTable
          rows={tableRows}
          total={total}
          page={page}
          pageSize={pageSize}
          query={query}
          canWrite={canWrite}
          labels={labels}
          projectNames={projectNames}
          deleteAction={deleteDraftInvoiceAction}
        />
      </div>
    </div>
  );
}
