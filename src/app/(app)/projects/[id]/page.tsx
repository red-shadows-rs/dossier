import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { ProjectDetailView } from "@/components/forms/ProjectDetailView";
import { AppError } from "@/lib/errors";
import { isLocale } from "@/lib/i18n";
import { can } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
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

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await smoothLoading();
  const user = await requireUserPage();
  const rawLocale = await getLocale();
  const locale = isLocale(rawLocale) ? rawLocale : "ar";
  const { id } = await params;

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
}
