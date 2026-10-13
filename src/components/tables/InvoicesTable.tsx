"use client";

import Link from "next/link";
import type { GridColDef } from "@mui/x-data-grid";
import MuiLink from "@mui/material/Link";
import MuiStack from "@mui/material/Stack";
import { ActionLink } from "@/components/ui/ActionLink";
import { Badge, invoiceStatusTone } from "@/components/ui/Badge";
import { RowActionButton } from "@/components/forms/RowActionButton";
import { ServerDataGrid } from "@/components/tables/ServerDataGrid";
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

  const columns: GridColDef<InvoiceTableRow>[] = [
    {
      field: "number",
      headerName: labels.number,
      width: 170,
      sortable: false,
      renderCell: (params) => (
        <MuiLink
          component={Link}
          href={`/invoices/${params.row.id}`}
          underline="hover"
          color="inherit"
          sx={{ fontFamily: "monospace", fontWeight: 600 }}
          dir="ltr"
        >
          {params.row.number ?? "-"}
        </MuiLink>
      ),
    },
    {
      field: "project",
      headerName: labels.project,
      flex: 1,
      minWidth: 200,
      sortable: false,
      valueGetter: (_value, row) => projectNames[row.projectId ?? ""] ?? "-",
    },
    {
      field: "status",
      headerName: labels.statusLabel,
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Badge tone={invoiceStatusTone(params.row.status, params.row.overdue)}>
          {params.row.overdue
            ? labels.overdue
            : (labels.statusValues[params.row.status] ?? params.row.status)}
        </Badge>
      ),
    },
    {
      field: "total",
      headerName: labels.total,
      width: 160,
      sortable: false,
      renderCell: (params) => (
        <span dir="ltr" style={{ fontVariantNumeric: "tabular-nums" }}>
          {formatMoney(
            params.row.totalMinor,
            params.row.currency as CurrencyCode,
            "en",
          )}
        </span>
      ),
    },
    {
      field: "dueDate",
      headerName: labels.dueDate,
      width: 130,
      sortable: false,
      renderCell: (params) => <span dir="ltr">{params.row.dueDate ?? "-"}</span>,
    },
    {
      field: "actions",
      headerName: labels.actions,
      width: 170,
      sortable: false,
      renderCell: (params) => (
        <MuiStack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          <ActionLink
            href={`/invoices/${params.row.id}`}
            action="preview"
            label={labels.preview}
          />
          {canDelete(params.row.status) ? (
            <ActionLink
              href={`/invoices/${params.row.id}/edit`}
              action="edit"
              label={labels.edit}
            />
          ) : null}
          {canDelete(params.row.status) ? (
            <RowActionButton
              id={params.row.id}
              action={deleteAction}
              kind="delete"
              label={labels.deleteTitle}
              title={labels.deleteTitle}
              message={labels.deleteMessage}
              confirmLabel={labels.deleteTitle}
              successTitle={labels.deleted}
            />
          ) : null}
        </MuiStack>
      ),
    },
  ];

  return (
    <ServerDataGrid
      rows={rows}
      columns={columns}
      total={total}
      page={page}
      pageSize={pageSize}
      basePath="/invoices"
      query={query}
      noRowsLabel={labels.empty}
    />
  );
}