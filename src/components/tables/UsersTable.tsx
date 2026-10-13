"use client";

import Link from "next/link";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import MuiLink from "@mui/material/Link";
import { ActionLink } from "@/components/ui/ActionLink";
import { Badge } from "@/components/ui/Badge";
import { formatInstant } from "@/lib/dates";
import type { Locale } from "@/lib/constants";

export type UserTableRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  canSignForCompany: boolean;
  status: string;
  lastLoginAt: number | null;
};

export type UserTableLabels = {
  name: string;
  email: string;
  roleLabel: string;
  canSign: string;
  status: string;
  lastLogin: string;
  actions: string;
  preview: string;
  yes: string;
  active: string;
  disabled: string;
  empty: string;
  roleValues: Record<string, string>;
};

export function UsersTable({
  rows,
  labels,
  timezone,
  locale,
}: {
  rows: UserTableRow[];
  labels: UserTableLabels;
  timezone: string;
  locale: Locale;
}) {
  const columns: GridColDef<UserTableRow>[] = [
    {
      field: "name",
      headerName: labels.name,
      flex: 1,
      minWidth: 180,
      sortable: false,
      renderCell: (params) => (
        <MuiLink
          component={Link}
          href={`/users/${params.row.id}`}
          underline="hover"
          color="inherit"
          sx={{ fontWeight: 600 }}
        >
          {params.row.name}
        </MuiLink>
      ),
    },
    {
      field: "email",
      headerName: labels.email,
      width: 240,
      sortable: false,
      renderCell: (params) => <span dir="ltr">{params.row.email}</span>,
    },
    {
      field: "role",
      headerName: labels.roleLabel,
      width: 140,
      sortable: false,
      valueGetter: (_value, row) => labels.roleValues[row.role] ?? row.role,
    },
    {
      field: "canSignForCompany",
      headerName: labels.canSign,
      width: 150,
      sortable: false,
      renderCell: (params) =>
        params.row.canSignForCompany ? (
          <Badge tone="teal">{labels.yes}</Badge>
        ) : (
          <span style={{ opacity: 0.5 }}>-</span>
        ),
    },
    {
      field: "status",
      headerName: labels.status,
      width: 130,
      sortable: false,
      renderCell: (params) =>
        params.row.status === "active" ? (
          <Badge tone="green">{labels.active}</Badge>
        ) : (
          <Badge tone="gray">{labels.disabled}</Badge>
        ),
    },
    {
      field: "lastLoginAt",
      headerName: labels.lastLogin,
      width: 180,
      sortable: false,
      renderCell: (params) =>
        params.row.lastLoginAt ? (
          formatInstant(params.row.lastLoginAt, timezone, locale)
        ) : (
          <span>-</span>
        ),
    },
    {
      field: "actions",
      headerName: labels.actions,
      width: 90,
      sortable: false,
      renderCell: (params) => (
        <ActionLink
          href={`/users/${params.row.id}`}
          action="preview"
          label={labels.preview}
        />
      ),
    },
  ];

  return (
    <DataGrid<UserTableRow>
      rows={rows}
      columns={columns}
      getRowId={(row) => row.id}
      disableColumnMenu
      disableColumnFilter
      disableColumnSelector
      disableRowSelectionOnClick
      autoHeight
      initialState={{ pagination: { paginationModel: { pageSize: 25 } } }}
      pageSizeOptions={[10, 25, 50]}
      localeText={{ noRowsLabel: labels.empty }}
      sx={{ border: 0 }}
    />
  );
}