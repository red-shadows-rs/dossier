"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Ban, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/components/ui/Toast";
import {
  cancelContractAction,
  deleteDraftContractAction,
} from "@/server/actions/contracts";

export function ContractDraftActions({
  contractId,
  canDelete,
}: {
  contractId: string;
  canDelete: boolean;
}) {
  const t = useTranslations();
  const toast = useToast();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [dialog, setDialog] = useState<"delete" | "cancel" | null>(null);

  async function onConfirm() {
    setPending(true);
    const result =
      dialog === "delete"
        ? await deleteDraftContractAction({ id: contractId })
        : await cancelContractAction({ id: contractId });
    setPending(false);
    setDialog(null);
    if (result.ok) {
      toast({
        title: t(
          dialog === "delete" ? "contracts.deleted" : "contracts.cancelled",
        ),
        tone: "success",
      });
      if (dialog === "delete") {
        router.push("/contracts");
      } else {
        router.refresh();
      }
      return;
    }
    toast({ title: t(`errors.${result.error.code}`), tone: "error" });
  }

  return (
    <>
      <div className="flex gap-2">
        {canDelete ? (
          <Button
            type="button"
            variant="danger"
            onClick={() => setDialog("delete")}
            className="gap-1.5"
          >
            <Trash2 size={16} aria-hidden="true" />
            <span>{t("common.delete")}</span>
          </Button>
        ) : null}
        <Button
          type="button"
          variant="secondary"
          onClick={() => setDialog("cancel")}
          className="gap-1.5"
        >
          <Ban size={16} aria-hidden="true" />
          <span>{t("contracts.cancelAction")}</span>
        </Button>
      </div>
      <ConfirmDialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        onConfirm={onConfirm}
        title={t(
          dialog === "delete"
            ? "contracts.deleteConfirmTitle"
            : "contracts.cancelConfirmTitle",
        )}
        message={t(
          dialog === "delete"
            ? "contracts.deleteConfirm"
            : "contracts.cancelConfirm",
        )}
        confirmLabel={t("common.confirm")}
        cancelLabel={t("common.cancel")}
        pending={pending}
        tone={dialog === "delete" ? "danger" : "primary"}
      />
    </>
  );
}
