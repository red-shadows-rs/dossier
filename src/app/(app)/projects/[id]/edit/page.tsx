import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  ProjectForm,
  type ProjectFormValues,
} from "@/components/forms/ProjectForm";
import { formatMinor } from "@/lib/money";
import { AppError } from "@/lib/errors";
import { assertCan } from "@/lib/permissions";
import type { CurrencyCode } from "@/lib/constants";
import { requireUserPage } from "@/server/auth/require-user";
import { listClientOptions } from "@/server/services/clients";
import { getProject } from "@/server/services/projects";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUserPage();
  assertCan(user, "projects.write");
  const t = await getTranslations("projects");
  const { id } = await params;

  let project;
  try {
    project = getProject(id);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  const clients = listClientOptions().map((client) => ({
    id: client.id,
    label: client.nameAr ?? client.nameEn ?? client.id,
  }));

  const initial: ProjectFormValues = {
    clientId: project.clientId,
    nameAr: project.nameAr ?? "",
    nameEn: project.nameEn ?? "",
    description: project.description ?? "",
    status: project.status,
    startDate: project.startDate ?? "",
    endDate: project.endDate ?? "",
    budget:
      project.budgetMinor === null
        ? ""
        : formatMinor(
            project.budgetMinor,
            project.currency as CurrencyCode,
            "en",
          ),
    currency: project.currency,
    taskboardRef: project.taskboardRef ?? "",
    notes: project.notes ?? "",
  };

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-foreground">
        {t("edit")} - {project.code}
      </h1>
      <ProjectForm
        mode="edit"
        projectId={id}
        initial={initial}
        clients={clients}
      />
    </div>
  );
}
