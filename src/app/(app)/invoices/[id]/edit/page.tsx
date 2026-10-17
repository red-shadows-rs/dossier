import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ArrowLeft, Pencil } from "lucide-react";
import { InvoiceLinesEditor } from "@/components/forms/InvoiceLinesEditor";
import { InvoiceMetaForm } from "@/components/forms/InvoiceMetaForm";
import { Button } from "@/components/ui/Button";
import type { CurrencyCode } from "@/lib/constants";
import { AppError } from "@/lib/errors";
import { assertCan } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { getInvoiceDetail } from "@/server/services/invoices";
import { smoothLoading } from "@/lib/smooth-loader";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await smoothLoading();
  const user = await requireUserPage();
  assertCan(user, "invoices.write");
  const t = await getTranslations("invoices");
  const { id } = await params;

  let detail;
  try {
    detail = getInvoiceDetail(id);
  } catch (error) {
    if (error instanceof AppError && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  if (detail.invoice.status !== "draft") {
    redirect(`/invoices/${id}`);
  }

  const isMilestone = detail.invoice.milestoneId !== null;

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
          <Link
            href={`/invoices/${id}`}
            className="hover:text-foreground transition-colors font-mono"
          >
            {detail.invoice.number ?? t("draftTitle")}
          </Link>
          <span className="text-border">/</span>
          <span className="text-foreground font-medium">{t("edit")}</span>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border/40 pb-4">
          <div className="flex items-center gap-3.5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary shadow-xs">
              <Pencil size={22} aria-hidden="true" />
            </div>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                  {t("edit")}
                </h1>
                <span
                  className="inline-flex items-center rounded border border-border/60 bg-muted/40 px-2 py-0.5 text-xs font-mono font-medium text-muted-foreground"
                  dir="ltr"
                >
                  {detail.invoice.number ?? t("draftTitle")}
                </span>
              </div>
            </div>
          </div>

          <Link href={`/invoices/${id}`}>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="gap-1.5 font-medium shadow-xs"
            >
              <ArrowLeft size={15} className="rtl:rotate-180" aria-hidden="true" />
              <span>{t("backToInvoice")}</span>
            </Button>
          </Link>
        </div>
      </div>

      <InvoiceMetaForm
        id={id}
        initial={{
          languageMode: detail.invoice.languageMode,
          currency: detail.invoice.currency as CurrencyCode,
          issueDate: detail.invoice.issueDate ?? "",
          dueDate: detail.invoice.dueDate ?? "",
          notesAr: detail.invoice.notesAr ?? "",
          notesEn: detail.invoice.notesEn ?? "",
        }}
      />

      {isMilestone ? (
        <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          {t("milestoneLocked")}
        </p>
      ) : (
        <InvoiceLinesEditor
          id={id}
          currency={detail.invoice.currency}
          initialLines={detail.lines.map((line) => ({
            descriptionAr: line.descriptionAr ?? "",
            descriptionEn: line.descriptionEn ?? "",
            qtyMilli: line.qtyMilli,
            unitPriceMinor: line.unitPriceMinor,
          }))}
          initialDiscount={{
            type: detail.invoice.discountType,
            value: detail.invoice.discountValue,
          }}
          initialTaxRateBp={detail.invoice.taxRateBp}
        />
      )}
    </div>
  );
}
