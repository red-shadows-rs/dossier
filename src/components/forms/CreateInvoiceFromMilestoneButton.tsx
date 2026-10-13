// Dossier - Create Invoice From Milestone Button Forms Component
// https://github.com/red-shadows-rs/dossier

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Receipt } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Tooltip } from "@/components/ui/Tooltip";
import { useToast } from "@/components/ui/Toast";
import { createInvoiceFromMilestoneAction } from "@/server/actions/invoices";

export function CreateInvoiceFromMilestoneButton({
  milestoneId,
}: {
  milestoneId: string;
}) {
  const t = useTranslations("projects");
  const toast = useToast();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onClick() {
    setPending(true);
    const result = await createInvoiceFromMilestoneAction({ milestoneId });
    setPending(false);
    if (result.ok) {
      router.push(`/invoices/${result.data.id}/edit`);
      router.refresh();
      return;
    }
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  return (
    <Tooltip content={t("createInvoice")}>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        onClick={onClick}
        loading={pending}
        aria-label={t("createInvoice")}
        className="flex h-8 w-8 items-center justify-center p-0 rounded border border-border/70 bg-card text-muted-foreground hover:bg-muted hover:text-foreground hover:border-primary/50 transition-all shadow-2xs"
      >
        <Receipt size={15} aria-hidden="true" />
      </Button>
    </Tooltip>
  );
}
