import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Pencil } from "lucide-react";
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
import { smoothLoading } from "@/lib/smooth-loader";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await smoothLoading();
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
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <Pencil size={20} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t("edit")}</h1>
              <span className="inline-flex items-center rounded border border-border/60 bg-muted/40 px-2 py-0.5 text-xs font-mono font-medium text-muted-foreground translate-y-0.5" dir="ltr">
                {project.code}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {project.nameAr ?? project.nameEn}
            </p>
          </div>
        </div>
      </div>
      <ProjectForm
        mode="edit"
        projectId={id}
        initial={initial}
        clients={clients}
      />
    </div>
  );
}
