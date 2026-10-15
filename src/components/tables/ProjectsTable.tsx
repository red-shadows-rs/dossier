"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { FolderKanban } from "lucide-react";
import { ActionLink } from "@/components/ui/ActionLink";
import { Badge } from "@/components/ui/Badge";
import { RowActionButton } from "@/components/forms/RowActionButton";
import { ServerDataTable, type ColumnDef } from "@/components/tables/ServerDataTable";
import type { ActionResult } from "@/lib/result";

export type ProjectTableRow = {
  id: string;
  code: string;
  nameAr: string | null;
  nameEn: string | null;
  clientId: string | null;
  status: string;
  currency: string;
  archivedAt: number | null;
};

export type ProjectTableLabels = {
  code: string;
  name: string;
  client: string;
  statusLabel: string;
  currency: string;
  actions: string;
  preview: string;
  edit: string;
  archive: string;
  archiveConfirm: string;
  archivedToast: string;
  empty: string;
  statusValues: Record<string, string>;
};

export function ProjectsTable({
  rows,
  total,
  page,
  pageSize,
  query,
  canWrite,
  labels,
  clientNames,
  archiveAction,
}: {
  rows: ProjectTableRow[];
  total: number;
  page: number;
  pageSize: number;
  query: Record<string, string>;
  canWrite: boolean;
  labels: ProjectTableLabels;
  clientNames: Record<string, string>;
  archiveAction: (raw: unknown) => Promise<ActionResult<null>>;
}) {
  const locale = useLocale();

  const columns: ColumnDef<ProjectTableRow>[] = [
    {
      id: "code",
      header: labels.code,
      className: "whitespace-nowrap font-mono font-medium text-xs",
      render: (row) => (
        <Link
          href={`/projects/${row.id}`}
          dir="ltr"
          className="text-foreground hover:text-primary transition-colors font-semibold"
        >
          {row.code}
        </Link>
      ),
    },
    {
      id: "name",
      header: labels.name,
      render: (row) => {
        const name =
          locale === "ar"
            ? (row.nameAr || row.nameEn || "-")
            : (row.nameEn || row.nameAr || "-");
        const dir =
          locale === "ar"
            ? (row.nameAr ? "rtl" : "ltr")
            : (row.nameEn ? "ltr" : "rtl");
        return (
          <Link
            href={`/projects/${row.id}`}
            className="font-semibold text-foreground hover:text-primary transition-colors"
          >
            <span dir={dir}>{name}</span>
          </Link>
        );
      },
    },
    {
      id: "client",
      header: labels.client,
      className: "text-muted-foreground",
      render: (row) => clientNames[row.clientId ?? ""] ?? "-",
    },
    {
      id: "status",
      header: labels.statusLabel,
      className: "whitespace-nowrap",
      render: (row) => (
        <Badge tone="blue">
          {labels.statusValues[row.status] ?? row.status}
        </Badge>
      ),
    },
    {
      id: "currency",
      header: labels.currency,
      className: "whitespace-nowrap font-mono text-xs text-muted-foreground",
      render: (row) => <span dir="ltr">{row.currency}</span>,
    },
    {
      id: "actions",
      header: labels.actions,
      align: "end",
      className: "whitespace-nowrap",
      render: (row) => (
        <div className="inline-flex items-center justify-end gap-1">
          <ActionLink
            href={`/projects/${row.id}`}
            action="preview"
            label={labels.preview}
          />
          {canWrite ? (
            <ActionLink
              href={`/projects/${row.id}/edit`}
              action="edit"
              label={labels.edit}
            />
          ) : null}
          {canWrite && !row.archivedAt ? (
            <RowActionButton
              id={row.id}
              action={archiveAction}
              kind="archive"
              label={labels.archive}
              title={labels.archive}
              message={labels.archiveConfirm}
              confirmLabel={labels.archive}
              successTitle={labels.archivedToast}
            />
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <ServerDataTable
      rows={rows}
      columns={columns}
      total={total}
      page={page}
      pageSize={pageSize}
      basePath="/projects"
      query={query}
      noRowsLabel={labels.empty}
      emptyIcon={<FolderKanban size={36} className="text-muted-foreground" aria-hidden="true" />}
    />
  );
}