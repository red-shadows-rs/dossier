// Dossier - Templates Id Edit Page
// https://github.com/red-shadows-rs/dossier

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Pencil } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  TemplateForm,
  type TemplateFormValues,
} from "@/components/forms/TemplateForm";
import { withDbInstance } from "@/db";
import { AppError } from "@/lib/errors";
import { assertCan } from "@/lib/permissions";
import { templateDefaultsSchema } from "@/lib/validation/template";
import { requireUserPage } from "@/server/auth/require-user";
import { isDemoUser } from "@/server/services/demo";
import { getTemplate } from "@/server/services/templates";
import { smoothLoading } from "@/lib/smooth-loader";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const data = getTemplate(id);
    const t = await getTranslations("common");
    return { title: `${t("edit")} · ${data.template.nameAr || data.template.nameEn || id}` };
  } catch {
    return { title: "Dossier" };
  }
}

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await smoothLoading();
  const user = await requireUserPage();
  assertCan(user, "templates.write");
  const isDemo = isDemoUser(user.email);
  const t = await getTranslations("templates");
  const tc = await getTranslations("common");
  const { id } = await params;

  return withDbInstance(isDemo, async () => {
    let data;
    try {
      data = getTemplate(id);
    } catch (error) {
      if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
      throw error;
    }

  const { template, clauses } = data;
  if (template.isSystem) {
    redirect(`/templates/${id}`);
  }

  const defaults = templateDefaultsSchema.parse(
    JSON.parse(template.defaultsJson),
  );
  const preset = defaults.milestonePreset;

  const initial: TemplateFormValues = {
    type: template.type,
    nameAr: template.nameAr,
    nameEn: template.nameEn,
    descriptionAr: template.descriptionAr ?? "",
    descriptionEn: template.descriptionEn ?? "",
    defaultLanguageMode: template.defaultLanguageMode,
    hasFees: defaults.hasFees,
    titleAr: defaults.titleAr ?? "",
    titleEn: defaults.titleEn ?? "",
    paymentTermsDays:
      defaults.paymentTermsDays !== undefined
        ? String(defaults.paymentTermsDays)
        : "",
    presetEnabled: preset !== undefined,
    presetMode: preset?.mode ?? "percent",
    presetRows: preset
      ? preset.rows.map((row) => ({
          titleAr: row.titleAr,
          titleEn: row.titleEn,
          percent:
            row.percentBp !== undefined ? String(row.percentBp / 100) : "",
          triggerNoteAr: row.triggerNoteAr ?? "",
          triggerNoteEn: row.triggerNoteEn ?? "",
        }))
      : [
          {
            titleAr: "",
            titleEn: "",
            percent: "",
            triggerNoteAr: "",
            triggerNoteEn: "",
          },
        ],
    clauses: clauses.map((clause) => ({
      key: clause.key,
      titleAr: clause.titleAr,
      titleEn: clause.titleEn,
      bodyAr: clause.bodyAr,
      bodyEn: clause.bodyEn,
    })),
  };

  const templateTitle = template.nameAr || template.nameEn;

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
          <Link
            href={`/templates/${id}`}
            className="hover:text-foreground transition-colors truncate max-w-[200px]"
          >
            {templateTitle}
          </Link>
          <span className="text-border">/</span>
          <span className="text-foreground font-medium">{tc("edit")}</span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
              <Pencil size={20} aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {t("edit")}
              </h1>
              <p className="text-xs text-muted-foreground">
                {templateTitle}
              </p>
            </div>
          </div>

          <Link href={`/templates/${id}`}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1.5 font-medium shadow-xs"
            >
              <ArrowLeft size={15} className="rtl:rotate-180" aria-hidden="true" />
              <span>{tc("back")}</span>
            </Button>
          </Link>
        </div>
      </div>
      <TemplateForm mode="edit" templateId={id} initial={initial} />
    </div>
    );
  });
}
