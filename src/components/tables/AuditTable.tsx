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
    />
  );
}

