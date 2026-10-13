"use client";

import Link from "next/link";
import type { GridColDef } from "@mui/x-data-grid";
import MuiLink from "@mui/material/Link";
import MuiStack from "@mui/material/Stack";
import { ActionLink } from "@/components/ui/ActionLink";
import { Badge, contractStatusTone } from "@/components/ui/Badge";
import { RowActionButton } from "@/components/forms/RowActionButton";
import { ServerDataGrid } from "@/components/tables/ServerDataGrid";
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
  const canDelete = (status: string) => canWrite && status === "draft";

  const columns: GridColDef<ContractTableRow>[] = [
    {
      field: "number",
      headerName: labels.number,
      width: 170,
      sortable: false,
      renderCell: (params) => (
        <span dir="ltr" style={{ fontFamily: "monospace" }}>
          {params.row.number ?? "-"}
        </span>
      ),
    },
    {
      field: "name",
      headerName: labels.name,
      flex: 1,
      minWidth: 240,
      sortable: false,
      renderCell: (params) => (
        <MuiLink
          component={Link}
          href={`/contracts/${params.row.id}`}
          underline="hover"
          color="inherit"
          sx={{ fontWeight: 600 }}
        >
          <span dir="rtl" lang="ar">
            {params.row.titleAr ?? "-"}
          </span>
          {params.row.titleEn ? (
            <>
              {" / "}
              <span dir="ltr" lang="en">
                {params.row.titleEn}
              </span>
            </>
          ) : null}
        </MuiLink>
      ),
    },
    {
      field: "status",
      headerName: labels.statusLabel,
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Badge tone={contractStatusTone(params.row.status)}>
          {labels.statusValues[params.row.status] ?? params.row.status}
        </Badge>
      ),
    },
    {
      field: "actions",
      headerName: labels.actions,
      width: 170,
      sortable: false,
      renderCell: (params) => (
        <MuiStack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          <ActionLink
            href={`/contracts/${params.row.id}`}
            action="preview"
            label={labels.preview}
          />
          {canDelete(params.row.status) ? (
            <ActionLink
              href={`/contracts/${params.row.id}/edit`}
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
      basePath="/contracts"
      query={query}
      noRowsLabel={labels.empty}
    />
  );
}