"use client";

import { useState, type ReactNode } from "react";
import clsx from "clsx";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";

export type ColumnDef<R> = {
  id: string;
  header: ReactNode;
  align?: "start" | "center" | "end";
  className?: string;
  headerClassName?: string;
  render: (row: R) => ReactNode;
};

export function ServerDataTable<R extends { id: string | number }>({
  rows,
  columns,
  total,
  page,
  pageSize,
  basePath,
  query = {},
  noRowsLabel,
  loading: externalLoading,
  emptyIcon,
  emptyDescription,
  emptyAction,
}: {
  rows: R[];
  columns: ColumnDef<R>[];
  total?: number;
  page?: number;
  pageSize?: number;
  basePath?: string;
  query?: Record<string, string>;
  noRowsLabel?: string;
  loading?: boolean;
  emptyIcon?: ReactNode;
  emptyDescription?: ReactNode;
  emptyAction?: ReactNode;
}) {
  const [clientPage, setClientPage] = useState(1);

  const isServer = typeof total === "number" && typeof basePath === "string" && typeof page === "number";
  const effectiveTotal = isServer ? total : rows.length;
  const effectivePage = isServer ? page : clientPage;
  const effectivePageSize = pageSize ?? 25;
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / effectivePageSize));

  const displayRows = isServer
    ? rows
    : rows.slice((clientPage - 1) * effectivePageSize, clientPage * effectivePageSize);

  // If no rows, hide headers completely and show EmptyState
  if (effectiveTotal === 0 && !externalLoading) {
    return (
      <EmptyState
        icon={emptyIcon}
        title={noRowsLabel ?? "لا توجد بيانات"}
        description={emptyDescription}
        action={emptyAction}
        className="border-0 bg-transparent py-14"
      />
    );
  }

  return (
    <div className="relative w-full">
      {externalLoading ? (
        <div className="absolute inset-0 z-10 flex flex-col justify-start bg-card/75 backdrop-blur-[1px] p-4 divide-y divide-border/50 pointer-events-none">
          {Array.from({ length: Math.min(rows.length || 5, 6) }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 py-3.5">
              <Skeleton className="h-4 w-36 rounded" />
              <Skeleton className="h-4 w-28 rounded hidden sm:block" />
              <Skeleton className="h-4 w-32 rounded hidden md:block" />
              <Skeleton className="h-4 w-20 rounded hidden lg:block" />
              <Skeleton className="h-4 w-24 rounded ms-auto" />
            </div>
          ))}
        </div>
      ) : null}

      <div className="w-full overflow-x-auto">
        <table className="w-full text-start text-sm border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
              {columns.map((col) => (
                <th
                  key={col.id}
                  scope="col"
                  className={clsx(
                    "py-3 px-4 select-none whitespace-nowrap",
                    col.align === "end"
                      ? "text-end"
                      : col.align === "center"
                        ? "text-center"
                        : "text-start",
                    col.headerClassName,
                  )}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50">
            {displayRows.map((row) => (
              <tr
                key={row.id}
                className="hover:bg-muted/30 transition-colors"
              >
                {columns.map((col) => (
                  <td
                    key={col.id}
                    className={clsx(
                      "py-3.5 px-4 text-foreground align-middle",
                      col.align === "end"
                        ? "text-end"
                        : col.align === "center"
                          ? "text-center"
                          : "text-start",
                      col.className,
                    )}
                  >
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="border-t border-border px-4 py-2.5">
          {isServer ? (
            <Pagination
              page={effectivePage}
              totalPages={totalPages}
              basePath={basePath}
              query={query}
            />
          ) : (
            <div className="flex items-center justify-between text-sm py-1">
              <button
                type="button"
                disabled={clientPage <= 1}
                onClick={() => setClientPage((p) => Math.max(1, p - 1))}
                className="rounded border border-border px-3 py-1 text-xs font-medium text-foreground disabled:opacity-50 hover:bg-muted/40 transition-colors"
              >
                السابق
              </button>
              <span className="text-xs text-muted-foreground tabular-nums font-mono" dir="ltr">
                {clientPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={clientPage >= totalPages}
                onClick={() => setClientPage((p) => Math.min(totalPages, p + 1))}
                className="rounded border border-border px-3 py-1 text-xs font-medium text-foreground disabled:opacity-50 hover:bg-muted/40 transition-colors"
              >
                التالي
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

// Re-export for compatibility
export const ServerDataGrid = ServerDataTable;
export const DataTable = ServerDataTable;
