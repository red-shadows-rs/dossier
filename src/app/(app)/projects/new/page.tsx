// Dossier - Projects New Page
// https://github.com/red-shadows-rs/dossier

import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, FolderKanban } from "lucide-react";
import {
  ProjectForm,
  type ProjectFormValues,
} from "@/components/forms/ProjectForm";
import { Button } from "@/components/ui/Button";
import { assertCan } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { listClientOptions } from "@/server/services/clients";
import { getSettings } from "@/server/services/settings";
import { smoothLoading } from "@/lib/smooth-loader";

export default async function NewProjectPage({
  searchParams,
}: {
  searchParams?: Promise<{ clientId?: string }>;
}) {
  await smoothLoading();
  const user = await requireUserPage();
  assertCan(user, "projects.write");
  const t = await getTranslations("projects");
  const tc = await getTranslations("common");
  const defaults = getSettings("defaults");
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const preselectedClientId = resolvedSearchParams.clientId ?? "";

  const clients = listClientOptions().map((client) => ({
    id: client.id,
    label: client.nameAr ?? client.nameEn ?? client.id,
  }));

  const initial: ProjectFormValues = {
    clientId: preselectedClientId,
    nameAr: "",
    nameEn: "",
    description: "",
    status: "lead",
    startDate: "",
    endDate: "",
    budget: "",
    currency: defaults.currency,
    notes: "",
  };

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
          <span className="text-foreground font-medium">{t("new")}</span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary shadow-xs">
              <FolderKanban size={22} aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {t("new")}
              </h1>
              <p className="text-xs text-muted-foreground">
                {t("emptyHint")}
              </p>
            </div>
          </div>

          <Link href="/projects">
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


      <ProjectForm mode="create" initial={initial} clients={clients} />
    </div>
  );
}
