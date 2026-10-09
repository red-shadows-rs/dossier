"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
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
    <Button type="button" size="sm" onClick={onClick} loading={pending}>
      {t("createInvoice")}
    </Button>
  );
}
