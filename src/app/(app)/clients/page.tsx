// Dossier - Clients Page
// https://github.com/red-shadows-rs/dossier

import type { Metadata } from "next";
import Link from "next/link";
import { Plus, RotateCcw, Search, Users } from "lucide-react";
import { getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return {
    title: t("clients"),
  };
}
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input, InputAdornment } from "@/components/ui/Input";
import { ClientsTable } from "@/components/tables/ClientsTable";
import { FilterDropdown } from "@/components/tables/FilterDropdown";
import { archiveClientAction, deleteClientAction } from "@/server/actions/clients";
import { CLIENT_TYPES } from "@/lib/constants";
import { can } from "@/lib/permissions";
import { withDbInstance } from "@/db";
import { requireUserPage } from "@/server/auth/require-user";
import { isDemoUser } from "@/server/services/demo";
import { listClients } from "@/server/services/clients";
import { smoothLoading } from "@/lib/smooth-loader";

type SearchParams = Record<string, string | string[] | undefined>;

function readParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await smoothLoading();
  const user = await requireUserPage();
  const isDemo = isDemoUser(user.email);

  return withDbInstance(isDemo, async () => {
    const t = await getTranslations("clients");
    const tc = await getTranslations("common");
    const params = await searchParams;

  const q = readParam(params.q);
  const archivedParam = readParam(params.archived);
  const archived = archivedParam === "1" || archivedParam === "true";
  const pageParam = readParam(params.page);
  const { rows, total, page, pageSize } = listClients({
    q,
    archived,
    page: pageParam ? Number(pageParam) : 1,
  });
  const canWrite = can(user, "clients.write");

  const query: Record<string, string> = {};
  if (q) query.q = q;
  if (archived) query.archived = "1";

  const labels = {
    name: t("name"),
    typeLabel: t("typeLabel"),
    email: t("email"),
    phone: t("phone"),
    city: t("city"),
    status: tc("status"),
    active: t("active"),
    archived: t("archived"),
    actions: tc("actions"),
    preview: tc("preview"),
    edit: tc("edit"),
    archive: t("archive"),
    archiveConfirm: t("archiveConfirm"),
    archivedToast: t("archivedToast"),
    delete: t("delete"),
    deleteConfirm: t("deleteConfirm"),
    deletedToast: t("deletedToast"),
    empty: t("empty"),
    typeValues: Object.fromEntries(
      CLIENT_TYPES.map((type) => [type, t(`type.${type}`)]),
    ),
  };

  const hasActiveFilters = Boolean(q || archived);
  const activeFilterCount = archived ? 1 : 0;

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <Users size={20} aria-hidden="true" />
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
            <Link href="/clients/new">
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
                    id="clients-q"
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
                  resetHref="/clients"
                >
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
                  <Link href="/clients" className="shrink-0 no-underline">
                    <Button
                      type="button"
                      variant="secondary"
                      className="gap-1.5 h-10 px-3"
                    >
                      <RotateCcw size={15} aria-hidden="true" />
                      <span className="hidden sm:inline">{tc("reset")}</span>
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
                {archived ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-foreground">
                    <span>{t("includeArchived")}</span>
                  </span>
                ) : null}
                <Link
                  href="/clients"
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
        <ClientsTable
          rows={rows}
          total={total}
          page={page}
          pageSize={pageSize}
          query={query}
          canWrite={canWrite}
          labels={labels}
          archiveAction={archiveClientAction}
          deleteAction={deleteClientAction}
        />
      </div>
    </div>
    );
  });
}