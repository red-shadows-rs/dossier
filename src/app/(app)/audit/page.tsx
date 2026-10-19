// Dossier - Audit Page
// https://github.com/red-shadows-rs/dossier

import type { Metadata } from "next";
import Link from "next/link";
import { RotateCcw, Search, ShieldCheck } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("nav");
  return {
    title: t("audit"),
  };
}
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { DatePicker } from "@/components/ui/DatePicker";
import { Input, InputAdornment } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { AuditTable } from "@/components/tables/AuditTable";
import { FilterDropdown } from "@/components/tables/FilterDropdown";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { isLocale } from "@/lib/i18n";
import { assertCan } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { listAuditEntries } from "@/server/services/audit";
import { smoothLoading } from "@/lib/smooth-loader";

type SearchParams = Record<string, string | string[] | undefined>;

function readParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await smoothLoading();
  const user = await requireUserPage();
  assertCan(user, "audit.read");

  const t = await getTranslations("audit");
  const tc = await getTranslations("common");
  const rawLocale = await getLocale();
  const locale = isLocale(rawLocale) ? rawLocale : user.locale;
  const params = await searchParams;

  const q = readParam(params.q);
  const entityType = readParam(params.entityType);
  const entityId = readParam(params.entityId);
  const action = readParam(params.action);
  const from = readParam(params.from);
  const to = readParam(params.to);
  const pageRaw = readParam(params.page);
  const requestedPage = pageRaw ? Number(pageRaw) : 1;

  const { rows, total, page, pageSize } = listAuditEntries({
    q,
    entityType,
    entityId,
    action,
    from,
    to,
    page: requestedPage,
  });

  const query: Record<string, string> = {};
  if (q) query.q = q;
  if (entityType) query.entityType = entityType;
  if (entityId) query.entityId = entityId;
  if (action) query.action = action;
  if (from) query.from = from;
  if (to) query.to = to;

  const hasActiveFilters = Boolean(
    q || entityType || entityId || action || from || to,
  );
  const activeFilterCount =
    (entityType ? 1 : 0) +
    (entityId ? 1 : 0) +
    (action ? 1 : 0) +
    (from ? 1 : 0) +
    (to ? 1 : 0);

  const ENTITY_TYPE_OPTIONS = [
    "invoice",
    "contract",
    "client",
    "project",
    "user",
    "setting",
    "payment",
    "file",
    "system",
  ] as const;

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <ShieldCheck size={20} aria-hidden="true" />
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
      </div>

      <Card className="overflow-visible">
        <CardContent className="p-3 sm:p-4 overflow-visible">
          <form method="get" className="flex flex-col gap-2.5">
            <div className="flex items-center gap-1.5 sm:gap-2 w-full">
              <div className="relative flex-1 min-w-0">
                <Input
                  id="audit-q"
                  name="q"
                  defaultValue={q ?? ""}
                  placeholder={t("searchPlaceholder")}
                  className="text-start"
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
                resetHref="/audit"
              >
                <div>
                  <label
                    htmlFor="entityType"
                    className="mb-1 block text-xs font-semibold text-muted-foreground cursor-pointer select-none"
                  >
                    {t("entityType")}
                  </label>
                  <Select id="entityType" name="entityType" defaultValue={entityType ?? ""}>
                    <option value="">{t("allEntityTypes")}</option>
                    {ENTITY_TYPE_OPTIONS.map((val) => (
                      <option key={val} value={val}>
                        {t(`entityTypes.${val}`)} ({val})
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label
                    htmlFor="action"
                    className="mb-1 block text-xs font-semibold text-muted-foreground cursor-pointer select-none"
                  >
                    {t("action")}
                  </label>
                  <Select id="action" name="action" defaultValue={action ?? ""}>
                    <option value="">{t("allActions")}</option>
                    {AUDIT_ACTIONS.map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label
                    htmlFor="entityId"
                    className="mb-1 block text-xs font-semibold text-muted-foreground cursor-pointer select-none"
                  >
                    {t("entityId")}
                  </label>
                  <Input
                    id="entityId"
                    name="entityId"
                    dir="ltr"
                    defaultValue={entityId ?? ""}
                    placeholder="INV-0001, CNT-..., Dxp9..."
                    className="text-start"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      htmlFor="from"
                      className="mb-1 block text-xs font-semibold text-muted-foreground cursor-pointer select-none"
                    >
                      {t("from")}
                    </label>
                    <DatePicker
                      id="from"
                      name="from"
                      defaultValue={from ?? ""}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="to"
                      className="mb-1 block text-xs font-semibold text-muted-foreground cursor-pointer select-none"
                    >
                      {t("to")}
                    </label>
                    <DatePicker
                      id="to"
                      name="to"
                      defaultValue={to ?? ""}
                    />
                  </div>
                </div>
              </FilterDropdown>

              {hasActiveFilters ? (
                <Link href="/audit" className="shrink-0 no-underline">
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
                {entityType ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-foreground">
                    <span>{t("entityType")}: {t(`entityTypes.${entityType}`) ?? entityType}</span>
                  </span>
                ) : null}
                {entityId ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-foreground font-mono">
                    <span>{t("entityId")}: {entityId}</span>
                  </span>
                ) : null}
                {action ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-foreground font-mono">
                    <span>{t("action")}: {action}</span>
                  </span>
                ) : null}
                {from ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-foreground">
                    <span>{t("from")}: {from}</span>
                  </span>
                ) : null}
                {to ? (
                  <span className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-foreground">
                    <span>{t("to")}: {to}</span>
                  </span>
                ) : null}
                <Link
                  href="/audit"
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
        <AuditTable
          rows={rows}
          total={total}
          page={page}
          pageSize={pageSize}
          basePath="/audit"
          query={query}
          locale={locale}
          labels={{
            when: t("when"),
            actor: t("actor"),
            action: t("action"),
            entity: t("entity"),
            ip: t("ip"),
            empty: tc("noResults"),
            actorTypes: Object.fromEntries(
              ["system", "user", "signer"].map((type) => [
                type,
                t(`actorType.${type}`),
              ]),
            ),
          }}
        />
      </div>
    </div>
  );
}
