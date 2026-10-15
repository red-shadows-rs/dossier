import { getTranslations } from "next-intl/server";
import { FolderPlus } from "lucide-react";
import {
  ProjectForm,
  type ProjectFormValues,
} from "@/components/forms/ProjectForm";
import { assertCan } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { listClientOptions } from "@/server/services/clients";
import { getSettings } from "@/server/services/settings";
import { smoothLoading } from "@/lib/smooth-loader";

export default async function NewProjectPage() {
  await smoothLoading();
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
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <FolderPlus size={20} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t("new")}</h1>
          </div>
        </div>
      </div>
      <ProjectForm mode="create" initial={initial} clients={clients} />
    </div>
  );
}
