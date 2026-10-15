"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { FileCode2 } from "lucide-react";
import { ActionLink } from "@/components/ui/ActionLink";
import { Badge } from "@/components/ui/Badge";
import { RowActionButton } from "@/components/forms/RowActionButton";
import { ServerDataTable, type ColumnDef } from "@/components/tables/ServerDataTable";
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
  const locale = useLocale();

  const columns: ColumnDef<TemplateTableRow>[] = [
    {
      id: "name",
      header: labels.name,
      render: (row) => {
        const name =
          locale === "ar"
            ? (row.nameAr || row.nameEn || "-")
            : (row.nameEn || row.nameAr || "-");
        const dir =
          locale === "ar"
            ? (row.nameAr ? "rtl" : "ltr")
            : (row.nameEn ? "ltr" : "rtl");
        return (
          <Link
            href={`/templates/${row.id}`}
            className="font-semibold text-foreground hover:text-primary transition-colors"
          >
            <span dir={dir}>{name}</span>
          </Link>
        );
      },
    },
    {
      id: "type",
      header: labels.typeLabel,
      className: "whitespace-nowrap text-muted-foreground",
      render: (row) => labels.typeValues[row.type] ?? row.type,
    },
    {
      id: "defaultLanguageMode",
      header: labels.language,
      className: "whitespace-nowrap text-muted-foreground",
      render: (row) =>
        labels.languageValues[row.defaultLanguageMode] ??
        row.defaultLanguageMode,
    },
    {
      id: "clauseCount",
      header: labels.clauses,
      className: "whitespace-nowrap font-mono text-xs text-muted-foreground",
      render: (row) => (
        <span dir="ltr" className="tabular-nums">
          {row.clauseCount}
        </span>
      ),
    },
    {
      id: "source",
      header: labels.source,
      className: "whitespace-nowrap",
      render: (row) =>
        row.isSystem ? (
          <Badge tone="blue">{labels.system}</Badge>
        ) : (
          <Badge tone="gray">{labels.custom}</Badge>
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
            href={`/templates/${row.id}`}
            action="preview"
            label={labels.preview}
          />
          {!row.isSystem ? (
            <RowActionButton
              id={row.id}
              action={archiveAction}
              kind="archive"
              label={labels.archive}
              title={labels.archive}
              message={labels.archiveConfirm}
              confirmLabel={labels.archive}
              successTitle={labels.archivedToast}
            />
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <ServerDataTable
      rows={rows}
      columns={columns}
      noRowsLabel={labels.empty}
      emptyIcon={<FileCode2 size={36} className="text-muted-foreground" aria-hidden="true" />}
    />
  );
}