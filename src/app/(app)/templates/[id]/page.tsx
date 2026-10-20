// Dossier - Templates Id Page
// https://github.com/red-shadows-rs/dossier

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { TemplateDetailView } from "@/components/forms/TemplateDetailView";
import { withDbInstance } from "@/db";
import { AppError } from "@/lib/errors";
import { isLocale } from "@/lib/i18n";
import { can } from "@/lib/permissions";
import { templateDefaultsSchema } from "@/lib/validation/template";
import { requireUserPage } from "@/server/auth/require-user";
import { isDemoUser } from "@/server/services/demo";
import { SAMPLE_SNAPSHOT } from "@/server/templating/sample-snapshot";
import { renderTemplatePreviewHtml } from "@/server/templating/preview";
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
    return { title: data.template.nameAr || data.template.nameEn || id };
  } catch {
    return { title: "Dossier" };
  }
}

export default async function TemplateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await smoothLoading();
  const user = await requireUserPage();
  const isDemo = isDemoUser(user.email);
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
    const defaults = templateDefaultsSchema.parse(
      JSON.parse(template.defaultsJson),
    );
    const rawLocale = await getLocale();
    const locale = isLocale(rawLocale) ? rawLocale : "ar";
    const previewHtml = await renderTemplatePreviewHtml(
      clauses,
      locale,
      SAMPLE_SNAPSHOT,
      {
        templateTitleAr: defaults.titleAr || template.nameAr,
        templateTitleEn: defaults.titleEn || template.nameEn,
        hasFees: defaults.hasFees,
        paymentTermsDays: defaults.paymentTermsDays,
      },
    );

    return (
      <TemplateDetailView
        template={template}
        clauses={clauses}
        defaults={defaults}
        previewHtml={previewHtml}
        canWrite={can(user, "templates.write")}
        locale={locale}
      />
    );
  });
}
