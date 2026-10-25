// Dossier - Subscriptions Page
// https://github.com/red-shadows-rs/dossier

import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Plus, Search } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Input, InputAdornment } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { SubscriptionsTable } from "@/components/tables/SubscriptionsTable";
import { FilterDropdown } from "@/components/tables/FilterDropdown";
import { duplicateSubscriptionAction } from "@/server/actions/subscriptions";
import { withDbInstance } from "@/db";
import {
  SUBSCRIPTION_FREQUENCIES,
  SUBSCRIPTION_STATUSES,
  type SubscriptionFrequency,
  type SubscriptionStatus,
} from "@/lib/constants";
import { can } from "@/lib/permissions";
import { smoothLoading } from "@/lib/smooth-loader";
import { requireUserPage } from "@/server/auth/require-user";
import { listClientOptions } from "@/server/services/clients";
import { isDemoUser } from "@/server/services/demo";
import { listSubscriptions } from "@/server/services/subscriptions";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("subscriptions");
  return {
    title: t("title"),
  };
}

type SearchParams = Record<string, string | string[] | undefined>;

function readParam(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  await smoothLoading();
  const user = await requireUserPage();
  const isDemo = isDemoUser(user.email);

  return withDbInstance(isDemo, async () => {
    const t = await getTranslations("subscriptions");
    const tc = await getTranslations("common");
    const rawLocale = await getLocale();
    const locale = rawLocale === "en" ? "en" : "ar";
    const params = await searchParams;

    const q = readParam(params.q);
    const statusParam = readParam(params.status);
    const status = (SUBSCRIPTION_STATUSES as readonly string[]).includes(
      statusParam ?? "",
    )
      ? (statusParam as SubscriptionStatus)
      : undefined;

    const frequencyParam = readParam(params.frequency);
    const frequency = (SUBSCRIPTION_FREQUENCIES as readonly string[]).includes(
      frequencyParam ?? "",
    )
      ? (frequencyParam as SubscriptionFrequency)
      : undefined;

    const clientId = readParam(params.clientId);
    const sortParam = readParam(params.sort) as
      | "createdAt"
      | "nextRunDate"
      | "number"
      | "total"
      | undefined;
    const dirParam = readParam(params.dir) as "asc" | "desc" | undefined;
    const pageParam = readParam(params.page);

    const { rows, total, page, pageSize } = listSubscriptions(
      {
        q,
        status,
        frequency,
        clientId,
        sort: sortParam,
        dir: dirParam,
        page: pageParam ? Number(pageParam) : 1,
      },
      locale,
    );

    const clients = listClientOptions();
    const canWrite = can(user, "subscriptions.write");

    const query: Record<string, string> = {};
    if (q) query.q = q;
    if (status) query.status = status;
    if (frequency) query.frequency = frequency;
    if (clientId) query.clientId = clientId;
    if (sortParam) query.sort = sortParam;
    if (dirParam) query.dir = dirParam;

    const activeFilterCount =
      (status ? 1 : 0) + (frequency ? 1 : 0) + (clientId ? 1 : 0);

    const labels = {
      number: t("subscriptionNumber"),
      title: t("subscriptionTitle"),
      client: t("client"),
      frequency: t("frequency"),
      nextRunDate: t("nextRunDate"),
      total: t("amount"),
      statusLabel: t("status"),
      actions: tc("actions"),
      preview: tc("preview"),
      edit: tc("edit"),
      empty: t("empty"),
      emptyHint: t("emptyHint"),
      newSubscription: t("new"),
      duplicate: t("duplicate"),
      duplicateConfirm: t("duplicateConfirm"),
      duplicatedToast: t("duplicatedToast"),
      clearFilters: tc("clearFilters"),
      statusValues: {
        active: t("statuses.active"),
        paused: t("statuses.paused"),
        completed: t("statuses.completed"),
        canceled: t("statuses.canceled"),
      },
      frequencyValues: {
        monthly: t("frequencies.monthly"),
        quarterly: t("frequencies.quarterly"),
        semi_annual: t("frequencies.semi_annual"),
        annual: t("frequencies.annual"),
        weekly: t("frequencies.weekly"),
        custom: t("frequencies.custom"),
      },
    };

    return (
      <div className="flex flex-col gap-5 sm:gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
              <CalendarClock size={20} aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {t("title")}
                </h1>
                <span className="inline-flex items-center rounded border border-border/60 bg-muted/40 px-2 py-0.5 text-xs font-mono font-medium text-muted-foreground translate-y-0.5">
                  {total}
                </span>
              </div>
            </div>
          </div>
          {canWrite ? (
            <div className="flex flex-wrap items-center gap-2">
              <Link href="/subscriptions/new">
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
                      id="subscriptions-q"
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
                    resetHref="/subscriptions"
                  >
                    <div>
                      <label
                        htmlFor="subscriptions-status"
                        className="mb-1 block text-xs font-semibold text-muted-foreground cursor-pointer select-none"
                      >
                        {t("status")}
                      </label>
                      <Select
                        id="subscriptions-status"
                        name="status"
                        defaultValue={status ?? ""}
                      >
                        <option value="">{tc("all")}</option>
                        {SUBSCRIPTION_STATUSES.map((value) => (
                          <option key={value} value={value}>
                            {t(`statuses.${value}`)}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <label
                        htmlFor="subscriptions-frequency"
                        className="mb-1 block text-xs font-semibold text-muted-foreground cursor-pointer select-none"
                      >
                        {t("frequency")}
                      </label>
                      <Select
                        id="subscriptions-frequency"
                        name="frequency"
                        defaultValue={frequency ?? ""}
                      >
                        <option value="">{tc("all")}</option>
                        {SUBSCRIPTION_FREQUENCIES.map((value) => (
                          <option key={value} value={value}>
                            {t(`frequencies.${value}`)}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div>
                      <label
                        htmlFor="subscriptions-client"
                        className="mb-1 block text-xs font-semibold text-muted-foreground cursor-pointer select-none"
                      >
                        {t("client")}
                      </label>
                      <Select
                        id="subscriptions-client"
                        name="clientId"
                        defaultValue={clientId ?? ""}
                      >
                        <option value="">{tc("all")}</option>
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {locale === "ar"
                              ? c.nameAr || c.nameEn
                              : c.nameEn || c.nameAr}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </FilterDropdown>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="rounded border border-border bg-card overflow-hidden">
          <SubscriptionsTable
            rows={rows}
            total={total}
            page={page}
            pageSize={pageSize}
            query={query}
            canWrite={canWrite}
            labels={labels}
            duplicateAction={duplicateSubscriptionAction}
          />
        </div>
      </div>
    );
  });
}

