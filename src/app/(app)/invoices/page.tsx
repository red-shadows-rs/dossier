import Link from "next/link";
import { Filter, Plus, RotateCcw } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ActionLink } from "@/components/ui/ActionLink";
import { RowActionButton } from "@/components/forms/RowActionButton";
import { deleteDraftInvoiceAction } from "@/server/actions/invoices";
import { Badge, invoiceStatusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { Select } from "@/components/ui/Select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from "@/components/ui/Table";
import { INVOICE_STATUSES } from "@/lib/constants";
import { formatMoney } from "@/lib/money";
import { todayInTz } from "@/lib/dates";
import type { CurrencyCode } from "@/lib/constants";
import { can } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import {
  INVOICE_SORT_FIELDS,
  isOverdue,
  listInvoices,
} from "@/server/services/invoices";
import { listProjectOptions } from "@/server/services/projects";
import { getSettings } from "@/server/services/settings";

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
  const user = await requireUserPage();
  const t = await getTranslations("invoices");
  const tc = await getTranslations("common");
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
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        {canWrite ? (
          <Link href="/invoices/new">
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
              htmlFor="invoices-q"
              className="min-w-52"
            >
              <Input id="invoices-q" name="q" defaultValue={q ?? ""} />
            </Field>
            <Field label={t("statusLabel")} htmlFor="invoices-status">
              <Select
                id="invoices-status"
                name="status"
                defaultValue={status ?? ""}
                className="w-40"
              >
                <option value="">{t("allStatuses")}</option>
                {INVOICE_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {t(`status.${value}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("project")} htmlFor="invoices-project">
              <Select
                id="invoices-project"
                name="projectId"
                defaultValue={projectId ?? ""}
                className="w-52"
              >
                <option value="">{t("allProjects")}</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code} - {project.nameAr ?? project.nameEn ?? ""}
                  </option>
                ))}
              </Select>
            </Field>
            <div className="pb-1">
              <Checkbox
                name="overdue"
                value="1"
                defaultChecked={overdue}
                label={t("overdueOnly")}
              />
            </div>
            <Field label={tc("sort")} htmlFor="invoices-sort">
              <Select
                id="invoices-sort"
                name="sort"
                defaultValue={sort}
                className="w-40"
              >
                {INVOICE_SORT_FIELDS.map((value) => (
                  <option key={value} value={value}>
                    {t(`sort.${value}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={tc("direction")} htmlFor="invoices-dir">
              <Select
                id="invoices-dir"
                name="dir"
                defaultValue={dir}
                className="w-32"
              >
                <option value="desc">{tc("desc")}</option>
                <option value="asc">{tc("asc")}</option>
              </Select>
            </Field>
            <div className="flex gap-2 pb-0.5">
              <Button type="submit">
                <Filter size={16} aria-hidden="true" />
                {tc("filter")}
              </Button>
              <Link href="/invoices">
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
          {rows.length === 0 ? (
            <EmptyState title={t("empty")} description={t("emptyHint")} />
          ) : (
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>{t("number")}</TableHeaderCell>
                  <TableHeaderCell>{t("project")}</TableHeaderCell>
                  <TableHeaderCell>{t("statusLabel")}</TableHeaderCell>
                  <TableHeaderCell>{t("total")}</TableHeaderCell>
                  <TableHeaderCell>{t("dueDate")}</TableHeaderCell>
                  <TableHeaderCell className="text-end">
                    {tc("actions")}
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const isPastDue = isOverdue(row, today);
                  return (
                    <TableRow key={row.id}>
                      <TableCell dir="ltr" className="text-start font-mono">
                        {row.number ?? "-"}
                      </TableCell>
                      <TableCell>
                        {projects.find((p) => p.id === row.projectId)?.nameAr ??
                          projects.find((p) => p.id === row.projectId)
                            ?.nameEn ??
                          "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1">
                          <Badge
                            tone={invoiceStatusTone(row.status, isPastDue)}
                          >
                            {isPastDue
                              ? t("overdue")
                              : t(`status.${row.status}`)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell dir="ltr" className="text-start tabular-nums">
                        {formatMoney(
                          row.totalMinor,
                          row.currency as CurrencyCode,
                          "en",
                        )}
                      </TableCell>
                      <TableCell dir="ltr" className="text-start">
                        {row.dueDate ?? "-"}
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-2">
                          <ActionLink
                            href={`/invoices/${row.id}`}
                            action="preview"
                            label={tc("preview")}
                          />
                          {canWrite && row.status === "draft" ? (
                            <ActionLink
                              href={`/invoices/${row.id}/edit`}
                              action="edit"
                              label={tc("edit")}
                            />
                          ) : null}
                          {canWrite && row.status === "draft" ? (
                            <RowActionButton
                              id={row.id}
                              action={deleteDraftInvoiceAction}
                              kind="delete"
                              label={t("deleteTitle")}
                              title={t("deleteTitle")}
                              message={t("deleteMessage")}
                              confirmLabel={t("deleteTitle")}
                              successTitle={t("deleted")}
                            />
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <Pagination
            page={page}
            totalPages={totalPages}
            basePath="/invoices"
            query={query}
          />
        </CardContent>
      </Card>
    </div>
  );
}
