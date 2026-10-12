// Dossier - Contracts New Page
// https://github.com/red-shadows-rs/dossier

import { getLocale, getTranslations } from "next-intl/server";
import { FilePlus2 } from "lucide-react";
import { NewContractForm } from "@/components/forms/NewContractForm";
import { assertCan } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { listProjectOptions } from "@/server/services/projects";
import { listTemplates } from "@/server/services/templates";
import { smoothLoading } from "@/lib/smooth-loader";

export default async function NewContractPage({
  searchParams,
}: {
  searchParams?: Promise<{ templateId?: string; projectId?: string }>;
}) {
  await smoothLoading();
  const user = await requireUserPage();
  assertCan(user, "contracts.write");
  const t = await getTranslations("contracts");
  const rawLocale = await getLocale();
  const locale = rawLocale === "en" ? "en" : "ar";
  const params = await searchParams;

  const projects = listProjectOptions().map((project) => ({
    id: project.id,
    label: `${project.code} - ${(locale === "ar" ? project.nameAr || project.nameEn : project.nameEn || project.nameAr) ?? ""}`,
  }));
  const templates = listTemplates().rows.map((template) => ({
    id: template.id,
    label: (locale === "ar" ? template.nameAr || template.nameEn : template.nameEn || template.nameAr) ?? "",
  }));

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <FilePlus2 size={20} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t("new")}</h1>
          </div>
        </div>
      </div>
      <NewContractForm
        projects={projects}
        templates={templates}
        defaultTemplateId={params?.templateId}
        defaultProjectId={params?.projectId}
      />
    </div>
  );
}
