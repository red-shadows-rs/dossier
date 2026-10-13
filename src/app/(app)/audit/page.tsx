import Link from "next/link";
import { Filter, RotateCcw } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableEmpty,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { AUDIT_ACTIONS } from "@/lib/constants";
import { formatInstant } from "@/lib/dates";
import { isLocale } from "@/lib/i18n";
import { assertCan } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { listAuditEntries } from "@/server/services/audit";

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
  const user = await requireUserPage();
  assertCan(user, "audit.read");

  const t = await getTranslations("audit");
  const tc = await getTranslations("common");
  const rawLocale = await getLocale();
  const locale = isLocale(rawLocale) ? rawLocale : user.locale;
  const params = await searchParams;

  const entityType = readParam(params.entityType);
  const entityId = readParam(params.entityId);
  const action = readParam(params.action);
  const from = readParam(params.from);
  const to = readParam(params.to);
  const pageRaw = readParam(params.page);
  const requestedPage = pageRaw ? Number(pageRaw) : 1;

  const { rows, total, page, pageSize } = listAuditEntries({
    entityType,
    entityId,
    action,
    from,
    to,
    page: requestedPage,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const query: Record<string, string> = {};
  if (entityType) query.entityType = entityType;
  if (entityId) query.entityId = entityId;
  if (action) query.action = action;
  if (from) query.from = from;
  if (to) query.to = to;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>

      <Card>
        <CardContent>
          <form
            method="get"
            className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6"
          >
            <Field label={t("entityType")} htmlFor="entityType">
              <Input
                id="entityType"
                name="entityType"
                dir="ltr"
                defaultValue={entityType ?? ""}
                className="text-start"
              />
            </Field>
            <Field label={t("entityId")} htmlFor="entityId">
              <Input
                id="entityId"
                name="entityId"
                dir="ltr"
                defaultValue={entityId ?? ""}
                className="text-start"
              />
            </Field>
            <Field label={t("action")} htmlFor="action">
              <Select id="action" name="action" defaultValue={action ?? ""}>
                <option value="">{t("allActions")}</option>
                {AUDIT_ACTIONS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("from")} htmlFor="from">
              <Input
                id="from"
                name="from"
                type="date"
                defaultValue={from ?? ""}
                className="text-start"
              />
            </Field>
            <Field label={t("to")} htmlFor="to">
              <Input
                id="to"
                name="to"
                type="date"
                defaultValue={to ?? ""}
                className="text-start"
              />
            </Field>
            <div className="flex items-end gap-2">
              <Button type="submit">
                <Filter size={16} aria-hidden="true" />
                {tc("filter")}
              </Button>
              <Link href="/audit">
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
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
          <span
            className="text-sm text-muted-foreground tabular-nums"
            dir="ltr"
          >
            {total}
          </span>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeaderCell>{t("when")}</TableHeaderCell>
                <TableHeaderCell>{t("actor")}</TableHeaderCell>
                <TableHeaderCell>{t("action")}</TableHeaderCell>
                <TableHeaderCell>{t("entity")}</TableHeaderCell>
                <TableHeaderCell>{t("ip")}</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length === 0 ? (
                <TableEmpty colSpan={5}>{tc("noResults")}</TableEmpty>
              ) : (
                rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="whitespace-nowrap">
                      {formatInstant(row.ts, "UTC", locale)}
                    </TableCell>
                    <TableCell>
                      <span className="flex flex-col">
                        <span>{t(`actorType.${row.actorType}`)}</span>
                        {row.actorId ? (
                          <span
                            className="text-xs text-muted-foreground"
                            dir="ltr"
                          >
                            {row.actorId}
                          </span>
                        ) : null}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span dir="ltr" className="text-start">
                        {row.action}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="flex flex-col">
                        <span>{row.entityType}</span>
                        <span
                          className="text-xs text-muted-foreground"
                          dir="ltr"
                        >
                          {row.entityId}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell>
                      <span dir="ltr" className="text-start">
                        {row.ip ?? "-"}
                      </span>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          <Pagination
            page={page}
            totalPages={totalPages}
            basePath="/audit"
            query={query}
          />
        </CardContent>
      </Card>
    </div>
  );
}
