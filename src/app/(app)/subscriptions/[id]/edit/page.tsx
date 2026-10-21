// Dossier - Edit Subscription Page
// https://github.com/red-shadows-rs/dossier

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import {
  SubscriptionForm,
  type SubscriptionInitialData,
} from "@/components/forms/SubscriptionForm";
import { withDbInstance } from "@/db";
import type { DiscountType, SubscriptionFrequency } from "@/lib/constants";
import { todayInTz } from "@/lib/dates";
import { assertCan } from "@/lib/permissions";
import { smoothLoading } from "@/lib/smooth-loader";
import { requireUserPage } from "@/server/auth/require-user";
import { listClientOptions } from "@/server/services/clients";
import { isDemoUser } from "@/server/services/demo";
import { listProjectOptions } from "@/server/services/projects";
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
      title: `${sub.subscription.number} - تعديل`,
    };
  } catch {
    return { title: "Dossier" };
  }
}

export default async function EditSubscriptionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await smoothLoading();
  const user = await requireUserPage();
  assertCan(user, "subscriptions.write");
  const isDemo = isDemoUser(user.email);
  const { id } = await params;

  return withDbInstance(isDemo, async () => {
    const data = getSubscription(id);
    if (!data) notFound();

    const t = await getTranslations("subscriptions");
    const tc = await getTranslations("common");
    const defaults = getSettings("defaults");
    const company = getSettings("company");
    const bankAccounts = getCompanyBankAccounts(company);
    const today = todayInTz(defaults.timezone);

    const clients = listClientOptions();
    const projects = listProjectOptions();
    const sub = data.subscription;

    const initialData: SubscriptionInitialData = {
      id: sub.id,
      clientId: sub.clientId,
      projectId: sub.projectId,
      titleAr: sub.titleAr,
      titleEn: sub.titleEn,
      description: sub.description,
      frequency: sub.frequency as SubscriptionFrequency,
      intervalCount: sub.intervalCount,
      startDate: sub.startDate,
      nextRunDate: sub.nextRunDate,
      endDate: sub.endDate,
      languageMode: (sub.languageMode as "ar" | "en") || "ar",
      currency: sub.currency,
      taxRateBp: sub.taxRateBp,
      discountType: (sub.discountType as DiscountType) || "amount",
      discountValue: sub.discountValue,
      paymentTermsDays: sub.paymentTermsDays,
      paymentInstructionsAr: sub.paymentInstructionsAr,
      autoIssueInvoice: sub.autoIssueInvoice,
      autoSendEmail: sub.autoSendEmail,
      notesAr: sub.notesAr,
      items: data.items.map((it) => ({
        id: it.id,
        descriptionAr: it.descriptionAr,
        descriptionEn: it.descriptionEn,
        quantity: it.quantity,
        unitPriceMinor: it.unitPriceMinor,
        taxRateBp: it.taxRateBp,
      })),
    };

    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <nav>
            <Link href={`/subscriptions/${id}`}>
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
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
              <CalendarClock size={20} aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {t("edit")} - {sub.number}
              </h1>
              <p className="text-xs text-muted-foreground">
                {sub.titleAr}
              </p>
            </div>
          </div>
        </div>

        <SubscriptionForm
          clients={clients}
          projects={projects}
          bankAccounts={bankAccounts}
          initialData={initialData}
          today={today}
        />
      </div>
    );
  });
}

