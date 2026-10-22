// Dossier - Users Table Tables Component
// https://github.com/red-shadows-rs/dossier

"use client";

import Link from "next/link";
import { UserCog } from "lucide-react";
import { ActionLink } from "@/components/ui/ActionLink";
import { Badge } from "@/components/ui/Badge";
import { ServerDataTable, type ColumnDef } from "@/components/tables/ServerDataTable";
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
  const columns: ColumnDef<UserTableRow>[] = [
    {
      id: "name",
      header: labels.name,
      render: (row) => (
        <Link
          href={`/users/${row.id}`}
          className="font-semibold text-foreground hover:text-primary transition-colors"
        >
          {row.name}
        </Link>
      ),
    },
    {
      id: "email",
      header: labels.email,
      className: "whitespace-nowrap font-mono text-xs",
      render: (row) => (
        <span dir="ltr" className="text-muted-foreground">
          {row.email}
        </span>
      ),
    },
    {
      id: "role",
      header: labels.roleLabel,
      className: "whitespace-nowrap",
      render: (row) => (
        <Badge tone="blue">
          {labels.roleValues[row.role] ?? row.role}
        </Badge>
      ),
    },
    {
      id: "canSignForCompany",
      header: labels.canSign,
      className: "whitespace-nowrap",
      render: (row) =>
        row.canSignForCompany ? (
          <Badge tone="teal">{labels.yes}</Badge>
        ) : (
          <span className="text-muted-foreground">-</span>
        ),
    },
    {
      id: "status",
      header: labels.status,
      className: "whitespace-nowrap",
      render: (row) =>
        row.status === "active" ? (
          <Badge tone="green">{labels.active}</Badge>
        ) : (
          <Badge tone="gray">{labels.disabled}</Badge>
        ),
    },
    {
      id: "lastLoginAt",
      header: labels.lastLogin,
      className: "whitespace-nowrap text-xs text-muted-foreground",
      render: (row) =>
        row.lastLoginAt ? (
          <span dir="ltr" className="tabular-nums">
            {formatInstant(row.lastLoginAt, timezone, locale)}
          </span>
        ) : (
          <span>-</span>
        ),
    },
    {
      id: "actions",
      header: labels.actions,
      align: "end",
      className: "whitespace-nowrap",
      render: (row) => (
        <div className="inline-flex items-center justify-end">
          <ActionLink
            href={`/users/${row.id}`}
            action="preview"
            label={labels.preview}
          />
        </div>
      ),
    },
  ];

  return (
    <ServerDataTable
      rows={rows}
      columns={columns}
      noRowsLabel={labels.empty}
      emptyIcon={<UserCog size={32} aria-hidden="true" />}
      renderMobileCard={(row) => {
        return (
          <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-card/70 p-3.5 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/users/${row.id}`}
                className="font-bold text-sm text-foreground hover:text-primary transition-colors"
              >
                {row.name}
              </Link>
              <Badge tone={row.status === "active" ? "green" : "gray"} className="shrink-0 text-xs">
                {row.status === "active" ? labels.active : labels.disabled}
              </Badge>
            </div>

            <div className="flex flex-col gap-1 text-xs text-muted-foreground">
              <span dir="ltr" className="font-mono text-muted-foreground/90">{row.email}</span>
              <div className="flex items-center gap-2 pt-1">
                <span className="rounded bg-muted/40 border border-border/50 px-2 py-0.5 text-[11px] font-medium">
                  {labels.roleValues[row.role] ?? row.role}
                </span>
                {row.canSignForCompany ? (
                  <span className="text-[11px] text-emerald-400 font-medium">
                    ✓ {labels.canSign}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-border/50">
              <ActionLink
                href={`/users/${row.id}`}
                action="preview"
                label={labels.preview}
              />
            </div>
          </div>
        );
      }}
    />
  );
}