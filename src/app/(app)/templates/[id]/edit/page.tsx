import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Pencil } from "lucide-react";
import {
  TemplateForm,
  type TemplateFormValues,
} from "@/components/forms/TemplateForm";
import { AppError } from "@/lib/errors";
import { assertCan } from "@/lib/permissions";
import { templateDefaultsSchema } from "@/lib/validation/template";
import { requireUserPage } from "@/server/auth/require-user";
import { getTemplate } from "@/server/services/templates";
import { smoothLoading } from "@/lib/smooth-loader";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await smoothLoading();
  const user = await requireUserPage();
  assertCan(user, "templates.write");
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

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <Pencil size={20} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t("edit")}</h1>
            <p className="text-xs text-muted-foreground">
              {template.nameAr || template.nameEn}
            </p>
          </div>
        </div>
      </div>
      <TemplateForm mode="edit" templateId={id} initial={initial} />
    </div>
  );
}
