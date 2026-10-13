"use client";

import Link from "next/link";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import MuiLink from "@mui/material/Link";
import MuiStack from "@mui/material/Stack";
import { ActionLink } from "@/components/ui/ActionLink";
import { Badge } from "@/components/ui/Badge";
import { RowActionButton } from "@/components/forms/RowActionButton";
import type { ActionResult } from "@/lib/result";

export type TemplateTableRow = {
  id: string;
  nameAr: string;
  nameEn: string;
  type: string;
  defaultLanguageMode: string;
  clauseCount: number;
  isSystem: boolean;
};

export type TemplateTableLabels = {
  name: string;
  typeLabel: string;
  language: string;
  clauses: string;
  source: string;
  system: string;
  custom: string;
  actions: string;
  preview: string;
  archive: string;
  archiveConfirm: string;
  archivedToast: string;
  empty: string;
  typeValues: Record<string, string>;
  languageValues: Record<string, string>;
};

export function TemplatesTable({
  rows,
  labels,
  archiveAction,
}: {
  rows: TemplateTableRow[];
  labels: TemplateTableLabels;
  archiveAction: (raw: unknown) => Promise<ActionResult<null>>;
}) {
  const columns: GridColDef<TemplateTableRow>[] = [
    {
      field: "name",
      headerName: labels.name,
      flex: 1,
      minWidth: 240,
      sortable: false,
      renderCell: (params) => (
        <MuiLink
          component={Link}
          href={`/templates/${params.row.id}`}
          underline="hover"
          color="inherit"
          sx={{ fontWeight: 600 }}
        >
          <span dir="rtl" lang="ar">
            {params.row.nameAr}
          </span>
          {" / "}
          <span dir="ltr" lang="en">
            {params.row.nameEn}
          </span>
        </MuiLink>
      ),
    },
    {
      field: "type",
      headerName: labels.typeLabel,
      width: 140,
      sortable: false,
      valueGetter: (_value, row) => labels.typeValues[row.type] ?? row.type,
    },
    {
      field: "defaultLanguageMode",
      headerName: labels.language,
      width: 150,
      sortable: false,
      valueGetter: (_value, row) =>
        labels.languageValues[row.defaultLanguageMode] ??
        row.defaultLanguageMode,
    },
    {
      field: "clauseCount",
      headerName: labels.clauses,
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <span dir="ltr" style={{ fontVariantNumeric: "tabular-nums" }}>
          {params.row.clauseCount}
        </span>
      ),
    },
    {
      field: "source",
      headerName: labels.source,
      width: 130,
      sortable: false,
      renderCell: (params) =>
        params.row.isSystem ? (
          <Badge tone="blue">{labels.system}</Badge>
        ) : (
          <Badge tone="gray">{labels.custom}</Badge>
        ),
    },
    {
      field: "actions",
      headerName: labels.actions,
      width: 130,
      sortable: false,
      renderCell: (params) => (
        <MuiStack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
          <ActionLink
            href={`/templates/${params.row.id}`}
            action="preview"
            label={labels.preview}
          />
          {!params.row.isSystem ? (
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
    <DataGrid<TemplateTableRow>
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