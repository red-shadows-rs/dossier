"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  ArrowLeft,
  Bot,
  FileCode2,
  FilePlus2,
  FileText,
  Globe,
  Info,
  Layers,
  ListOrdered,
  Monitor,
  Network,
  Pencil,
  Server,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { TemplateActions } from "@/components/forms/TemplateActions";
import { TemplateDocumentViewer } from "@/components/forms/TemplateDocumentViewer";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { UrlTabs } from "@/components/ui/UrlTabs";
import type { DocLang } from "@/lib/doc-lang";
import type { templates, templateClauses } from "@/db/schema";
import type { TemplateDefaults } from "@/lib/validation/template";

type TemplateRow = typeof templates.$inferSelect;
type TemplateClauseRow = typeof templateClauses.$inferSelect;

function getTemplateIcon(key: string | null, type: string) {
  switch (key) {
    case "web-development":
      return Globe;
    case "mobile-development":
      return Smartphone;
    case "desktop-development":
      return Monitor;
    case "api-integrations":
      return Network;
    case "automation-bot-development":
      return Bot;
    case "devops-infrastructure":
      return Server;
    case "nda":
      return ShieldCheck;
    default:
      return type === "nda" ? ShieldCheck : FileCode2;
  }
}

interface TemplateDetailViewProps {
  template: TemplateRow;
  clauses: TemplateClauseRow[];
  defaults: TemplateDefaults;
  previewHtml: string;
  canWrite: boolean;
  locale: "ar" | "en";
}

export function TemplateDetailView({
  template,
  clauses,
  defaults,
  previewHtml,
  canWrite,
  locale,
}: TemplateDetailViewProps) {
  const t = useTranslations("templates");
  const tc = useTranslations("common");

  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "preview";
  const [, setActiveTab] = useState(currentTab);

  const IconComponent = getTemplateIcon(template.key, template.type);

  const primaryTitle =
    locale === "ar"
      ? (template.nameAr || template.nameEn)
      : (template.nameEn || template.nameAr);
  const secondaryTitle =
    locale === "ar" ? template.nameEn : template.nameAr;

  const milestones = defaults.milestonePreset?.rows as Array<{
    titleAr: string;
    titleEn: string;
    percentBp?: number;
  }> | undefined;

  const hasFees = defaults.hasFees ?? (template.type !== "nda");

  const tabs = [
    {
      id: "preview",
      label: t("tabs.preview"),
      icon: FileText,
    },
    {
      id: "details",
      label: t("tabs.details"),
      icon: FileCode2,
    },
    {
      id: "clauses",
      label: t("tabs.clauses"),
      icon: ListOrdered,
      badge: clauses.length,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <Link
            href="/templates"
            className="hover:text-foreground transition-colors"
          >
            {t("title")}
          </Link>
          <span className="text-border">/</span>
          <span className="text-foreground font-medium truncate max-w-[240px]">
            {primaryTitle}
          </span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary">
              <IconComponent size={20} aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {primaryTitle}
                </h1>
                {template.isSystem ? (
                  <Badge tone="green" className="text-xs">
                    {t("officialStudioTemplate")}
                  </Badge>
                ) : (
                  <Badge tone="gray" className="text-xs">
                    {t("customTemplate")}
                  </Badge>
                )}
                <Badge tone="gray" className="text-xs">
                  {t(`type.${template.type}`)}
                </Badge>
                <Badge tone="gray" className="text-xs">
                  {t(`languageModes.${template.defaultLanguageMode}`)}
                </Badge>
              </div>
              {secondaryTitle ? (
                <p
                  className="text-xs font-medium text-muted-foreground font-sans"
                  dir={locale === "ar" ? "ltr" : "rtl"}
                >
                  {secondaryTitle}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {canWrite ? (
              <Link href={`/contracts/new?templateId=${template.id}`}>
                <Button type="button" className="gap-1.5 font-medium shadow-xs">
                  <FilePlus2 size={15} aria-hidden="true" />
                  <span>{t("useTemplate")}</span>
                </Button>
              </Link>
            ) : null}

            {canWrite && !template.isSystem ? (
              <Link href={`/templates/${template.id}/edit`}>
                <Button type="button" variant="secondary" className="gap-1.5 font-medium shadow-xs">
                  <Pencil size={15} aria-hidden="true" />
                  <span>{tc("edit")}</span>
                </Button>
              </Link>
            ) : null}

            {canWrite ? (
              <TemplateActions templateId={template.id} isSystem={template.isSystem} />
            ) : null}

            <Link href="/templates">
              <Button type="button" variant="secondary" className="gap-1.5 font-medium shadow-xs">
                <ArrowLeft size={15} className="rtl:rotate-180" aria-hidden="true" />
                <span>{t("backToList")}</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {template.isSystem ? (
        <div className="flex items-start gap-2.5 rounded border border-border bg-muted/20 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          <Info size={16} className="text-primary mt-0.5 shrink-0" aria-hidden="true" />
          <span>{t("systemReadOnlyNotice")}</span>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="flex flex-col gap-1 rounded border border-border bg-card p-3 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">{t("clauses")}</span>
          <span className="text-lg font-bold font-mono tabular-nums text-foreground">
            {clauses.length}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded border border-border bg-card p-3 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">{t("hasFees")}</span>
          <span className="text-lg font-bold text-foreground">
            {hasFees ? t("yes") : t("no")}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded border border-border bg-card p-3 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">{t("paymentTerms")}</span>
          <span className="text-lg font-bold font-mono tabular-nums text-foreground">
            {defaults.paymentTermsDays ?? 30} {locale === "ar" ? "يوم" : "days"}
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded border border-border bg-card p-3 shadow-xs">
          <span className="text-xs font-medium text-muted-foreground">{t("milestonePreset")}</span>
          <span className="text-lg font-bold font-mono tabular-nums text-foreground">
            {milestones?.length ?? 0}
          </span>
        </div>
      </div>

      <UrlTabs tabs={tabs} defaultTab="preview" onChange={setActiveTab} />

      <div className={currentTab === "preview" ? "block space-y-6" : "hidden"}>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="inline-flex items-center gap-2">
              <FileText size={18} className="text-primary" aria-hidden="true" />
              <span>{t("previewTitle")}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <TemplateDocumentViewer
              clauses={clauses.map((c) => ({
                id: c.id,
                position: c.position,
                titleAr: c.titleAr,
                titleEn: c.titleEn,
                bodyAr: c.bodyAr,
                bodyEn: c.bodyEn,
              }))}
              initialHtml={previewHtml}
              defaultLang={(template.defaultLanguageMode as DocLang) || "ar"}
              templateTitleAr={defaults.titleAr || template.nameAr}
              templateTitleEn={defaults.titleEn || template.nameEn}
              hasFees={defaults.hasFees}
              paymentTermsDays={defaults.paymentTermsDays}
            />
          </CardContent>
        </Card>
      </div>

      <div className={currentTab === "details" ? "block space-y-6" : "hidden"}>
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-8">
            <Card>
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <FileCode2 size={18} className="text-primary" aria-hidden="true" />
                  <span>{t("templateIdentity")}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5 rounded border border-border bg-muted/20 p-4" dir="rtl">
                    <span className="text-xs font-semibold text-primary">{t("arabicTitle")}</span>
                    <h3 className="text-base font-bold text-foreground">
                      {template.nameAr || "-"}
                    </h3>
                    {template.descriptionAr ? (
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                        {template.descriptionAr}
                      </p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-1.5 rounded border border-border bg-muted/20 p-4 font-sans" dir="ltr">
                    <span className="text-xs font-semibold text-primary">{t("englishTitle")}</span>
                    <h3 className="text-base font-bold text-foreground font-sans">
                      {template.nameEn || "-"}
                    </h3>
                    {template.descriptionEn ? (
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1 font-sans">
                        {template.descriptionEn}
                      </p>
                    ) : null}
                  </div>
                </div>

                {milestones && milestones.length > 0 ? (
                  <div className="flex flex-col gap-2 rounded border border-border bg-muted/20 p-3.5 mt-2">
                    <div className="flex items-center justify-between text-xs font-semibold text-foreground">
                      <span>{t("milestonePreset")}</span>
                      <span className="font-mono text-muted-foreground">{milestones.length} {locale === "ar" ? "دفعات" : "milestones"}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {milestones.map((m, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded border border-border bg-card p-2.5 text-xs"
                        >
                          <span className="font-medium text-foreground">
                            {locale === "ar" ? m.titleAr : m.titleEn}
                          </span>
                          <span className="font-mono font-bold text-primary">
                            {(m.percentBp ?? 0) / 100}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-6 lg:col-span-4">
            <Card>
              <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                  <Layers size={18} className="text-primary" aria-hidden="true" />
                  <span>{t("templateSpecs")}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3 text-xs">
                <div className="flex items-center justify-between px-1">
                  <span className="text-muted-foreground">{t("typeLabel")}</span>
                  <Badge tone="gray">{t(`type.${template.type}`)}</Badge>
                </div>
                <div className="flex items-center justify-between px-1">
                  <span className="text-muted-foreground">{t("defaultLanguage")}</span>
                  <span className="font-semibold text-foreground">
                    {t(`languageModes.${template.defaultLanguageMode}`)}
                  </span>
                </div>
                <div className="flex items-center justify-between px-1">
                  <span className="text-muted-foreground">{t("paymentTerms")}</span>
                  <span className="font-semibold text-foreground font-mono">
                    {defaults.paymentTermsDays ?? 30} {locale === "ar" ? "يوم" : "days"}
                  </span>
                </div>
                <div className="flex items-center justify-between px-1">
                  <span className="text-muted-foreground">{t("hasFees")}</span>
                  <span className="font-semibold text-foreground">
                    {hasFees ? t("yes") : t("no")}
                  </span>
                </div>
                {template.descriptionAr ? (
                  <div className="flex flex-col gap-1 border-t border-border pt-2">
                    <span className="text-muted-foreground font-medium">{t("scopeNote")}</span>
                    <p className="text-foreground leading-relaxed">
                      {locale === "ar" ? template.descriptionAr : (template.descriptionEn || template.descriptionAr)}
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <div className={currentTab === "clauses" ? "block space-y-6" : "hidden"}>
        <Card>
          <CardHeader>
            <CardTitle className="inline-flex items-center gap-2">
              <ListOrdered size={18} className="text-primary" aria-hidden="true" />
              <span>{t("clauseList")}</span>
              <span className="text-xs font-normal text-muted-foreground">
                ({clauses.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {clauses.map((clause) => {
              const clauseTitle =
                locale === "ar"
                  ? (clause.titleAr || clause.titleEn)
                  : (clause.titleEn || clause.titleAr);
              const clauseBody =
                locale === "ar"
                  ? (clause.bodyAr || clause.bodyEn)
                  : (clause.bodyEn || clause.bodyAr);

              return (
                <div
                  key={clause.id}
                  className="flex flex-col gap-2 rounded border border-border bg-card p-4 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-bold font-mono text-primary shrink-0">
                      {locale === "ar" ? `المادة ${clause.position}` : `Art. ${clause.position}`}
                    </span>
                    <h4 className="text-sm font-bold text-foreground">
                      {clauseTitle}
                    </h4>
                  </div>
                  {clauseBody ? (
                    <p className="text-xs sm:text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed pt-1 border-t border-border/40">
                      {clauseBody}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
