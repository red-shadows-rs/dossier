import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
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
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canWrite = can(user, "clients.write");

  const query: Record<string, string> = {};
  if (q) query.q = q;
  if (archived) query.archived = "1";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        {canWrite ? (
          <Link href="/clients/new">
            <Button type="button">{t("new")}</Button>
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
            <label className="flex items-center gap-2 pb-2 text-sm text-foreground">
              <input
                type="checkbox"
                name="archived"
                value="1"
                defaultChecked={archived}
                className="size-4 rounded border-border"
              />
              {t("includeArchived")}
            </label>
            <div className="flex gap-2 pb-0.5">
              <Button type="submit">{tc("filter")}</Button>
              <Link
                href="/clients"
                className="rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-surface"
              >
                {tc("reset")}
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-4">
          {rows.length === 0 ? (
            <EmptyState title={t("empty")} description={t("emptyHint")} />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t("name")}</TableHeaderCell>
                  <TableHeaderCell>{t("typeLabel")}</TableHeaderCell>
                  <TableHeaderCell>{t("email")}</TableHeaderCell>
                  <TableHeaderCell>{t("phone")}</TableHeaderCell>
                  <TableHeaderCell>{t("city")}</TableHeaderCell>
                  <TableHeaderCell>{tc("status")}</TableHeaderCell>
                  <TableHeaderCell className="text-end">
                    {tc("actions")}
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell>
                      <Link
                        href={`/clients/${row.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        <span dir="rtl" lang="ar">
                          {row.nameAr ?? "—"}
                        </span>
                        {row.nameEn ? (
                          <>
                            {" / "}
                            <span dir="ltr" lang="en">
                              {row.nameEn}
                            </span>
                          </>
                        ) : null}
                      </Link>
                    </TableCell>
                    <TableCell>{t(`type.${row.type}`)}</TableCell>
                    <TableCell dir="ltr" className="text-start">
                      {row.email ?? "—"}
                    </TableCell>
                    <TableCell dir="ltr" className="text-start">
                      {row.phone ?? "—"}
                    </TableCell>
                    <TableCell>{row.city ?? "—"}</TableCell>
                    <TableCell>
                      {row.archivedAt ? (
                        <Badge tone="gray">{t("archived")}</Badge>
                      ) : (
                        <Badge tone="green">{t("active")}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/clients/${row.id}`}
                          className="text-sm text-muted-foreground hover:text-foreground"
                        >
                          {tc("preview")}
                        </Link>
                        {canWrite ? (
                          <Link
                            href={`/clients/${row.id}/edit`}
                            className="text-sm text-muted-foreground hover:text-foreground"
                          >
                            {tc("edit")}
                          </Link>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <Pagination
            page={page}
            totalPages={totalPages}
            basePath="/clients"
            query={query}
          />
        </CardContent>
      </Card>
    </div>
  );
}
