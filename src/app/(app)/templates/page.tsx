import Link from "next/link";
import { FileCode2, Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { TemplatesTable } from "@/components/tables/TemplatesTable";
import { archiveTemplateAction } from "@/server/actions/templates";
import { LANG_MODES, TEMPLATE_TYPES } from "@/lib/constants";
import { can } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { listTemplates } from "@/server/services/templates";
import { smoothLoading } from "@/lib/smooth-loader";

export default async function TemplatesPage() {
  await smoothLoading();
  const user = await requireUserPage();
  const t = await getTranslations("templates");
  const tc = await getTranslations("common");
  const { rows } = listTemplates();

  const labels = {
    name: t("name"),
    typeLabel: t("typeLabel"),
    language: t("languageMode"),
    clauses: t("clauses"),
    source: t("source"),
    system: t("system"),
    custom: t("custom"),
    actions: tc("actions"),
    preview: tc("preview"),
    archive: t("archive"),
    archiveConfirm: t("archiveConfirm"),
    archivedToast: t("archivedToast"),
    empty: t("empty"),
    typeValues: Object.fromEntries(
      TEMPLATE_TYPES.map((value) => [value, t(`type.${value}`)]),
    ),
    languageValues: Object.fromEntries(
      LANG_MODES.map((value) => [value, t(`languageModes.${value}`)]),
    ),
  };

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <FileCode2 size={20} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t("title")}</h1>
              <span className="inline-flex items-center rounded border border-border/60 bg-muted/40 px-2 py-0.5 text-xs font-mono font-medium text-muted-foreground translate-y-0.5">
                {rows.length}
              </span>
            </div>
          </div>
        </div>
        {can(user, "templates.write") ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/templates/new">
              <Button type="button" className="gap-1.5 font-medium shadow-xs">
                <Plus size={16} aria-hidden="true" />
                <span>{t("new")}</span>
              </Button>
            </Link>
          </div>
        ) : null}
      </div>

      <div className="overflow-hidden rounded border border-border bg-card">
        <TemplatesTable
          rows={rows}
          labels={labels}
          archiveAction={archiveTemplateAction}
        />
      </div>
    </div>
  );
}