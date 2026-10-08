import { getTranslations } from "next-intl/server";
import {
  ProjectForm,
  type ProjectFormValues,
} from "@/components/forms/ProjectForm";
import { assertCan } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { listClientOptions } from "@/server/services/clients";
import { getSettings } from "@/server/services/settings";

export default async function NewProjectPage() {
  const user = await requireUserPage();
  assertCan(user, "projects.write");
  const t = await getTranslations("projects");
  const defaults = getSettings("defaults");
  const clients = listClientOptions().map((client) => ({
    id: client.id,
    label: client.nameAr ?? client.nameEn ?? client.id,
  }));

  const initial: ProjectFormValues = {
    clientId: "",
    nameAr: "",
    nameEn: "",
    description: "",
    status: "lead",
    startDate: "",
    endDate: "",
    budget: "",
    currency: defaults.currency,
    taskboardRef: "",
    notes: "",
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-foreground">{t("new")}</h1>
      <ProjectForm mode="create" initial={initial} clients={clients} />
    </div>
  );
}
