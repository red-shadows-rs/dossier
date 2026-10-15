"use client";

import Link from "next/link";
import { Receipt } from "lucide-react";
import { ActionLink } from "@/components/ui/ActionLink";
import { Badge, invoiceStatusTone } from "@/components/ui/Badge";
import { RowActionButton } from "@/components/forms/RowActionButton";
import { ServerDataTable, type ColumnDef } from "@/components/tables/ServerDataTable";
import { formatMoney } from "@/lib/money";
import type { CurrencyCode } from "@/lib/constants";
import type { ActionResult } from "@/lib/result";

export type InvoiceTableRow = {
  id: string;
  number: string | null;
  projectId: string | null;
  status: string;
  totalMinor: number;
  currency: string;
  dueDate: string | null;
  overdue: boolean;
};

export type InvoiceTableLabels = {
  number: string;
  project: string;
  statusLabel: string;
  total: string;
  dueDate: string;
  actions: string;
  preview: string;
  edit: string;
  deleteTitle: string;
  deleteMessage: string;
  deleted: string;
  overdue: string;
  empty: string;
  statusValues: Record<string, string>;
};

export function InvoicesTable({
  rows,
  total,
  page,
  pageSize,
  query,
  canWrite,
  labels,
  projectNames,
  deleteAction,
}: {
  rows: InvoiceTableRow[];
  total: number;
  page: number;
  pageSize: number;
  query: Record<string, string>;
  canWrite: boolean;
  labels: InvoiceTableLabels;
  projectNames: Record<string, string>;
  deleteAction: (raw: unknown) => Promise<ActionResult<null>>;
}) {
  const canDelete = (status: string) => canWrite && status === "draft";

  const columns: ColumnDef<InvoiceTableRow>[] = [
    {
      id: "number",
      header: labels.number,
      className: "whitespace-nowrap font-mono font-medium text-xs",
      render: (row) => (
        <Link
          href={`/invoices/${row.id}`}
          dir="ltr"
          className="text-foreground hover:text-primary transition-colors font-semibold"
        >
          {row.number ?? "-"}
        </Link>
      ),
    },
    {
      id: "project",
      header: labels.project,
      className: "text-muted-foreground",
      render: (row) => projectNames[row.projectId ?? ""] ?? "-",
    },
    {
      id: "status",
      header: labels.statusLabel,
      className: "whitespace-nowrap",
      render: (row) => (
        <Badge tone={invoiceStatusTone(row.status, row.overdue)}>
          {row.overdue
            ? labels.overdue
            : (labels.statusValues[row.status] ?? row.status)}
        </Badge>
      ),
    },
    {
      id: "total",
      header: labels.total,
      align: "end",
      className: "whitespace-nowrap font-medium",
      render: (row) => (
        <span dir="ltr" className="tabular-nums">
          {formatMoney(
            row.totalMinor,
            row.currency as CurrencyCode,
            "en",
          )}
        </span>
      ),
    },
    {
      id: "dueDate",
      header: labels.dueDate,
      className: "whitespace-nowrap text-muted-foreground text-xs",
      render: (row) => (
        <span dir="ltr" className="tabular-nums">
          {row.dueDate ?? "-"}
        </span>
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
            href={`/invoices/${row.id}`}
            action="preview"
            label={labels.preview}
          />
          {canDelete(row.status) ? (
            <ActionLink
              href={`/invoices/${row.id}/edit`}
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
      basePath="/invoices"
      query={query}
      noRowsLabel={labels.empty}
      emptyIcon={<Receipt size={36} className="text-muted-foreground" aria-hidden="true" />}
    />
  );
}