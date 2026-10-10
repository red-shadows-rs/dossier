// Dossier - Projects Table Tables Component
// https://github.com/red-shadows-rs/dossier

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
      renderMobileCard={(row) => {
        const name =
          locale === "ar"
            ? (row.nameAr || row.nameEn || "-")
            : (row.nameEn || row.nameAr || "-");
        const client = clientNames[row.clientId ?? ""] ?? "-";
        return (
          <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-card/70 p-3.5 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/projects/${row.id}`}
                className="font-bold text-sm text-foreground hover:text-primary transition-colors line-clamp-2"
              >
                {name}
              </Link>
              <Badge tone={row.status === "active" ? "green" : row.status === "draft" ? "amber" : "gray"} className="shrink-0 text-xs">
                {labels.statusValues[row.status] ?? row.status}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs py-1">
              <div className="flex flex-col gap-0.5">
                <span className="text-[11px] text-muted-foreground">{labels.client}</span>
                <span className="font-medium text-foreground truncate">{client}</span>
              </div>
              <div className="flex flex-col gap-0.5 items-end text-end">
                <span className="text-[11px] text-muted-foreground">{labels.code}</span>
                <span dir="ltr" className="font-mono font-semibold text-foreground">
                  {row.code}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/50">
              <ActionLink
                href={`/projects/${row.id}`}
                action="preview"
                label={labels.preview}
              />
              {canWrite && !row.archivedAt ? (
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
          </div>
        );
      }}
    />
  );
}