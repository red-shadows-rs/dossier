// Dossier - Row Action Button Forms Component
// https://github.com/red-shadows-rs/dossier

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Archive, Trash2 } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Tooltip } from "@/components/ui/Tooltip";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/components/ui/cn";
import type { ActionResult } from "@/lib/result";

export function RowActionButton({
  id,
  action,
  kind,
  label,
  title,
  message,
  confirmLabel,
  successTitle,
}: {
  id: string;
  action: (raw: unknown) => Promise<ActionResult<null>>;
  kind: "archive" | "delete";
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
  const Icon = kind === "archive" ? Archive : Trash2;

  async function onConfirm() {
    setPending(true);
    const result = await action({ id });
    setPending(false);
    setOpen(false);
    if (result.ok) {
      toast({ title: successTitle, tone: "success" });
      router.refresh();
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
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded border border-border/70 bg-card transition-all shadow-2xs cursor-pointer",
            kind === "delete"
              ? "text-muted-foreground hover:border-destructive/50 hover:text-destructive hover:bg-destructive/10"
              : "text-muted-foreground hover:border-amber-500/50 hover:text-amber-500 hover:bg-amber-500/10",
          )}
        >
          <Icon size={15} aria-hidden="true" />
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
        tone={kind === "delete" ? "danger" : "primary"}
      />
    </>
  );
}