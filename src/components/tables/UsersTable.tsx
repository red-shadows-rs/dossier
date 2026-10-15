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
      emptyIcon={<UserCog size={36} className="text-muted-foreground" aria-hidden="true" />}
    />
  );
}