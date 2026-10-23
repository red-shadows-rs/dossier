// Dossier - Contracts Table Tables Component
// https://github.com/red-shadows-rs/dossier

"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { FileText } from "lucide-react";
import { ActionLink } from "@/components/ui/ActionLink";
import { Badge, contractStatusTone } from "@/components/ui/Badge";
import { RowActionButton } from "@/components/forms/RowActionButton";
import { ServerDataTable, type ColumnDef } from "@/components/tables/ServerDataTable";
import type { ActionResult } from "@/lib/result";

export type ContractTableRow = {
  id: string;
  number: string | null;
  titleAr: string | null;
  titleEn: string | null;
  status: string;
};

export type ContractTableLabels = {
  number: string;
  name: string;
  statusLabel: string;
  actions: string;
  preview: string;
  edit: string;
  deleteTitle: string;
  deleteMessage: string;
  deleted: string;
  empty: string;
  emptyHint?: string;
  newContract?: string;
  statusValues: Record<string, string>;
};

export function ContractsTable({
  rows,
  total,
  page,
  pageSize,
  query,
  canWrite,
  labels,
  deleteAction,
}: {
  rows: ContractTableRow[];
  total: number;
  page: number;
  pageSize: number;
  query: Record<string, string>;
  canWrite: boolean;
  labels: ContractTableLabels;
  deleteAction: (raw: unknown) => Promise<ActionResult<null>>;
}) {
  const locale = useLocale();
  const canDelete = (status: string) => canWrite && status === "draft";

  const columns: ColumnDef<ContractTableRow>[] = [
    {
      id: "number",
      header: labels.number,
      className: "whitespace-nowrap font-mono font-medium text-xs",
      render: (row) => (
        <span dir="ltr" className="text-foreground">
          {row.number ?? "-"}
        </span>
      ),
    },
    {
      id: "name",
      header: labels.name,
      className: "min-w-[180px] sm:min-w-[220px]",
      render: (row) => {
        const title =
          locale === "ar"
            ? (row.titleAr || row.titleEn || "-")
            : (row.titleEn || row.titleAr || "-");
        const dir =
          locale === "ar"
            ? (row.titleAr ? "rtl" : "ltr")
            : (row.titleEn ? "ltr" : "rtl");
        return (
          <Link
            href={`/contracts/${row.id}`}
            className="font-semibold text-foreground hover:text-primary transition-colors"
          >
            <span dir={dir}>{title}</span>
          </Link>
        );
      },
    },
    {
      id: "status",
      header: labels.statusLabel,
      className: "whitespace-nowrap",
      render: (row) => (
        <Badge tone={contractStatusTone(row.status)}>
          {labels.statusValues[row.status] ?? row.status}
        </Badge>
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
            href={`/contracts/${row.id}`}
            action="preview"
            label={labels.preview}
          />
          {canDelete(row.status) ? (
            <ActionLink
              href={`/contracts/${row.id}/edit`}
              action="edit"
              label={labels.edit}
            />
          ) : null}
          {canDelete(row.status) ? (
            <RowActionButton
              id={row.id}
              action={deleteAction}
              kind="delete"
              label={labels.deleteTitle}
              title={labels.deleteTitle}
              message={labels.deleteMessage}
              confirmLabel={labels.deleteTitle}
              successTitle={labels.deleted}
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
      basePath="/contracts"
      query={query}
      noRowsLabel={labels.empty}
      emptyDescription={labels.emptyHint}
      emptyIcon={<FileText size={20} aria-hidden="true" />}
      minWidth="min-w-[420px] sm:min-w-full"
      renderMobileCard={(row) => {
        const title =
          locale === "ar"
            ? (row.titleAr || row.titleEn || "-")
            : (row.titleEn || row.titleAr || "-");
        return (
          <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-card/70 p-3.5 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/contracts/${row.id}`}
                className="font-bold text-sm text-foreground hover:text-primary transition-colors leading-snug line-clamp-2"
              >
                {title}
              </Link>
              <Badge tone={contractStatusTone(row.status)} className="shrink-0 text-xs">
                {labels.statusValues[row.status] ?? row.status}
              </Badge>
            </div>

            <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
              <span className="inline-flex items-center gap-1">
                <span className="text-[11px] text-muted-foreground/70">{labels.number}:</span>
                <span dir="ltr" className="font-semibold text-foreground">{row.number ?? "-"}</span>
              </span>
            </div>

            <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/50">
              <ActionLink
                href={`/contracts/${row.id}`}
                action="preview"
                label={labels.preview}
              />
              {canDelete(row.status) ? (
                <ActionLink
                  href={`/contracts/${row.id}/edit`}
                  action="edit"
                  label={labels.edit}
                />
              ) : null}
              {canDelete(row.status) ? (
                <RowActionButton
                  id={row.id}
                  action={deleteAction}
                  kind="delete"
                  label={labels.deleteTitle}
                  title={labels.deleteTitle}
                  message={labels.deleteMessage}
                  confirmLabel={labels.deleteTitle}
                  successTitle={labels.deleted}
                />
              ) : null}
            </div>
          </div>
        );
      }}
    />
  );
}