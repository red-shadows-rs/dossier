// Dossier - Subscription Detail Page
// https://github.com/red-shadows-rs/dossier

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
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

    const tc = await getTranslations("common");
    const company = getSettings("company");
    const companyAccounts = getCompanyBankAccounts(company);

    const canWrite = can(user, "subscriptions.write");
    const canPause = can(user, "subscriptions.pause");
    const canCancel = can(user, "subscriptions.cancel");
    const canGenerateInvoice = can(user, "invoices.write");

    return (
      <div className="flex flex-col gap-6">
        <nav>
          <Link href="/subscriptions">
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft size={16} className="rtl:rotate-180" aria-hidden="true" />
              <span>{tc("back")}</span>
            </Button>
          </Link>
        </nav>

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
      </div>
    );
  });
}

