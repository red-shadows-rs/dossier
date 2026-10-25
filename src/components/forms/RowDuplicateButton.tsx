// Dossier - Row Duplicate Button Forms Component
// https://github.com/red-shadows-rs/dossier

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Copy } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Tooltip } from "@/components/ui/Tooltip";
import { useToast } from "@/components/ui/Toast";
import type { ActionResult } from "@/lib/result";

export function RowDuplicateButton({
  id,
  action,
  editHrefPrefix,
  label,
  title,
  message,
  confirmLabel,
  successTitle,
}: {
  id: string;
  action: (raw: unknown) => Promise<ActionResult<{ id: string }>>;
  editHrefPrefix: string;
  label: string;
  title: string;
  message: string;
  confirmLabel: string;
  successTitle: string;
}) {
  const t = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function onConfirm() {
    setPending(true);
    const result = await action({ id });
    setPending(false);
    setOpen(false);
    if (result.ok) {
      toast({ title: successTitle, tone: "success" });
      router.push(`${editHrefPrefix}/${result.data.id}/edit`);
      return;
    }
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  return (
    <>
      <Tooltip content={label}>
        <button
          type="button"
          aria-label={label}
          onClick={() => setOpen(true)}
          className="flex h-8 w-8 items-center justify-center rounded border border-border/70 bg-card text-muted-foreground hover:bg-muted hover:text-foreground hover:border-primary/50 transition-all shadow-2xs cursor-pointer"
        >
          <Copy size={15} aria-hidden="true" />
        </button>
      </Tooltip>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
        title={title}
        message={message}
        confirmLabel={confirmLabel}
        cancelLabel={t("common.cancel")}
        pending={pending}
        tone="primary"
      />
    </>
  );
}
