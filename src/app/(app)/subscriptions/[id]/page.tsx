// Dossier - Subscription Detail Page
// https://github.com/red-shadows-rs/dossier

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale } from "next-intl/server";
import { SubscriptionDetailView } from "@/components/forms/SubscriptionDetailView";
import { withDbInstance } from "@/db";
import { can } from "@/lib/permissions";
import { smoothLoading } from "@/lib/smooth-loader";
import { requireUserPage } from "@/server/auth/require-user";
import { isDemoUser } from "@/server/services/demo";
import { getCompanyBankAccounts, getSettings } from "@/server/services/settings";
import { getSubscription } from "@/server/services/subscriptions";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  try {
    const sub = getSubscription(id);
    if (!sub) return { title: "Dossier" };
    return {
      title: `${sub.subscription.number} - ${sub.subscription.titleAr}`,
    };
  } catch {
    return { title: "Dossier" };
  }
}

export default async function SubscriptionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await smoothLoading();
  const user = await requireUserPage();
  const isDemo = isDemoUser(user.email);
  const rawLocale = await getLocale();
  const locale = rawLocale === "en" ? "en" : "ar";
  const { id } = await params;

  return withDbInstance(isDemo, async () => {
    const data = getSubscription(id);
    if (!data) notFound();

    const company = getSettings("company");
    const companyAccounts = getCompanyBankAccounts(company);

    const canWrite = can(user, "subscriptions.write");
    const canPause = can(user, "subscriptions.pause");
    const canCancel = can(user, "subscriptions.cancel");
    const canGenerateInvoice = can(user, "invoices.write");

    return (
      <SubscriptionDetailView
        subscription={data.subscription}
        client={data.client ?? null}
        project={data.project ?? null}
        items={data.items}
        invoices={data.invoices}
        canWrite={canWrite}
        canPause={canPause}
        canCancel={canCancel}
        canGenerateInvoice={canGenerateInvoice}
        companyAccounts={companyAccounts}
        locale={locale}
      />
    );
  });
}

