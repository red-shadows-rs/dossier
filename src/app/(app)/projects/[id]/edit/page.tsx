// Dossier - Projects Id Edit Page
// https://github.com/red-shadows-rs/dossier

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, FolderKanban } from "lucide-react";
import {
  ProjectForm,
  type ProjectFormValues,
} from "@/components/forms/ProjectForm";
import { Button } from "@/components/ui/Button";
import { formatMinor } from "@/lib/money";
import { AppError } from "@/lib/errors";
import { assertCan } from "@/lib/permissions";
import type { CurrencyCode } from "@/lib/constants";
import { requireUserPage } from "@/server/auth/require-user";
import { listClientOptions } from "@/server/services/clients";
import { getProject } from "@/server/services/projects";
import { smoothLoading } from "@/lib/smooth-loader";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const project = getProject(id);
    const t = await getTranslations("projects");
    const name = project.nameAr || project.nameEn || id;
    return {
      title: `${t("edit")} · ${project.code ? `${project.code} · ${name}` : name}`,
    };
  } catch {
    return { title: "Dossier" };
  }
}

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await smoothLoading();
  const user = await requireUserPage();
  assertCan(user, "projects.write");
  const t = await getTranslations("projects");
  const tc = await getTranslations("common");
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
    notes: project.notes ?? "",
  };

  const projectDisplayName = project.nameAr || project.nameEn || project.code;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <Link
            href="/projects"
            className="hover:text-foreground transition-colors"
          >
            {t("title")}
          </Link>
          <span className="text-border">/</span>
          <Link
            href={`/projects/${id}`}
            className="hover:text-foreground transition-colors truncate max-w-[200px]"
          >
            {projectDisplayName}
          </Link>
          <span className="text-border">/</span>
          <span className="text-foreground font-medium">{t("edit")}</span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary shadow-xs">
              <FolderKanban size={22} aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {t("edit")}
                </h1>
                <span
                  className="inline-flex items-center rounded border border-border/60 bg-muted/40 px-2 py-0.5 text-xs font-mono font-medium text-muted-foreground translate-y-0.5"
                  dir="ltr"
                >
                  {project.code}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {projectDisplayName}
              </p>
            </div>
          </div>

          <Link href={`/projects/${id}`}>
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


      <ProjectForm
        mode="edit"
        projectId={id}
        initial={initial}
        clients={clients}
      />
    </div>
  );
}
