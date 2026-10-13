import { getTranslations } from "next-intl/server";
import { NewContractForm } from "@/components/forms/NewContractForm";
import { assertCan } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { listProjectOptions } from "@/server/services/projects";
import { listTemplates } from "@/server/services/templates";

export default async function NewContractPage() {
  const user = await requireUserPage();
  assertCan(user, "contracts.write");
  const t = await getTranslations("contracts");

  const projects = listProjectOptions().map((project) => ({
    id: project.id,
    label: `${project.code} - ${project.nameAr ?? project.nameEn ?? ""}`,
  }));
  const templates = listTemplates().rows.map((template) => ({
    id: template.id,
    label: `${template.nameAr} / ${template.nameEn}`,
  }));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-foreground">{t("new")}</h1>
      <NewContractForm projects={projects} templates={templates} />
    </div>
  );
}
