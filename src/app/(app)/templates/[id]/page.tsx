import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowRight, Eye, FileCode2, ListOrdered, Pencil } from "lucide-react";
import { TemplateActions } from "@/components/forms/TemplateActions";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { AppError } from "@/lib/errors";
import { isLocale } from "@/lib/i18n";
import { can } from "@/lib/permissions";
import { templateDefaultsSchema } from "@/lib/validation/template";
import { requireUserPage } from "@/server/auth/require-user";
import { SAMPLE_SNAPSHOT } from "@/server/templating/sample-snapshot";
import { renderTemplatePreviewHtml } from "@/server/templating/preview";
import { getTemplate } from "@/server/services/templates";
import { smoothLoading } from "@/lib/smooth-loader";

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await smoothLoading();
  const user = await requireUserPage();
  const t = await getTranslations("templates");
  const { id } = await params;

  let data;
  try {
    data = getTemplate(id);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  const { template, clauses } = data;
  const defaults = templateDefaultsSchema.parse(
    JSON.parse(template.defaultsJson),
  );
  const rawLocale = await getLocale();
  const locale = isLocale(rawLocale) ? rawLocale : "ar";
  const previewHtml = renderTemplatePreviewHtml(
    clauses,
    locale,
    SAMPLE_SNAPSHOT,
  );

  const templateName =
    locale === "ar"
      ? template.nameAr || template.nameEn
      : template.nameEn || template.nameAr;
  const templateDir =
    locale === "ar"
      ? (template.nameAr ? "rtl" : "ltr")
      : (template.nameEn ? "ltr" : "rtl");

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <FileCode2 size={20} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                <span dir={templateDir}>
                  {templateName}
                </span>
              </h1>
              <Badge tone="blue" className="translate-y-0.5">{t(`type.${template.type}`)}</Badge>
              {template.isSystem ? (
                <Badge tone="gray" className="translate-y-0.5">{t("readOnly")}</Badge>
              ) : null}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {can(user, "templates.write") && !template.isSystem ? (
            <Link href={`/templates/${id}/edit`}>
              <Button type="button" variant="secondary" className="gap-1.5 font-medium shadow-xs">
                <Pencil size={15} aria-hidden="true" />
                <span>{t("edit")}</span>
              </Button>
            </Link>
          ) : null}
          {can(user, "templates.write") ? (
            <TemplateActions templateId={id} isSystem={template.isSystem} />
          ) : null}
          <Link href="/templates">
            <Button type="button" variant="secondary" className="gap-1.5 font-medium shadow-xs">
              <ArrowRight size={15} className="rtl:rotate-180" aria-hidden="true" />
              <span>{t("backToList")}</span>
            </Button>
          </Link>
        </div>
      </div>

      {template.isSystem ? (
        <p className="text-sm text-muted-foreground">
          {t("systemReadOnlyNotice")}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <FileCode2 size={18} className="text-primary" aria-hidden="true" />
            <span>{t("details")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p dir="ltr" lang="en" className="text-sm text-foreground">
            {template.nameEn}
          </p>
          {template.descriptionEn ? (
            <p dir="ltr" lang="en" className="text-sm text-muted-foreground">
              {template.descriptionEn}
            </p>
          ) : null}
          {template.descriptionAr ? (
            <p dir="rtl" lang="ar" className="text-sm text-muted-foreground">
              {template.descriptionAr}
            </p>
          ) : null}
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1 rounded border border-border/60 bg-muted/20 p-2.5 transition-colors hover:bg-muted/30">
              <dt className="text-xs font-medium text-muted-foreground">
                {t("languageMode")}
              </dt>
              <dd className="text-sm font-semibold tracking-tight text-foreground">
                {t(`languageModes.${template.defaultLanguageMode}`)}
              </dd>
            </div>
            <div className="flex flex-col gap-1 rounded border border-border/60 bg-muted/20 p-2.5 transition-colors hover:bg-muted/30">
              <dt className="text-xs font-medium text-muted-foreground">{t("hasFees")}</dt>
              <dd className="text-sm font-semibold tracking-tight text-foreground">
                {defaults.hasFees ? t("yes") : t("no")}
              </dd>
            </div>
            <div className="flex flex-col gap-1 rounded border border-border/60 bg-muted/20 p-2.5 transition-colors hover:bg-muted/30">
              <dt className="text-xs font-medium text-muted-foreground">
                {t("paymentTerms")}
              </dt>
              <dd className="text-sm font-semibold tracking-tight text-foreground" dir="ltr">
                {defaults.paymentTermsDays ?? "-"}
              </dd>
            </div>
            <div className="flex flex-col gap-1 rounded border border-border/60 bg-muted/20 p-2.5 transition-colors hover:bg-muted/30">
              <dt className="text-xs font-medium text-muted-foreground">{t("clauses")}</dt>
              <dd className="text-sm font-semibold tracking-tight text-foreground" dir="ltr">
                {clauses.length}
              </dd>
            </div>
          </dl>

          {defaults.milestonePreset ? (
            <div className="flex flex-col gap-2">
              <span className="text-xs text-muted-foreground">
                {t("milestonePreset")}
              </span>
              <ul className="flex flex-col gap-1 text-sm text-foreground">
                {defaults.milestonePreset.rows.map((row, index) => (
                  <li key={index} className="flex flex-wrap items-center gap-2">
                    <span dir="rtl" lang="ar">
                      {row.titleAr}
                    </span>
                    <span dir="ltr" lang="en" className="text-muted-foreground">
                      {row.titleEn}
                    </span>
                    {row.percentBp !== undefined ? (
                      <span dir="ltr" className="text-xs tabular-nums">
                        {row.percentBp / 100}%
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <ListOrdered size={18} className="text-primary" aria-hidden="true" />
            <span>{t("clauseList")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="flex flex-col gap-2">
            {clauses.map((clause) => (
              <li
                key={clause.id}
                className="flex flex-wrap items-baseline gap-2 text-sm"
              >
                <span className="tabular-nums text-muted-foreground" dir="ltr">
                  {clause.position}.
                </span>
                <span
                  dir="rtl"
                  lang="ar"
                  className="font-medium text-foreground"
                >
                  {clause.titleAr}
                </span>
                <span dir="ltr" lang="en" className="text-muted-foreground">
                  {clause.titleEn}
                </span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <Eye size={18} className="text-primary" aria-hidden="true" />
            <span>{t("previewTitle")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">{t("previewHint")}</p>
          <iframe
            title={t("previewTitle")}
            sandbox=""
            srcDoc={previewHtml}
            className="h-[36rem] w-full rounded-md border border-border bg-white"
          />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">{t("legalNotice")}</p>
    </div>
  );
}
