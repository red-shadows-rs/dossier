// Dossier - New Subscription Page
// https://github.com/red-shadows-rs/dossier

import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/Button";
import { SubscriptionForm } from "@/components/forms/SubscriptionForm";
import { withDbInstance } from "@/db";
import { todayInTz } from "@/lib/dates";
import { assertCan } from "@/lib/permissions";
import { smoothLoading } from "@/lib/smooth-loader";
import { requireUserPage } from "@/server/auth/require-user";
import { listClientOptions } from "@/server/services/clients";
import { isDemoUser } from "@/server/services/demo";
import { listProjectOptions } from "@/server/services/projects";
import { getCompanyBankAccounts, getSettings } from "@/server/services/settings";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("subscriptions");
  return {
    title: t("new"),
  };
}

export default async function NewSubscriptionPage() {
  await smoothLoading();
  const user = await requireUserPage();
  assertCan(user, "subscriptions.write");
  const isDemo = isDemoUser(user.email);

  return withDbInstance(isDemo, async () => {
    const t = await getTranslations("subscriptions");
    const tc = await getTranslations("common");
    const defaults = getSettings("defaults");
    const company = getSettings("company");
    const bankAccounts = getCompanyBankAccounts(company);
    const today = todayInTz(defaults.timezone);

    const clients = listClientOptions();
    const projects = listProjectOptions();

    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
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
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
              <CalendarClock size={20} aria-hidden="true" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {t("new")}
              </h1>
              <p className="text-xs text-muted-foreground">
                {t("emptyHint")}
              </p>
            </div>
          </div>
        </div>

        <SubscriptionForm
          clients={clients}
          projects={projects}
          bankAccounts={bankAccounts}
          today={today}
        />
      </div>
    );
  });
}

