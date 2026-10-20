// Dossier - Invoices From Milestone Page
// https://github.com/red-shadows-rs/dossier

import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("invoices");
  return {
    title: t("new"),
  };
}
import { ArrowLeft, Layers, Receipt } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { NewMilestoneInvoiceForm } from "@/components/forms/NewMilestoneInvoiceForm";
import { withDbInstance } from "@/db";
import { assertCan } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { isDemoUser } from "@/server/services/demo";
import { listInvoiceableMilestones } from "@/server/services/invoices";
import { smoothLoading } from "@/lib/smooth-loader";

export default async function NewMilestoneInvoicePage() {
  await smoothLoading();
  const user = await requireUserPage();
  assertCan(user, "invoices.write");
  const isDemo = isDemoUser(user.email);

  return withDbInstance(isDemo, async () => {
    const t = await getTranslations("invoices");
    const tc = await getTranslations("common");
    const rawLocale = await getLocale();
    const locale = rawLocale === "en" ? "en" : "ar";

    const milestones = listInvoiceableMilestones(undefined, locale);

    return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          <Link
            href="/invoices"
            className="hover:text-foreground transition-colors"
          >
            {t("title")}
          </Link>
          <span className="text-border">/</span>
          <span className="text-foreground font-medium">{t("new")}</span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
              <Layers size={20} aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-0.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                {t("fromMilestoneTitle")}
              </h1>
            </div>
          </div>

          <Link href="/invoices">
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

      <div className="flex flex-wrap items-center gap-2 border-b border-border/60 pb-3">
        <Link href="/invoices/new">
          <Button type="button" variant="secondary" className="gap-1.5 shadow-xs">
            <Receipt size={16} aria-hidden="true" />
            <span>{t("directInvoice")}</span>
          </Button>
        </Link>
        <Link href="/invoices/from-milestone">
          <Button type="button" variant="primary" className="gap-1.5 shadow-xs">
            <Layers size={16} aria-hidden="true" />
            <span>{t("fromMilestone")}</span>
            {milestones.length > 0 ? (
              <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-primary">
                {milestones.length}
              </span>
            ) : null}
          </Button>
        </Link>
      </div>

      <NewMilestoneInvoiceForm milestones={milestones} />
    </div>
    );
  });
}

