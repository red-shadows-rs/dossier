"use client";

import { useRouter } from "next/navigation";
import {
  DataGrid,
  type GridColDef,
  type GridValidRowModel,
} from "@mui/x-data-grid";

export function ServerDataGrid<R extends GridValidRowModel>({
  rows,
  columns,
  total,
  page,
  pageSize,
  basePath,
  query,
  noRowsLabel,
}: {
  rows: R[];
  columns: GridColDef<R>[];
  total: number;
  page: number;
  pageSize: number;
  basePath: string;
  query: Record<string, string>;
  noRowsLabel?: string;
}) {
  const router = useRouter();

  return (
    <DataGrid<R>
      rows={rows}
      columns={columns}
      getRowId={(row) => (row as unknown as { id: string }).id}
      paginationMode="server"
      rowCount={total}
      paginationModel={{ page: page - 1, pageSize }}
      pageSizeOptions={[pageSize]}
      onPaginationModelChange={(model) => {
        const params = new URLSearchParams(query);
        params.set("page", String(model.page + 1));
        router.push(`${basePath}?${params.toString()}`);
      }}
      disableColumnMenu
      disableColumnFilter
      disableColumnSelector
      disableRowSelectionOnClick
      autoHeight
      localeText={noRowsLabel ? { noRowsLabel } : undefined}
      sx={{ border: 0 }}
    />
  );
}