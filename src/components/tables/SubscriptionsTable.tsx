// Dossier - Subscriptions Table Tables Component
// https://github.com/red-shadows-rs/dossier

"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { CalendarClock } from "lucide-react";
import { ActionLink } from "@/components/ui/ActionLink";
import { Badge } from "@/components/ui/Badge";
import { RowDuplicateButton } from "@/components/forms/RowDuplicateButton";
import { ServerDataTable, type ColumnDef } from "@/components/tables/ServerDataTable";
import type { ActionResult } from "@/lib/result";
import type { SubscriptionRow } from "@/server/services/subscriptions";
import { subscriptionStatusTone } from "@/lib/subscriptions";

export type SubscriptionsTableLabels = {
  number: string;
  title: string;
  client: string;
  frequency: string;
  nextRunDate: string;
  total: string;
  statusLabel: string;
  actions: string;
  preview: string;
  edit: string;
  empty: string;
  emptyHint?: string;
  newSubscription?: string;
  duplicate?: string;
  duplicateConfirm?: string;
  duplicatedToast?: string;
  clearFilters?: string;
  statusValues: Record<string, string>;
  frequencyValues: Record<string, string>;
};

export function SubscriptionsTable({
  rows,
  total,
  page,
  pageSize,
  query,
  canWrite,
  labels,
  duplicateAction,
}: {
  rows: SubscriptionRow[];
  total: number;
  page: number;
  pageSize: number;
  query: Record<string, string>;
  canWrite: boolean;
  labels: SubscriptionsTableLabels;
  duplicateAction?: (raw: unknown) => Promise<ActionResult<{ id: string }>>;
}) {
  const locale = useLocale();

  const columns: ColumnDef<SubscriptionRow>[] = [
    {
      id: "number",
      header: labels.number,
      className: "min-w-[160px]",
      render: (row) => {
        const title =
          locale === "en"
            ? (row.titleEn || row.titleAr || "-")
            : (row.titleAr || row.titleEn || "-");
        return (
          <div className="flex flex-col items-start min-w-0">
            <Link
              href={`/subscriptions/${row.id}`}
              className="text-foreground hover:text-primary transition-colors font-semibold text-xs font-mono inline-flex items-center text-start"
            >
              <span dir="ltr">{row.number ?? "-"}</span>
            </Link>
            <span className="text-[11px] text-muted-foreground truncate font-medium text-start">
              {title}
            </span>
          </div>
        );
      },
    },
    {
      id: "client",
      header: labels.client,
      className: "min-w-[150px] text-foreground/90 font-medium text-xs",
      render: (row) => (
        <div className="flex flex-col items-start min-w-0">
          <Link
            href={`/clients/${row.clientId}`}
            className="hover:text-primary hover:underline transition-colors truncate"
          >
            {row.clientName}
          </Link>
          {row.projectCode ? (
            <span className="text-[10px] text-muted-foreground font-mono" dir="ltr">
              {row.projectCode}
            </span>
          ) : null}
        </div>
      ),
    },
    {
      id: "status",
      header: labels.statusLabel,
      className: "whitespace-nowrap",
      render: (row) => (
        <Badge tone={subscriptionStatusTone(row.status)}>
          {labels.statusValues[row.status] ?? row.status}
        </Badge>
      ),
    },
    {
      id: "frequency",
      header: labels.frequency,
      className: "whitespace-nowrap text-xs",
      render: (row) => (
        <Badge tone="blue" dot={false} className="text-[11px] font-medium">
          {labels.frequencyValues[row.frequency] ?? row.frequency}
        </Badge>
      ),
    },
    {
      id: "nextRunDate",
      header: labels.nextRunDate,
      className: "whitespace-nowrap text-muted-foreground text-xs",
      render: (row) => (
        <span dir="ltr" className="tabular-nums font-mono text-foreground/80 font-medium">
          {row.nextRunDate}
        </span>
      ),
    },
    {
      id: "total",
      header: labels.total,
      align: "end",
      className: "whitespace-nowrap font-medium text-xs",
      render: (row) => (
        <span dir="ltr" className="tabular-nums font-semibold font-mono text-foreground">
          {row.totalFormatted}
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
            href={`/subscriptions/${row.id}`}
            action="preview"
            label={labels.preview}
          />
          {canWrite ? (
            <ActionLink
              href={`/subscriptions/${row.id}/edit`}
              action="edit"
              label={labels.edit}
            />
          ) : null}
          {canWrite && duplicateAction ? (
            <RowDuplicateButton
              id={row.id}
              action={duplicateAction}
              editHrefPrefix="/subscriptions"
              label={labels.duplicate ?? "تكرار"}
              title={labels.duplicate ?? "تكرار"}
              message={labels.duplicateConfirm ?? "تكرار هذا الاشتراك وإنشاء مسودة جديدة؟"}
              confirmLabel={labels.duplicate ?? "تكرار"}
              successTitle={labels.duplicatedToast ?? "تم تكرار الاشتراك بنجاح"}
            />
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <ServerDataTable
      columns={columns}
      rows={rows}
      total={total}
      page={page}
      pageSize={pageSize}
      basePath="/subscriptions"
      query={query}
      noRowsLabel={labels.empty}
      emptyDescription={labels.emptyHint}
      emptyIcon={
        <CalendarClock
          size={20}
          aria-hidden="true"
        />
      }
    />
  );
}
