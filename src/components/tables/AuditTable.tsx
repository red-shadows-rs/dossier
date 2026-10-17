"use client";

import { ShieldCheck } from "lucide-react";
import { ServerDataTable, type ColumnDef } from "@/components/tables/ServerDataTable";
import { formatInstant } from "@/lib/dates";
import type { Locale } from "@/lib/constants";

export type AuditTableRow = {
  id: number;
  action: string;
  entityType: string;
  entityId: string;
  ts: number;
  actorType: "system" | "user" | "signer";
  actorId: string | null;
  ip: string | null;
  userAgent: string | null;
  metaJson: string | null;
};

export type AuditTableLabels = {
  when: string;
  actor: string;
  action: string;
  entity: string;
  ip: string;
  empty: string;
  actorTypes: Record<string, string>;
};

export function AuditTable({
  rows,
  total,
  page,
  pageSize,
  basePath,
  query,
  labels,
  locale,
}: {
  rows: AuditTableRow[];
  total: number;
  page: number;
  pageSize: number;
  basePath: string;
  query: Record<string, string>;
  labels: AuditTableLabels;
  locale: Locale;
}) {
  const columns: ColumnDef<AuditTableRow>[] = [
    {
      id: "when",
      header: labels.when,
      className: "whitespace-nowrap tabular-nums text-xs text-muted-foreground",
      render: (row) => formatInstant(row.ts, "UTC", locale),
    },
    {
      id: "actor",
      header: labels.actor,
      render: (row) => (
        <span className="flex flex-col gap-0.5">
          <span className="font-medium text-foreground">
            {labels.actorTypes[row.actorType] ?? row.actorType}
          </span>
          {row.actorId ? (
            <span className="text-xs text-muted-foreground font-mono">
              {row.actorId}
            </span>
          ) : null}
        </span>
      ),
    },
    {
      id: "action",
      header: labels.action,
      render: (row) => (
        <span className="font-mono text-xs font-semibold text-foreground">
          {row.action}
        </span>
      ),
    },
    {
      id: "entity",
      header: labels.entity,
      render: (row) => (
        <span className="flex flex-col gap-0.5">
          <span className="font-medium text-foreground">{row.entityType}</span>
          <span className="text-xs text-muted-foreground font-mono">
            {row.entityId}
          </span>
        </span>
      ),
    },
    {
      id: "ip",
      header: labels.ip,
      className: "whitespace-nowrap font-mono text-xs text-muted-foreground",
      render: (row) => row.ip ?? "-",
    },
  ];

  return (
    <ServerDataTable
      rows={rows}
      columns={columns}
      total={total}
      page={page}
      pageSize={pageSize}
      basePath={basePath}
      query={query}
      noRowsLabel={labels.empty}
      emptyIcon={<ShieldCheck size={36} className="text-muted-foreground" aria-hidden="true" />}
      renderMobileCard={(row) => (
        <div className="flex flex-col gap-2 rounded-lg border border-border/70 bg-card/70 p-3.5 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-xs text-foreground font-mono">
              {row.action}
            </span>
            <span className="tabular-nums font-mono text-[11px] text-muted-foreground">
              {formatInstant(row.ts, "UTC", locale)}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs py-1 border-t border-border/40">
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-muted-foreground">{labels.actor}</span>
              <span className="font-medium text-foreground">{labels.actorTypes[row.actorType] ?? row.actorType}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] text-muted-foreground">{labels.entity}</span>
              <span className="font-medium text-foreground">{row.entityType}</span>
            </div>
          </div>
          {row.ip ? (
            <div className="flex items-center justify-between text-[11px] text-muted-foreground/80 font-mono pt-1 border-t border-border/40">
              <span>{labels.ip}: {row.ip}</span>
              <span>{row.entityId.slice(0, 8)}...</span>
            </div>
          ) : null}
        </div>
      )}
    />
  );
}

