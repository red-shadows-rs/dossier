import { getTranslations } from "next-intl/server";
import { NewInvoiceForm } from "@/components/forms/NewInvoiceForm";
import { assertCan } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { listInvoiceableMilestones } from "@/server/services/invoices";
import { listProjectOptions } from "@/server/services/projects";

export default async function NewInvoicePage() {
  const user = await requireUserPage();
  assertCan(user, "invoices.write");
  const t = await getTranslations("invoices");

  const projects = listProjectOptions().map((project) => ({
    id: project.id,
    label: `${project.code} — ${project.nameAr ?? project.nameEn ?? ""}`,
  }));
  const milestones = listInvoiceableMilestones();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-foreground">{t("new")}</h1>
      <NewInvoiceForm projects={projects} milestones={milestones} />
    </div>
  );
}
