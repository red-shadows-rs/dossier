import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { InvoiceLinesEditor } from "@/components/forms/InvoiceLinesEditor";
import { InvoiceMetaForm } from "@/components/forms/InvoiceMetaForm";
import { Button } from "@/components/ui/Button";
import { AppError } from "@/lib/errors";
import { assertCan } from "@/lib/permissions";
import { requireUserPage } from "@/server/auth/require-user";
import { getInvoiceDetail } from "@/server/services/invoices";

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
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
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-foreground">{t("edit")}</h1>
        <a href={`/invoices/${id}`}>
          <Button type="button" variant="secondary">
            {t("backToInvoice")}
          </Button>
        </a>
      </div>

      <InvoiceMetaForm
        id={id}
        initial={{
          languageMode: detail.invoice.languageMode,
          issueDate: detail.invoice.issueDate ?? "",
          dueDate: detail.invoice.dueDate ?? "",
          notesAr: detail.invoice.notesAr ?? "",
          notesEn: detail.invoice.notesEn ?? "",
        }}
      />

      {isMilestone ? (
        <p className="rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted-foreground">
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
