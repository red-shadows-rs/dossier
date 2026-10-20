// Dossier - Projects Id Page
// https://github.com/red-shadows-rs/dossier

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { ProjectDetailView } from "@/components/forms/ProjectDetailView";
import { withDbInstance } from "@/db";
import { AppError } from "@/lib/errors";
import { isLocale } from "@/lib/i18n";
import { can } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { isDemoUser } from "@/server/services/demo";
import { listProjectContracts } from "@/server/services/contracts";
import {
  listInvoiceableMilestones,
  listInvoices,
} from "@/server/services/invoices";
import {
  getProjectSummary,
  listProjectActivity,
  listProjectAttachments,
} from "@/server/services/project-summary";
import { getProjectWithClient } from "@/server/services/projects";
import { smoothLoading } from "@/lib/smooth-loader";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const data = getProjectWithClient(id);
    const p = data.project;
    const name = p.nameAr || p.nameEn || id;
    const title = p.code ? `${p.code} · ${name}` : name;
    return { title };
  } catch {
    return { title: "Dossier" };
  }
}

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await smoothLoading();
  const user = await requireUserPage();
  const isDemo = isDemoUser(user.email);
  const rawLocale = await getLocale();
  const locale = isLocale(rawLocale) ? rawLocale : "ar";
  const { id } = await params;

  return withDbInstance(isDemo, async () => {
    let data;
    try {
      data = getProjectWithClient(id);
    } catch (error) {
      if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
      throw error;
    }

    const { project, client } = data;
    const canWrite = can(user, "projects.write");
    const contracts = listProjectContracts(id);
    const summary = getProjectSummary(id);
    const milestones = listInvoiceableMilestones(id, locale);
    const projectInvoices = listInvoices({ projectId: id, page: 1 }).rows;
    const attachments = listProjectAttachments(id);
    const activity = listProjectActivity(id);

    return (
      <ProjectDetailView
        project={project}
        client={client}
        contracts={contracts}
        invoices={projectInvoices}
        milestones={milestones}
        summary={summary}
        attachments={attachments}
        activity={activity}
        canWrite={canWrite}
        locale={locale}
      />
    );
  });
}
