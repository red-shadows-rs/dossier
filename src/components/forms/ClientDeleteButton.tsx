"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { deleteClientAction } from "@/server/actions/clients";

export function ClientDeleteButton({ clientId }: { clientId: string }) {
  const t = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function onConfirm() {
    setPending(true);
    const result = await deleteClientAction({ id: clientId });
    setPending(false);
    setOpen(false);
    if (result.ok) {
      toast({
        title: t("clients.deletedToast"),
        tone: "success",
      });
      router.push("/clients");
      return;
    }
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  return (
    <>
      <Button
        type="button"
        variant="danger"
        onClick={() => setOpen(true)}
        className="gap-1.5"
      >
        <Trash2 size={16} aria-hidden="true" />
        <span>{t("clients.delete")}</span>
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
        title={t("clients.delete")}
        message={t("clients.deleteConfirm")}
        confirmLabel={t("clients.delete")}
        cancelLabel={t("common.cancel")}
        tone="danger"
        pending={pending}
      />
    </>
  );
}
