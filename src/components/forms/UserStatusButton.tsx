"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import { setUserStatusAction } from "@/server/actions/users";

export function UserStatusButton({
  userId,
  status,
}: {
  userId: string;
  status: "active" | "disabled";
}) {
  const t = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const disabled = status === "disabled";

  async function onConfirm() {
    setPending(true);
    const result = await setUserStatusAction({
      id: userId,
      status: disabled ? "active" : "disabled",
    });
    setPending(false);
    setOpen(false);
    if (result.ok) {
      toast({
        title: t(disabled ? "users.enabledToast" : "users.disabledToast"),
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
        variant={disabled ? "secondary" : "danger"}
        onClick={() => setOpen(true)}
      >
        {t(disabled ? "users.enable" : "users.disable")}
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={onConfirm}
        title={t(disabled ? "users.enable" : "users.disable")}
        message={t(
          disabled ? "users.enableConfirm" : "users.disableConfirm",
        )}
        confirmLabel={t(disabled ? "users.enable" : "users.disable")}
        cancelLabel={t("common.cancel")}
        pending={pending}
        tone={disabled ? "primary" : "danger"}
      />
    </>
  );
}
