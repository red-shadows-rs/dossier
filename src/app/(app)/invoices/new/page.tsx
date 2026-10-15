import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { Layers, Receipt } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { NewInvoiceForm } from "@/components/forms/NewInvoiceForm";
import { assertCan } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { listInvoiceableMilestones } from "@/server/services/invoices";
import { listProjectOptions } from "@/server/services/projects";
import { smoothLoading } from "@/lib/smooth-loader";

export default async function NewInvoicePage() {
  await smoothLoading();
  const user = await requireUserPage();
  assertCan(user, "invoices.write");
  const t = await getTranslations("invoices");
  const rawLocale = await getLocale();
  const locale = rawLocale === "en" ? "en" : "ar";

  const projects = listProjectOptions().map((project) => ({
    id: project.id,
    label: `${project.code} - ${(locale === "ar" ? project.nameAr || project.nameEn : project.nameEn || project.nameAr) ?? ""}`,
  }));
  const milestones = listInvoiceableMilestones(undefined, locale);

  return (
    <div className="flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
        <div className="flex items-center gap-3.5">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-primary/20 bg-primary/10 text-primary shadow-xs">
            <Receipt size={20} aria-hidden="true" />
          </div>
          <div className="flex flex-col gap-0.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{t("new")}</h1>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
        <Link href="/invoices/new">
          <Button type="button" variant="primary" size="sm" className="gap-1.5">
            <Receipt size={16} aria-hidden="true" />
            <span>{t("directInvoice")}</span>
          </Button>
        </Link>
        <Link href="/invoices/from-milestone">
          <Button type="button" variant="secondary" size="sm" className="gap-1.5">
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

      <NewInvoiceForm projects={projects} />
    </div>
  );
}
