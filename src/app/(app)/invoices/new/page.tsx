// Dossier - Invoices New Page
// https://github.com/red-shadows-rs/dossier

import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { ArrowLeft, Layers, Receipt } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { NewInvoiceForm } from "@/components/forms/NewInvoiceForm";
import { assertCan } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { listInvoiceableMilestones } from "@/server/services/invoices";
import { listProjectOptions } from "@/server/services/projects";
import { getSettings } from "@/server/services/settings";
import { smoothLoading } from "@/lib/smooth-loader";

export default async function NewInvoicePage() {
  await smoothLoading();
  const user = await requireUserPage();
  assertCan(user, "invoices.write");
  const t = await getTranslations("invoices");
  const tc = await getTranslations("common");
  const defaults = getSettings("defaults");
  const rawLocale = await getLocale();
  const locale = rawLocale === "en" ? "en" : "ar";

  const projects = listProjectOptions().map((project) => ({
    id: project.id,
    label: `${project.code} - ${(locale === "ar" ? project.nameAr || project.nameEn : project.nameEn || project.nameAr) ?? ""}`,
  }));
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
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary shadow-xs">
              <Receipt size={22} aria-hidden="true" />
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
          <Button type="button" variant="primary" size="sm" className="gap-1.5 shadow-xs">
            <Receipt size={15} aria-hidden="true" />
            <span>{t("directInvoice")}</span>
          </Button>
        </Link>
        <Link href="/invoices/from-milestone">
          <Button type="button" variant="secondary" size="sm" className="gap-1.5 shadow-xs">
            <Layers size={15} aria-hidden="true" />
            <span>{t("fromMilestone")}</span>
            {milestones.length > 0 && (
              <span className="rounded-full bg-primary/15 px-1.5 py-0.5 text-[11px] font-mono font-bold text-primary">
                {milestones.length}
              </span>
            )}
          </Button>
        </Link>
      </div>

      <NewInvoiceForm
        projects={projects}
        defaultLanguageMode={defaults.languageMode ?? "ar"}
      />
    </div>
  );
}
