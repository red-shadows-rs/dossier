import Link from "next/link";
import { Filter, Plus, RotateCcw } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { ClientsTable } from "@/components/tables/ClientsTable";
import { archiveClientAction } from "@/server/actions/clients";
import { CLIENT_TYPES } from "@/lib/constants";
import { can } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { listClients } from "@/server/services/clients";

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
  const user = await requireUserPage();
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
    empty: t("empty"),
    typeValues: Object.fromEntries(
      CLIENT_TYPES.map((type) => [type, t(`type.${type}`)]),
    ),
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        {canWrite ? (
          <Link href="/clients/new">
            <Button type="button">
              <Plus size={16} aria-hidden="true" />
              {t("new")}
            </Button>
          </Link>
        ) : null}
      </div>

      <Card>
        <CardContent>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <Field
              label={tc("search")}
              htmlFor="clients-q"
              className="min-w-56"
            >
              <Input
                id="clients-q"
                name="q"
                defaultValue={q ?? ""}
                placeholder={t("searchPlaceholder")}
              />
            </Field>
            <div className="pb-1">
              <Checkbox
                name="archived"
                value="1"
                defaultChecked={archived}
                label={t("includeArchived")}
              />
            </div>
            <div className="flex gap-2 pb-0.5">
              <Button type="submit">
                <Filter size={16} aria-hidden="true" />
                {tc("filter")}
              </Button>
              <Link href="/clients">
                <Button type="button" variant="secondary">
                  <RotateCcw size={16} aria-hidden="true" />
                  {tc("reset")}
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <ClientsTable
            rows={rows}
            total={total}
            page={page}
            pageSize={pageSize}
            query={query}
            canWrite={canWrite}
            labels={labels}
            archiveAction={archiveClientAction}
          />
        </CardContent>
      </Card>
    </div>
  );
}