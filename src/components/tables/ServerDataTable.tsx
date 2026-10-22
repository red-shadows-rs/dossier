// Dossier - Server Data Table Tables Component
// https://github.com/red-shadows-rs/dossier

"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";
import { useLocale } from "next-intl";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/Button";
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
  minWidth = "min-w-[560px]",
  renderMobileCard,
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
  minWidth?: string;
  renderMobileCard?: (row: R) => ReactNode;
}) {
  const locale = useLocale();
  const isAr = locale !== "en";

  const [clientPage, setClientPage] = useState(1);

  const isServer = typeof total === "number" && typeof basePath === "string" && typeof page === "number";
  const effectiveTotal = isServer ? total : rows.length;
  const effectivePage = isServer ? page : clientPage;
  const effectivePageSize = pageSize ?? 25;
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / effectivePageSize));

  const displayRows = isServer
    ? rows
    : rows.slice((clientPage - 1) * effectivePageSize, clientPage * effectivePageSize);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollIndicators = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;
    if (maxScroll <= 2) {
      setCanScrollLeft(false);
      setCanScrollRight(false);
      return;
    }
    const absScroll = Math.abs(scrollLeft);
    setCanScrollLeft(absScroll > 4);
    setCanScrollRight(absScroll < maxScroll - 4);
  }, []);

  useEffect(() => {
    updateScrollIndicators();
    const el = scrollContainerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(updateScrollIndicators);
    observer.observe(el);
    return () => observer.disconnect();
  }, [updateScrollIndicators, displayRows]);

  if (effectiveTotal === 0 && !externalLoading) {
    const hasActiveFilters = Boolean(
      query.q ||
        query.status ||
        query.clientId ||
        query.projectId ||
        query.frequency ||
        query.overdue ||
        query.archived,
    );

    const fallbackTitle = hasActiveFilters
      ? (isAr ? "لا توجد نتائج مطابقة للبحث" : "No matching results found")
      : (noRowsLabel ?? (isAr ? "لا توجد بيانات" : "No data available"));

    const fallbackDescription = hasActiveFilters
      ? (isAr
          ? "جرّب تغيير كلمات البحث أو إعادة ضبط خيارات التصفية."
          : "Try adjusting your search terms or filters.")
      : emptyDescription;

    const fallbackAction =
      emptyAction ??
      (hasActiveFilters && basePath ? (
        <Link href={basePath}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-1.5 font-medium cursor-pointer"
          >
            <RotateCcw size={14} aria-hidden="true" />
            <span>{isAr ? "إعادة ضبط الفلاتر" : "Clear filters"}</span>
          </Button>
        </Link>
      ) : null);

    return (
      <EmptyState
        icon={emptyIcon}
        title={noRowsLabel && !hasActiveFilters ? noRowsLabel : fallbackTitle}
        description={emptyDescription ?? fallbackDescription}
        action={fallbackAction}
        className="border-0 bg-transparent py-12 sm:py-16"
      />
    );
  }

  return (
    <div className="relative w-full">
      {externalLoading ? (
        <div className="absolute inset-0 z-10 flex flex-col justify-start bg-card/75 backdrop-blur-[1px] p-4 divide-y divide-border/50 pointer-events-none">
          {Array.from({ length: Math.min(rows.length || 5, 6) }).map((_, i) => (
            <div key={i} className="py-3.5 flex flex-col md:flex-row md:items-center gap-2 md:gap-4">
              <div className="flex items-center justify-between w-full md:w-auto">
                <Skeleton className="h-4 w-36 rounded" />
                <Skeleton className="h-5 w-16 rounded md:hidden" />
              </div>
              <Skeleton className="h-4 w-28 rounded hidden sm:block" />
              <Skeleton className="h-4 w-32 rounded hidden md:block" />
              <Skeleton className="h-4 w-20 rounded hidden lg:block" />
              <Skeleton className="h-4 w-24 rounded ms-auto" />
            </div>
          ))}
        </div>
      ) : null}

      <div className="md:hidden flex flex-col divide-y divide-border/60">
        {displayRows.map((row) => (
          <div key={row.id} className="p-3.5 hover:bg-muted/15 transition-colors">
            {renderMobileCard ? (
              renderMobileCard(row)
            ) : (
              <div className="flex flex-col gap-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-semibold text-sm text-foreground">
                    {columns[0]?.render(row)}
                  </div>
                  {columns.length > 2 && (
                    <div className="shrink-0">
                      {columns[2]?.render(row)}
                    </div>
                  )}
                </div>
                {columns.length > 3 && (
                  <div className="grid grid-cols-2 gap-2 text-xs py-1 border-t border-border/40">
                    {columns.slice(1, -1).map((col) => (
                      <div key={col.id} className="flex flex-col gap-0.5">
                        <span className="text-[11px] text-muted-foreground">{col.header}</span>
                        <div className="text-foreground">{col.render(row)}</div>
                      </div>
                    ))}
                  </div>
                )}
                {columns[columns.length - 1]?.id === "actions" && (
                  <div className="flex items-center justify-end pt-1.5 border-t border-border/50">
                    {columns[columns.length - 1]?.render(row)}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="hidden md:block relative w-full">
        {canScrollLeft ? (
          <div className="pointer-events-none absolute inset-y-0 start-0 z-10 w-6 bg-gradient-to-r from-card to-transparent rtl:bg-gradient-to-l opacity-80" />
        ) : null}
        {canScrollRight ? (
          <div className="pointer-events-none absolute inset-y-0 end-0 z-10 w-6 bg-gradient-to-l from-card to-transparent rtl:bg-gradient-to-r opacity-80" />
        ) : null}

        <div
          ref={scrollContainerRef}
          onScroll={updateScrollIndicators}
          className="w-full overflow-x-auto touch-pan-x [scrollbar-width:thin]"
        >
          <table className={clsx("w-full text-start text-sm border-collapse", minWidth)}>
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs font-semibold text-muted-foreground">
                {columns.map((col) => (
                  <th
                    key={col.id}
                    scope="col"
                    className={clsx(
                      "py-3 px-3.5 sm:px-4 select-none whitespace-nowrap",
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
                        "py-3 px-3.5 sm:px-4 text-foreground align-middle",
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
                className="inline-flex items-center gap-1.5 rounded border border-border px-3 py-1 text-xs font-medium text-foreground disabled:opacity-50 hover:bg-muted/40 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} className="rtl:rotate-180 shrink-0" aria-hidden="true" />
                <span>{isAr ? "السابق" : "Previous"}</span>
              </button>
              <span className="text-xs text-muted-foreground tabular-nums font-mono" dir="ltr">
                {clientPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={clientPage >= totalPages}
                onClick={() => setClientPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1.5 rounded border border-border px-3 py-1 text-xs font-medium text-foreground disabled:opacity-50 hover:bg-muted/40 transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                <span>{isAr ? "التالي" : "Next"}</span>
                <ChevronRight size={14} className="rtl:rotate-180 shrink-0" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
