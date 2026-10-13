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
  const columns: GridColDef<ProjectTableRow>[] = [
    {
      field: "code",
      headerName: labels.code,
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <MuiLink
          component={Link}
          href={`/projects/${params.row.id}`}
          underline="hover"
          color="inherit"
          sx={{ fontFamily: "monospace", fontWeight: 600 }}
          dir="ltr"
        >
          {params.row.code}
        </MuiLink>
      ),
    },
    {
      field: "name",
      headerName: labels.name,
      flex: 1,
      minWidth: 220,
      sortable: false,
      renderCell: (params) => (
        <MuiLink
          component={Link}
          href={`/projects/${params.row.id}`}
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
      field: "client",
      headerName: labels.client,
      width: 200,
      sortable: false,
      valueGetter: (_value, row) => clientNames[row.clientId ?? ""] ?? "-",
    },
    {
      field: "status",
      headerName: labels.statusLabel,
      width: 140,
      sortable: false,
      renderCell: (params) => (
        <Badge tone="blue">
          {labels.statusValues[params.row.status] ?? params.row.status}
        </Badge>
      ),
    },
    {
      field: "currency",
      headerName: labels.currency,
      width: 110,
      sortable: false,
      renderCell: (params) => <span dir="ltr">{params.row.currency}</span>,
    },
    {
      field: "actions",
      headerName: labels.actions,
      width: 170,
      sortable: false,
      renderCell: (params) => (
        <MuiStack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          <ActionLink
            href={`/projects/${params.row.id}`}
            action="preview"
            label={labels.preview}
          />
          {canWrite ? (
            <ActionLink
              href={`/projects/${params.row.id}/edit`}
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
      basePath="/projects"
      query={query}
      noRowsLabel={labels.empty}
    />
  );
}