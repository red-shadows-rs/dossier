import Link from "next/link";
import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { TemplatesTable } from "@/components/tables/TemplatesTable";
import { archiveTemplateAction } from "@/server/actions/templates";
import { LANG_MODES, TEMPLATE_TYPES } from "@/lib/constants";
import { can } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { listTemplates } from "@/server/services/templates";

export default async function TemplatesPage() {
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        {can(user, "templates.write") ? (
          <Link href="/templates/new">
            <Button type="button">
              <Plus size={16} aria-hidden="true" />
              {t("new")}
            </Button>
          </Link>
        ) : null}
      </div>

      <Card>
        <CardContent>
          <TemplatesTable
            rows={rows}
            labels={labels}
            archiveAction={archiveTemplateAction}
          />
        </CardContent>
      </Card>
    </div>
  );
}