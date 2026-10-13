"use client";

import Link from "next/link";
import type { GridColDef } from "@mui/x-data-grid";
import MuiLink from "@mui/material/Link";
import MuiStack from "@mui/material/Stack";
import { ActionLink } from "@/components/ui/ActionLink";
import { Badge } from "@/components/ui/Badge";
import { RowActionButton } from "@/components/forms/RowActionButton";
import { ServerDataGrid } from "@/components/tables/ServerDataGrid";
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
  empty: string;
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
}: {
  rows: ClientTableRow[];
  total: number;
  page: number;
  pageSize: number;
  query: Record<string, string>;
  canWrite: boolean;
  labels: ClientTableLabels;
  archiveAction: (raw: unknown) => Promise<ActionResult<null>>;
}) {
  const columns: GridColDef<ClientTableRow>[] = [
    {
      field: "name",
      headerName: labels.name,
      flex: 1,
      minWidth: 220,
      sortable: false,
      renderCell: (params) => (
        <MuiLink
          component={Link}
          href={`/clients/${params.row.id}`}
          underline="hover"
          color="inherit"
          sx={{ fontWeight: 600 }}
        >
          <span dir="rtl" lang="ar">
            {params.row.nameAr ?? "-"}
          </span>
          {params.row.nameEn ? (
            <>
              {" / "}
              <span dir="ltr" lang="en">
                {params.row.nameEn}
              </span>
            </>
          ) : null}
        </MuiLink>
      ),
    },
    {
      field: "type",
      headerName: labels.typeLabel,
      width: 130,
      sortable: false,
      valueGetter: (_value, row) => labels.typeValues[row.type] ?? row.type,
    },
    {
      field: "email",
      headerName: labels.email,
      width: 220,
      sortable: false,
      renderCell: (params) => <span dir="ltr">{params.row.email ?? "-"}</span>,
    },
    {
      field: "phone",
      headerName: labels.phone,
      width: 150,
      sortable: false,
      renderCell: (params) => <span dir="ltr">{params.row.phone ?? "-"}</span>,
    },
    { field: "city", headerName: labels.city, width: 150, sortable: false },
    {
      field: "status",
      headerName: labels.status,
      width: 120,
      sortable: false,
      renderCell: (params) =>
        params.row.archivedAt ? (
          <Badge tone="gray">{labels.archived}</Badge>
        ) : (
          <Badge tone="green">{labels.active}</Badge>
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
            href={`/clients/${params.row.id}`}
            action="preview"
            label={labels.preview}
          />
          {canWrite ? (
            <ActionLink
              href={`/clients/${params.row.id}/edit`}
              action="edit"
              label={labels.edit}
            />
          ) : null}
          {canWrite && !params.row.archivedAt ? (
            <RowActionButton
              id={params.row.id}
              action={archiveAction}
              kind="archive"
              label={labels.archive}
              title={labels.archive}
              message={labels.archiveConfirm}
              confirmLabel={labels.archive}
              successTitle={labels.archivedToast}
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
      basePath="/clients"
      query={query}
      noRowsLabel={labels.empty}
    />
  );
}