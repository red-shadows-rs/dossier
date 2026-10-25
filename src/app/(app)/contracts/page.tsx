// Dossier - Contracts Page
// https://github.com/red-shadows-rs/dossier

import type { Metadata } from "next";
import Link from "next/link";
import { FileText, Plus, RotateCcw, Search } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return {
    title: t("contracts"),
  };
}
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input, InputAdornment } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ContractsTable } from "@/components/tables/ContractsTable";
import { FilterDropdown } from "@/components/tables/FilterDropdown";
import {
  deleteDraftContractAction,
  duplicateContractAction,
} from "@/server/actions/contracts";
import { CONTRACT_STATUSES } from "@/lib/constants";
import { can } from "@/lib/permissions";
import { withDbInstance } from "@/db";
import { requireUserPage } from "@/server/auth/require-user";
import { isDemoUser } from "@/server/services/demo";
import {
  CONTRACT_SORT_FIELDS,
  listContracts,
} from "@/server/services/contracts";
import { listProjectOptions } from "@/server/services/projects";
import { smoothLoading } from "@/lib/smooth-loader";

type SearchParams = Record<string, string | string[] | undefined>;

function readParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await smoothLoading();
  const user = await requireUserPage();
  const isDemo = isDemoUser(user.email);

  return withDbInstance(isDemo, async () => {
    const t = await getTranslations("contracts");
    const tc = await getTranslations("common");
    const params = await searchParams;

  const q = readParam(params.q);
  const statusParam = readParam(params.status);
  const status = (CONTRACT_STATUSES as readonly string[]).includes(
    statusParam ?? "",
  )
    ? (statusParam as (typeof CONTRACT_STATUSES)[number])
    : undefined;
  const projectId = readParam(params.projectId);
  const sortParam = readParam(params.sort);
  const dirParam = readParam(params.dir);
  const pageParam = readParam(params.page);

  const { rows, total, page, pageSize } = listContracts({
    q,
    status,
    projectId,
    sort: sortParam,
    dir: dirParam,
    page: pageParam ? Number(pageParam) : 1,
  });
  const projects = listProjectOptions();
  const canWrite = can(user, "contracts.write");
  const sort = (CONTRACT_SORT_FIELDS as readonly string[]).includes(
    sortParam ?? "",
  )
    ? (sortParam as string)
    : "createdAt";
  const dir = dirParam === "asc" ? "asc" : "desc";

  const query: Record<string, string> = {};
  if (q) query.q = q;
  if (status) query.status = status;
  if (projectId) query.projectId = projectId;
  if (sortParam) query.sort = sort;
  if (dirParam) query.dir = dir;

  const projectMap = Object.fromEntries(projects.map((p) => [p.id, p]));

  const labels = {
    number: t("number"),
    name: t("name"),
    statusLabel: t("statusLabel"),
    actions: tc("actions"),
    preview: tc("preview"),
    edit: tc("edit"),
    deleteTitle: t("deleteConfirmTitle"),
    deleteMessage: t("deleteConfirm"),
    deleted: t("deleted"),
    empty: t("empty"),
    emptyHint: t("emptyHint"),
    newContract: t("new"),
    duplicate: t("duplicate"),
    duplicateConfirm: t("duplicateConfirm"),
    duplicatedToast: t("duplicatedToast"),
    statusValues: Object.fromEntries(
      CONTRACT_STATUSES.map((value) => [value, t(`status.${value}`)]),
    ),
  };

  const hasActiveFilters = Boolean(
    q ||
      status ||
      projectId ||
      (sort && sort !== "createdAt") ||
      (dir && dir !== "desc"),
  );
  const activeFilterCount =
    (status ? 1 : 0) +
    (projectId ? 1 : 0) +
    (sort && sort !== "createdAt" ? 1 : 0) +
    (dir && dir !== "desc" ? 1 : 0);

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <FileText size={20} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
              <span className="inline-flex items-center rounded border border-border/60 bg-muted/40 px-2 py-0.5 text-xs font-mono font-medium text-muted-foreground">
                {total}
              </span>
            </div>
          </div>
        </div>
        {canWrite ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/contracts/new">
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
                    id="contracts-q"
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
                resetHref="/contracts"
              >
                <div>
                  <label
                    htmlFor="contracts-status"
                    className="mb-1 block text-xs font-semibold text-muted-foreground cursor-pointer select-none"
                  >
                    {t("allStatuses")}
                  </label>
                  <Select
                    id="contracts-status"
                    name="status"
                    defaultValue={status ?? ""}
                  >
                    <option value="">{t("allStatuses")}</option>
                    {CONTRACT_STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {t(`status.${value}`)}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label
                    htmlFor="contracts-project"
                    className="mb-1 block text-xs font-semibold text-muted-foreground cursor-pointer select-none"
                  >
                    {t("allProjects")}
                  </label>
                  <Select
                    id="contracts-project"
                    name="projectId"
                    defaultValue={projectId ?? ""}
                  >
                    <option value="">{t("allProjects")}</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.code} - {project.nameAr ?? project.nameEn ?? ""}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                    htmlFor="contracts-sort"
                    className="mb-1 block text-xs font-semibold text-muted-foreground cursor-pointer select-none"
                  >
                      {tc("sort")}
                    </label>
                    <Select
                      id="contracts-sort"
                      name="sort"
                      defaultValue={sort}
                    >
                      {CONTRACT_SORT_FIELDS.map((value) => (
                        <option key={value} value={value}>
                          {t(`sort.${value}`)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label
                    htmlFor="contracts-dir"
                    className="mb-1 block text-xs font-semibold text-muted-foreground cursor-pointer select-none"
                  >
                      {tc("direction")}
                    </label>
                    <Select
                      id="contracts-dir"
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
                <Link href="/contracts" className="shrink-0 no-underline">
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
                    <span>{labels.statusLabel}: {t(`status.${status}`)}</span>
                  </span>
                ) : null}
                {projectId ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-foreground">
                    <span>{t("project")}: {projectMap[projectId]?.code ?? projectId}</span>
                  </span>
                ) : null}
                {sort && sort !== "createdAt" ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-foreground">
                    <span>{tc("sort")}: {t(`sort.${sort}`)}</span>
                  </span>
                ) : null}
                {dir && dir !== "desc" ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-foreground">
                    <span>{tc("direction")}: {tc("asc")}</span>
                  </span>
                ) : null}
                <Link
                  href="/contracts"
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
        <ContractsTable
          rows={rows}
          total={total}
          page={page}
          pageSize={pageSize}
          query={query}
          canWrite={canWrite}
          labels={labels}
          deleteAction={deleteDraftContractAction}
          duplicateAction={duplicateContractAction}
        />
      </div>
    </div>
    );
  });
}
