"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import {
  archiveClientAction,
  unarchiveClientAction,
} from "@/server/actions/clients";

export function ClientArchiveButton({
  clientId,
  archived,
}: {
  clientId: string;
  archived: boolean;
}) {
  const t = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function onConfirm() {
    setPending(true);
    const result = archived
      ? await unarchiveClientAction({ id: clientId })
      : await archiveClientAction({ id: clientId });
    setPending(false);
    setOpen(false);
    if (result.ok) {
      toast({
        title: t(archived ? "clients.unarchived" : "clients.archivedToast"),
        tone: "success",
      });
      router.refresh();
      return;
    }
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  return (
    <>
      <Button
        type="button"
        variant={archived ? "secondary" : "danger"}
        onClick={() => setOpen(true)}
      >
        {t(archived ? "clients.unarchive" : "clients.archive")}
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
        title={t(archived ? "clients.unarchive" : "clients.archive")}
        message={t(
          archived ? "clients.unarchiveConfirm" : "clients.archiveConfirm",
        )}
        confirmLabel={t(archived ? "clients.unarchive" : "clients.archive")}
        cancelLabel={t("common.cancel")}
        pending={pending}
        tone={archived ? "primary" : "danger"}
      />
    </>
  );
}
