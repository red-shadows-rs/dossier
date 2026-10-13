"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Archive, Trash2 } from "lucide-react";
import MuiIconButton from "@mui/material/IconButton";
import MuiTooltip from "@mui/material/Tooltip";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
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
      <MuiTooltip title={label}>
        <MuiIconButton
          size="small"
          aria-label={label}
          onClick={() => setOpen(true)}
          sx={{ color: kind === "delete" ? "error.main" : "text.secondary" }}
        >
          <Icon size={18} aria-hidden="true" />
        </MuiIconButton>
      </MuiTooltip>
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