import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, projects } from "@/db/schema";
import { getLocale } from "next-intl/server";
import { ContractDetailView } from "@/components/forms/ContractDetailView";
import { smoothLoading } from "@/lib/smooth-loader";
import { AppError } from "@/lib/errors";
import { isLocale } from "@/lib/i18n";
import { can } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { listAuditEntries } from "@/server/services/audit";
import {
  getContractDetail,
  listContractVersions,
} from "@/server/services/contracts";
import { listContractSignatories } from "@/server/services/contracts-lifecycle";

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await smoothLoading();
  const user = await requireUserPage();
  const { id } = await params;

  let detail;
  try {
    detail = getContractDetail(id);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  const { contract, items, milestones, clauses } = detail;
  const project = db
    .select()
    .from(projects)
    .where(eq(projects.id, contract.projectId))
    .get();
  const client = project
    ? db.select().from(clients).where(eq(clients.id, project.clientId)).get()
    : undefined;
  const rawLocale = await getLocale();
  const locale = isLocale(rawLocale) ? rawLocale : "ar";

  const versions = listContractVersions(id);
  const signatories = listContractSignatories(id);
  const history = listAuditEntries({
    entityType: "contract",
    entityId: id,
    page: 1,
  });

  return (
    <ContractDetailView
      contract={contract}
      items={items}
      milestones={milestones}
      clauses={clauses}
      project={project}
      client={client}
      versions={versions}
      signatories={signatories}
      history={history}
      canWrite={can(user, "contracts.write")}
      canSend={can(user, "contracts.send")}
      canCancel={can(user, "contracts.cancel")}
      canTerminate={can(user, "contracts.terminate")}
      canRead={can(user, "contracts.read")}
      locale={locale}
    />
  );
}
