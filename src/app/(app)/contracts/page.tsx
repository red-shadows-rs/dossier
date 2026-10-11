import Link from "next/link";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Badge, contractStatusTone } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
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
import { CONTRACT_STATUSES } from "@/lib/constants";
import { can } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import {
  CONTRACT_SORT_FIELDS,
  listContracts,
} from "@/server/services/contracts";
import { listProjectOptions } from "@/server/services/projects";

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
  const user = await requireUserPage();
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
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
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

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        {canWrite ? (
          <Link href="/contracts/new">
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
              htmlFor="contracts-q"
              className="min-w-52"
            >
              <Input id="contracts-q" name="q" defaultValue={q ?? ""} />
            </Field>
            <Field label={t("statusLabel")} htmlFor="contracts-status">
              <Select
                id="contracts-status"
                name="status"
                defaultValue={status ?? ""}
                className="w-40"
              >
                <option value="">{t("allStatuses")}</option>
                {CONTRACT_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {t(`status.${value}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("project")} htmlFor="contracts-project">
              <Select
                id="contracts-project"
                name="projectId"
                defaultValue={projectId ?? ""}
                className="w-52"
              >
                <option value="">{t("allProjects")}</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.code} — {project.nameAr ?? project.nameEn ?? ""}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={tc("sort")} htmlFor="contracts-sort">
              <Select
                id="contracts-sort"
                name="sort"
                defaultValue={sort}
                className="w-40"
              >
                {CONTRACT_SORT_FIELDS.map((value) => (
                  <option key={value} value={value}>
                    {t(`sort.${value}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={tc("direction")} htmlFor="contracts-dir">
              <Select
                id="contracts-dir"
                name="dir"
                defaultValue={dir}
                className="w-32"
              >
                <option value="desc">{tc("desc")}</option>
                <option value="asc">{tc("asc")}</option>
              </Select>
            </Field>
            <div className="flex gap-2 pb-0.5">
              <Button type="submit">{tc("filter")}</Button>
              <Link
                href="/contracts"
                className="rounded-md border border-border px-3 py-2 text-sm text-foreground hover:bg-surface"
              >
                {tc("reset")}
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
                  <TableHeaderCell>{t("name")}</TableHeaderCell>
                  <TableHeaderCell>{t("statusLabel")}</TableHeaderCell>
                  <TableHeaderCell className="text-end">
                    {tc("actions")}
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell dir="ltr" className="text-start font-mono">
                      {row.number ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/contracts/${row.id}`}
                        className="font-medium text-foreground hover:text-primary"
                      >
                        <span dir="rtl" lang="ar">
                          {row.titleAr ?? "—"}
                        </span>
                        {row.titleEn ? (
                          <>
                            {" / "}
                            <span dir="ltr" lang="en">
                              {row.titleEn}
                            </span>
                          </>
                        ) : null}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Badge tone={contractStatusTone(row.status)}>
                        {t(`status.${row.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-end">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/contracts/${row.id}`}
                          className="text-sm text-muted-foreground hover:text-foreground"
                        >
                          {tc("preview")}
                        </Link>
                        {canWrite && row.status === "draft" ? (
                          <Link
                            href={`/contracts/${row.id}/edit`}
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
            basePath="/contracts"
            query={query}
          />
        </CardContent>
      </Card>
    </div>
  );
}
