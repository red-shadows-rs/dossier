// Dossier - Projects Page
// https://github.com/red-shadows-rs/dossier

import type { Metadata } from "next";
import Link from "next/link";
import { FolderKanban, Plus, RotateCcw, Search } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return {
    title: t("projects"),
  };
}
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input, InputAdornment } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ProjectsTable } from "@/components/tables/ProjectsTable";
import { FilterDropdown } from "@/components/tables/FilterDropdown";
import { archiveProjectAction } from "@/server/actions/projects";
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/constants";
import { can } from "@/lib/permissions";
import { withDbInstance } from "@/db";
import { requireUserPage } from "@/server/auth/require-user";
import { isDemoUser } from "@/server/services/demo";
import { listClientOptions } from "@/server/services/clients";
import { listProjects } from "@/server/services/projects";
import { smoothLoading } from "@/lib/smooth-loader";

type SearchParams = Record<string, string | string[] | undefined>;

function readParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await smoothLoading();
  const user = await requireUserPage();
  const isDemo = isDemoUser(user.email);

  return withDbInstance(isDemo, async () => {
    const t = await getTranslations("projects");
    const tc = await getTranslations("common");
    const rawLocale = await getLocale();
    const locale = rawLocale === "en" ? "en" : "ar";
    const params = await searchParams;

  const q = readParam(params.q);
  const statusParam = readParam(params.status);
  const status = (PROJECT_STATUSES as readonly string[]).includes(
    statusParam ?? "",
  )
    ? (statusParam as ProjectStatus)
    : undefined;
  const clientId = readParam(params.clientId);
  const archivedParam = readParam(params.archived);
  const archived = archivedParam === "1" || archivedParam === "true";
  const pageParam = readParam(params.page);

  const { rows, total, page, pageSize } = listProjects({
    q,
    status,
    clientId,
    archived,
    page: pageParam ? Number(pageParam) : 1,
  });
  const clients = listClientOptions();
  const canWrite = can(user, "projects.write");

  const query: Record<string, string> = {};
  if (q) query.q = q;
  if (status) query.status = status;
  if (clientId) query.clientId = clientId;
  if (archived) query.archived = "1";

  const clientNames = Object.fromEntries(
    clients.map((client) => [
      client.id,
      (locale === "ar"
        ? client.nameAr || client.nameEn
        : client.nameEn || client.nameAr) ?? "",
    ]),
  );
  const labels = {
    code: t("code"),
    name: t("name"),
    client: t("client"),
    statusLabel: t("statusLabel"),
    currency: t("currency"),
    actions: tc("actions"),
    preview: tc("preview"),
    edit: tc("edit"),
    archive: t("archive"),
    archiveConfirm: t("archiveConfirm"),
    archivedToast: t("archivedToast"),
    empty: t("empty"),
    emptyHint: t("emptyHint"),
    newProject: t("new"),
    statusValues: Object.fromEntries(
      PROJECT_STATUSES.map((value) => [value, t(`status.${value}`)]),
    ),
  };

  const hasActiveFilters = Boolean(q || status || clientId || archived);
  const activeFilterCount =
    (status ? 1 : 0) + (clientId ? 1 : 0) + (archived ? 1 : 0);

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <FolderKanban size={20} aria-hidden="true" />
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
            <Link href="/projects/new">
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
            <div className="flex items-center gap-1.5 sm:gap-2 w-full">
              <div className="relative flex-1 min-w-0">
                <Input
                  id="projects-q"
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
                aria-label={tc("search")}
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
                resetHref="/projects"
              >
                <div>
                  <label
                    htmlFor="projects-status"
                    className="mb-1 block text-xs font-semibold text-muted-foreground cursor-pointer select-none"
                  >
                    {labels.statusLabel}
                  </label>
                  <Select
                    id="projects-status"
                    name="status"
                    defaultValue={status ?? ""}
                  >
                    <option value="">{t("allStatuses")}</option>
                    {PROJECT_STATUSES.map((value) => (
                      <option key={value} value={value}>
                        {t(`status.${value}`)}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label
                    htmlFor="projects-client"
                    className="mb-1 block text-xs font-semibold text-muted-foreground cursor-pointer select-none"
                  >
                    {labels.client}
                  </label>
                  <Select
                    id="projects-client"
                    name="clientId"
                    defaultValue={clientId ?? ""}
                  >
                    <option value="">{t("allClients")}</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {(locale === "ar"
                          ? client.nameAr || client.nameEn
                          : client.nameEn || client.nameAr) ?? client.id}
                      </option>
                    ))}
                  </Select>
                </div>

                <label className="flex h-10 cursor-pointer items-center justify-between rounded border border-border/70 bg-muted/20 ps-3 pe-1 text-sm text-foreground hover:bg-muted/40 transition-colors select-none">
                  <span className="font-medium text-foreground">
                    {t("includeArchived")}
                  </span>
                  <Checkbox
                    name="archived"
                    value="1"
                    defaultChecked={archived}
                    sx={{ p: 0.5 }}
                  />
                </label>
              </FilterDropdown>

              {hasActiveFilters ? (
                <Link href="/projects" className="shrink-0 no-underline">
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
                {clientId ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-foreground">
                    <span>{labels.client}: {clientNames[clientId] ?? clientId}</span>
                  </span>
                ) : null}
                {archived ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-foreground">
                    <span>{t("includeArchived")}</span>
                  </span>
                ) : null}
                <Link
                  href="/projects"
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
        <ProjectsTable
          rows={rows}
          total={total}
          page={page}
          pageSize={pageSize}
          query={query}
          canWrite={canWrite}
          labels={labels}
          clientNames={clientNames}
          archiveAction={archiveProjectAction}
        />
      </div>
    </div>
    );
  });
}
