import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Clock,
  Coins,
  Copy,
  Eye,
  FileCode2,
  FileLock2,
  FilePlus2,
  FileText,
  Globe,
  Info,
  Languages,
  ListOrdered,
  Monitor,
  Network,
  Pencil,
  Receipt,
  Server,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
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

function getTemplateIcon(key: string | null, type: string) {
  switch (key) {
    case "web-development":
      return { icon: Globe, bg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" };
    case "mobile-development":
      return { icon: Smartphone, bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" };
    case "desktop-development":
      return { icon: Monitor, bg: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
    case "api-integrations":
      return { icon: Network, bg: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
    case "automation-bot-development":
      return { icon: Bot, bg: "bg-purple-500/10 text-purple-400 border-purple-500/20" };
    case "devops-infrastructure":
      return { icon: Server, bg: "bg-rose-500/10 text-rose-400 border-rose-500/20" };
    case "nda":
      return { icon: ShieldCheck, bg: "bg-red-500/10 text-red-400 border-red-500/20" };
    default:
      return { icon: type === "nda" ? ShieldCheck : FileCode2, bg: "bg-primary/10 text-primary border-primary/20" };
  }
}

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

  const { icon: IconComponent, bg: iconBg } = getTemplateIcon(template.key, template.type);

  const primaryTitle =
    locale === "ar"
      ? (template.nameAr || template.nameEn)
      : (template.nameEn || template.nameAr);
  const secondaryTitle =
    locale === "ar" ? template.nameEn : template.nameAr;

  const canWrite = can(user, "templates.write");

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      {/* Top Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3.5">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${iconBg}`}
          >
            <IconComponent size={22} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {primaryTitle}
              </h1>
              {template.isSystem ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 size={12} className="shrink-0" />
                  <span>{t("system")}</span>
                </span>
              ) : (
                <Badge tone="gray" className="text-xs">
                  {t("custom")}
                </Badge>
              )}
              <Badge tone="blue" className="text-xs">
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
            <Link href={`/contracts/new?templateId=${id}`}>
              <Button type="button" className="gap-1.5 font-semibold shadow-xs">
                <FilePlus2 size={15} aria-hidden="true" />
                <span>{t("useTemplate")}</span>
              </Button>
            </Link>
          ) : null}

          {canWrite && !template.isSystem ? (
            <Link href={`/templates/${id}/edit`}>
              <Button type="button" variant="secondary" className="gap-1.5 font-medium shadow-xs">
                <Pencil size={15} aria-hidden="true" />
                <span>{t("edit")}</span>
              </Button>
            </Link>
          ) : null}

          {canWrite ? (
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

      {/* Official Studio Notice Banner */}
      {template.isSystem ? (
        <div className="flex items-start gap-2.5 rounded-lg border border-border/80 bg-muted/25 px-4 py-3 text-xs leading-relaxed text-muted-foreground">
          <Info size={16} className="text-primary mt-0.5 shrink-0" aria-hidden="true" />
          <span>{t("systemReadOnlyNotice")}</span>
        </div>
      ) : null}

      {/* Card 1: Specifications & Identity */}
      <Card>
        <CardHeader>
          <CardTitle className="inline-flex items-center gap-2">
            <FileCode2 size={18} className="text-primary" aria-hidden="true" />
            <span>{t("details")}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          {/* Bilingual Title & Description Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Arabic Identity Box */}
            <div className="flex flex-col gap-1.5 rounded-lg border border-border/70 bg-muted/15 p-4" dir="rtl">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Languages size={14} />
                <span>{t("arabicTitle")}</span>
              </div>
              <h3 className="text-base font-bold text-foreground">
                {template.nameAr || "-"}
              </h3>
              {template.descriptionAr ? (
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1">
                  {template.descriptionAr}
                </p>
              ) : null}
            </div>

            {/* English Identity Box */}
            <div className="flex flex-col gap-1.5 rounded-lg border border-border/70 bg-muted/15 p-4 font-sans" dir="ltr">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                <Languages size={14} />
                <span>{t("englishTitle")}</span>
              </div>
              <h3 className="text-base font-bold text-foreground font-sans">
                {template.nameEn || "-"}
              </h3>
              {template.descriptionEn ? (
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1 font-sans">
                  {template.descriptionEn}
                </p>
              ) : null}
            </div>
          </div>

          {/* 4 Attributes Metric Chips */}
          <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-muted/20 p-3 transition-colors hover:bg-muted/30">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <ListOrdered size={14} className="text-primary" />
                <span>{t("clauses")}</span>
              </dt>
              <dd className="text-base font-bold tracking-tight text-foreground font-mono">
                {clauses.length} {locale === "ar" ? "بنداً" : "clauses"}
              </dd>
            </div>

            <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-muted/20 p-3 transition-colors hover:bg-muted/30">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Clock size={14} className="text-cyan-400" />
                <span>{t("paymentTerms")}</span>
              </dt>
              <dd className="text-base font-bold tracking-tight text-foreground font-mono">
                {defaults.paymentTermsDays ?? "-"} {locale === "ar" ? "يوماً" : "days"}
              </dd>
            </div>

            <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-muted/20 p-3 transition-colors hover:bg-muted/30">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Coins size={14} className="text-amber-400" />
                <span>{t("hasFees")}</span>
              </dt>
              <dd className="text-base font-bold tracking-tight text-foreground">
                {defaults.hasFees ? t("yes") : t("no")}
              </dd>
            </div>

            <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-muted/20 p-3 transition-colors hover:bg-muted/30">
              <dt className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Languages size={14} className="text-emerald-400" />
                <span>{t("languageMode")}</span>
              </dt>
              <dd className="text-base font-bold tracking-tight text-foreground">
                {t(`languageModes.${template.defaultLanguageMode}`)}
              </dd>
            </div>
          </dl>

          {/* Default Milestones Roadmap */}
          {defaults.milestonePreset && defaults.milestonePreset.rows.length > 0 ? (
            <div className="flex flex-col gap-3 rounded-lg border border-border/70 bg-muted/15 p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground inline-flex items-center gap-1.5">
                  <Receipt size={15} className="text-primary" />
                  <span>{t("milestonePreset")}</span>
                </span>
                <span className="font-mono text-xs text-muted-foreground">
                  {defaults.milestonePreset.rows.length} {locale === "ar" ? "دفعات مرحلية" : "milestones"}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {defaults.milestonePreset.rows.map((row, index) => (
                  <div
                    key={index}
                    className="flex flex-col justify-between gap-2.5 rounded border border-border/80 bg-card p-3 shadow-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded font-mono text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                        {row.percentBp !== undefined ? `${row.percentBp / 100}%` : `#${index + 1}`}
                      </span>
                      <span className="font-mono text-[11px] text-muted-foreground">
                        {locale === "ar" ? `الدفعة 0${index + 1}` : `Phase ${index + 1}`}
                      </span>
                    </div>

                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs font-semibold text-foreground" dir="rtl">
                        {row.titleAr}
                      </p>
                      <p className="text-[11px] text-muted-foreground font-sans line-clamp-2" dir="ltr">
                        {row.titleEn}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Card 2: Clauses List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <CardTitle className="inline-flex items-center gap-2">
              <ListOrdered size={18} className="text-primary" aria-hidden="true" />
              <span>{t("clauseList")}</span>
            </CardTitle>
            <span className="font-mono text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded border border-border/60">
              {clauses.length} {locale === "ar" ? "بنداً معتمداً" : "Clauses"}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col divide-y divide-border/60 rounded border border-border/70 overflow-hidden bg-card">
            {clauses.map((clause) => {
              const hasPricing = clause.bodyAr.includes("pricing_table") || clause.bodyAr.includes("payment_schedule");
              const hasSignatures = clause.bodyAr.includes("signatures");

              return (
                <div
                  key={clause.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-4 py-3 hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted/60 font-mono text-xs font-bold text-muted-foreground">
                      {String(clause.position).padStart(2, "0")}
                    </span>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-sm font-semibold text-foreground truncate" dir="rtl">
                        {clause.titleAr}
                      </span>
                      <span className="text-xs text-muted-foreground font-sans truncate" dir="ltr">
                        {clause.titleEn}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    {hasPricing ? (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-amber-400 border border-amber-500/20">
                        <Coins size={11} />
                        <span>{locale === "ar" ? "جدول التسعير" : "Pricing Table"}</span>
                      </span>
                    ) : null}
                    {hasSignatures ? (
                      <span className="inline-flex items-center gap-1 rounded bg-blue-500/10 px-2 py-0.5 font-mono text-[11px] font-medium text-blue-400 border border-blue-500/20">
                        <CheckCircle2 size={11} />
                        <span>{locale === "ar" ? "كتلة التوقيع" : "Signatures Block"}</span>
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Preview */}
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
