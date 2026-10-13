import Link from "next/link";
import { Filter, Plus, RotateCcw } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { ActionLink } from "@/components/ui/ActionLink";
import { RowActionButton } from "@/components/forms/RowActionButton";
import { archiveProjectAction } from "@/server/actions/projects";
import { Badge } from "@/components/ui/Badge";
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
import { PROJECT_STATUSES, type ProjectStatus } from "@/lib/constants";
import { can } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { listClientOptions } from "@/server/services/clients";
import { listProjects } from "@/server/services/projects";

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
  const user = await requireUserPage();
  const t = await getTranslations("projects");
  const tc = await getTranslations("common");
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
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const clients = listClientOptions();
  const canWrite = can(user, "projects.write");

  const query: Record<string, string> = {};
  if (q) query.q = q;
  if (status) query.status = status;
  if (clientId) query.clientId = clientId;
  if (archived) query.archived = "1";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        {canWrite ? (
          <Link href="/projects/new">
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
              htmlFor="projects-q"
              className="min-w-52"
            >
              <Input id="projects-q" name="q" defaultValue={q ?? ""} />
            </Field>
            <Field label={t("statusLabel")} htmlFor="projects-status">
              <Select
                id="projects-status"
                name="status"
                defaultValue={status ?? ""}
                className="w-40"
              >
                <option value="">{t("allStatuses")}</option>
                {PROJECT_STATUSES.map((value) => (
                  <option key={value} value={value}>
                    {t(`status.${value}`)}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={t("client")} htmlFor="projects-client">
              <Select
                id="projects-client"
                name="clientId"
                defaultValue={clientId ?? ""}
                className="w-52"
              >
                <option value="">{t("allClients")}</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.nameAr ?? client.nameEn ?? client.id}
                  </option>
                ))}
              </Select>
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
              <Link href="/projects">
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
                  <TableHeaderCell>{t("code")}</TableHeaderCell>
                  <TableHeaderCell>{t("name")}</TableHeaderCell>
                  <TableHeaderCell>{t("client")}</TableHeaderCell>
                  <TableHeaderCell>{t("statusLabel")}</TableHeaderCell>
                  <TableHeaderCell>{t("currency")}</TableHeaderCell>
                  <TableHeaderCell className="text-end">
                    {tc("actions")}
                  </TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => {
                  const client = clients.find((c) => c.id === row.clientId);
                  return (
                    <TableRow key={row.id}>
                      <TableCell dir="ltr" className="text-start font-mono">
                        {row.code}
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`/projects/${row.id}`}
                          className="font-medium text-foreground hover:text-primary"
                        >
                          <span dir="rtl" lang="ar">
                            {row.nameAr ?? "-"}
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
                      <TableCell>
                        {client?.nameAr ?? client?.nameEn ?? "-"}
                      </TableCell>
                      <TableCell>
                        <Badge tone="blue">{t(`status.${row.status}`)}</Badge>
                      </TableCell>
                      <TableCell dir="ltr" className="text-start">
                        {row.currency}
                      </TableCell>
                      <TableCell className="text-end">
                        <div className="flex justify-end gap-2">
                          <ActionLink
                            href={`/projects/${row.id}`}
                            action="preview"
                            label={tc("preview")}
                          />
                          {canWrite ? (
                            <ActionLink
                              href={`/projects/${row.id}/edit`}
                              action="edit"
                              label={tc("edit")}
                            />
                          ) : null}
                          {canWrite && !row.archivedAt ? (
                            <RowActionButton
                              id={row.id}
                              action={archiveProjectAction}
                              kind="archive"
                              label={t("archive")}
                              title={t("archive")}
                              message={t("archiveConfirm")}
                              confirmLabel={t("archive")}
                              successTitle={t("archivedToast")}
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
            basePath="/projects"
            query={query}
          />
        </CardContent>
      </Card>
    </div>
  );
}
