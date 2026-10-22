// Dossier - Clients Table Tables Component
// https://github.com/red-shadows-rs/dossier

"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { Plus, Users } from "lucide-react";
import { ActionLink } from "@/components/ui/ActionLink";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { RowActionButton } from "@/components/forms/RowActionButton";
import { ServerDataTable, type ColumnDef } from "@/components/tables/ServerDataTable";
import type { ActionResult } from "@/lib/result";

export type ClientTableRow = {
  id: string;
  nameAr: string | null;
  nameEn: string | null;
  type: string;
  email: string | null;
  phone: string | null;
  city: string | null;
  archivedAt: number | null;
  canDelete?: boolean;
};

export type ClientTableLabels = {
  name: string;
  typeLabel: string;
  email: string;
  phone: string;
  city: string;
  status: string;
  active: string;
  archived: string;
  actions: string;
  preview: string;
  edit: string;
  archive: string;
  archiveConfirm: string;
  archivedToast: string;
  delete?: string;
  deleteConfirm?: string;
  deletedToast?: string;
  empty: string;
  emptyHint?: string;
  newClient?: string;
  typeValues: Record<string, string>;
};

export function ClientsTable({
  rows,
  total,
  page,
  pageSize,
  query,
  canWrite,
  labels,
  archiveAction,
  deleteAction,
}: {
  rows: ClientTableRow[];
  total: number;
  page: number;
  pageSize: number;
  query: Record<string, string>;
  canWrite: boolean;
  labels: ClientTableLabels;
  archiveAction: (raw: unknown) => Promise<ActionResult<null>>;
  deleteAction?: (raw: unknown) => Promise<ActionResult<null>>;
}) {
  const locale = useLocale();

  const columns: ColumnDef<ClientTableRow>[] = [
    {
      id: "name",
      header: labels.name,
      className: "min-w-[170px]",
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
            href={`/clients/${row.id}`}
            className="font-semibold text-foreground hover:text-primary transition-colors"
          >
            <span dir={dir}>{name}</span>
          </Link>
        );
      },
    },
    {
      id: "type",
      header: labels.typeLabel,
      className: "whitespace-nowrap text-muted-foreground",
      render: (row) => labels.typeValues[row.type] ?? row.type,
    },
    {
      id: "email",
      header: labels.email,
      className: "whitespace-nowrap font-mono text-xs",
      render: (row) => (
        <span dir="ltr" className="text-muted-foreground">
          {row.email ?? "-"}
        </span>
      ),
    },
    {
      id: "phone",
      header: labels.phone,
      className: "whitespace-nowrap font-mono text-xs",
      render: (row) => (
        <span dir="ltr" className="text-muted-foreground">
          {row.phone ?? "-"}
        </span>
      ),
    },
    {
      id: "city",
      header: labels.city,
      className: "whitespace-nowrap text-muted-foreground",
      render: (row) => row.city ?? "-",
    },
    {
      id: "status",
      header: labels.status,
      className: "whitespace-nowrap",
      render: (row) =>
        row.archivedAt ? (
          <Badge tone="gray">{labels.archived}</Badge>
        ) : (
          <Badge tone="green">{labels.active}</Badge>
        ),
    },
    {
      id: "actions",
      header: labels.actions,
      align: "end",
      className: "whitespace-nowrap",
      render: (row) => (
        <div className="inline-flex items-center justify-end gap-1">
          <ActionLink
            href={`/clients/${row.id}`}
            action="preview"
            label={labels.preview}
          />
          {canWrite ? (
            <ActionLink
              href={`/clients/${row.id}/edit`}
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
          {canWrite && row.canDelete && deleteAction ? (
            <RowActionButton
              id={row.id}
              action={deleteAction}
              kind="delete"
              label={labels.delete ?? "حذف"}
              title={labels.delete ?? "حذف"}
              message={labels.deleteConfirm ?? ""}
              confirmLabel={labels.delete ?? "حذف"}
              successTitle={labels.deletedToast ?? ""}
            />
          ) : null}
        </div>
      ),
    },
  ];

  const emptyAction = canWrite ? (
    <Link href="/clients/new">
      <Button
        type="button"
        variant="primary"
        size="sm"
        className="gap-1.5 font-medium shadow-xs cursor-pointer"
      >
        <Plus size={15} aria-hidden="true" />
        <span>{labels.newClient ?? "عميل جديد"}</span>
      </Button>
    </Link>
  ) : null;

  return (
    <ServerDataTable
      rows={rows}
      columns={columns}
      total={total}
      page={page}
      pageSize={pageSize}
      basePath="/clients"
      query={query}
      noRowsLabel={labels.empty}
      emptyDescription={labels.emptyHint}
      emptyAction={emptyAction}
      emptyIcon={<Users size={32} aria-hidden="true" />}
      renderMobileCard={(row) => {
        const name =
          locale === "ar"
            ? (row.nameAr || row.nameEn || "-")
            : (row.nameEn || row.nameAr || "-");
        return (
          <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-card/70 p-3.5 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/clients/${row.id}`}
                className="font-bold text-sm text-foreground hover:text-primary transition-colors line-clamp-1"
              >
                {name}
              </Link>
              <Badge tone={row.archivedAt ? "gray" : "green"} className="shrink-0 text-xs">
                {row.archivedAt ? labels.archived : labels.active}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span className="rounded bg-muted/40 border border-border/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                {labels.typeValues[row.type] ?? row.type}
              </span>
              {row.city ? <span>{row.city}</span> : null}
              {row.phone ? <span dir="ltr" className="font-mono">{row.phone}</span> : null}
            </div>

            <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/50">
              <ActionLink
                href={`/clients/${row.id}`}
                action="preview"
                label={labels.preview}
              />
              {canWrite && !row.archivedAt ? (
                <ActionLink
                  href={`/clients/${row.id}/edit`}
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
              {canWrite && row.canDelete && deleteAction ? (
                <RowActionButton
                  id={row.id}
                  action={deleteAction}
                  kind="delete"
                  label={labels.delete ?? "حذف"}
                  title={labels.delete ?? "حذف"}
                  message={labels.deleteConfirm ?? ""}
                  confirmLabel={labels.delete ?? "حذف"}
                  successTitle={labels.deletedToast ?? ""}
                />
              ) : null}
            </div>
          </div>
        );
      }}
    />
  );
}