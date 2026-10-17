import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { ClientDetailView } from "@/components/forms/ClientDetailView";
import { AppError } from "@/lib/errors";
import { can } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { canDeleteClient, getClient } from "@/server/services/clients";
import { listContracts } from "@/server/services/contracts";
import { listInvoices } from "@/server/services/invoices";
import { listProjects } from "@/server/services/projects";
import { smoothLoading } from "@/lib/smooth-loader";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await smoothLoading();
  const user = await requireUserPage();
  const rawLocale = await getLocale();
  const locale = rawLocale === "en" ? "en" : "ar";
  const { id } = await params;

  let client;
  try {
    client = getClient(id);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  const canWrite = can(user, "clients.write");
  const canDelete = canDeleteClient(id);

  // Fetch associated records for this client
  const projectsPage = listProjects({ clientId: id });
  const contractsPage = listContracts({ clientId: id });
  const invoicesPage = listInvoices({ clientId: id });

  return (
    <ClientDetailView
      client={client}
      projects={projectsPage.rows}
      contracts={contractsPage.rows}
      invoices={invoicesPage.rows}
      canWrite={canWrite}
      canDelete={canDelete}
      locale={locale}
    />
  );
}

