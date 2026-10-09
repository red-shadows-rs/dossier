"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { retryFinalizeAction } from "@/server/actions/contracts";

export function FinalizeRetryBanner({
  contractId,
  attempts,
  canRetry,
}: {
  contractId: string;
  attempts: number;
  canRetry: boolean;
}) {
  const t = useTranslations("contracts");
  const tr = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function onRetry() {
    setPending(true);
    const result = await retryFinalizeAction({ id: contractId });
    setPending(false);
    if (result.ok) {
      toast({ title: t("finalize.retryDone"), tone: "success" });
      router.refresh();
      return;
    }
    toast({ title: tr(`errors.${result.error.code}`), tone: "error" });
  }

  return (
    <div
      role="alert"
      className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/40 bg-destructive/10 p-3"
    >
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium text-foreground">
          {t("finalize.pending")}
        </span>
        <span className="text-xs text-muted-foreground">
          {t("finalize.attempts", { count: attempts })}
        </span>
      </div>
      {canRetry ? (
        <Button type="button" variant="secondary" onClick={onRetry} loading={pending}>
          {t("finalize.retry")}
        </Button>
      ) : null}
    </div>
  );
}
