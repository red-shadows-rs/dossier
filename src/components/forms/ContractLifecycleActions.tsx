"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Ban, CheckCheck, FileEdit, Link2, X, XCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Dialog } from "@/components/ui/Dialog";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toast";
import {
  cancelContractAction,
  completeContractAction,
  regenerateSigningLinkAction,
  reviseContractAction,
  terminateContractAction,
} from "@/server/actions/contracts";

type Status =
  | "draft"
  | "sent"
  | "declined"
  | "expired"
  | "signed"
  | "completed"
  | "terminated"
  | "cancelled";

export function ContractLifecycleActions({
  contractId,
  status,
  canWrite,
  canSend,
  canCancel,
  canTerminate,
}: {
  contractId: string;
  status: Status;
  canWrite: boolean;
  canSend: boolean;
  canCancel: boolean;
  canTerminate: boolean;
}) {
  const t = useTranslations("contracts");
  const tc = useTranslations("common");
  const tr = useTranslations();
  const toast = useToast();
  const router = useRouter();

  const [pending, setPending] = useState(false);
  const [dialog, setDialog] = useState<"revise" | "cancel" | null>(null);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [linkUrl, setLinkUrl] = useState<string | null>(null);

  function fail(code: string): void {
    toast({ title: tr(`errors.${code}`), tone: "error" });
  }

  async function onRegenerate() {
    setPending(true);
    const result = await regenerateSigningLinkAction({ id: contractId });
    setPending(false);
    if (result.ok) {
      setLinkUrl(result.data.url);
      router.refresh();
      return;
    }
    fail(result.error.code);
  }

  async function onReviseOrCancel() {
    setPending(true);
    const result =
      dialog === "revise"
        ? await reviseContractAction({ id: contractId })
        : await cancelContractAction({ id: contractId });
    setPending(false);
    setDialog(null);
    if (result.ok) {
      toast({
        title: t(dialog === "revise" ? "revised" : "cancelled"),
        tone: "success",
      });
      router.refresh();
      return;
    }
    fail(result.error.code);
  }

  async function onComplete() {
    setPending(true);
    const result = await completeContractAction({ id: contractId });
    setPending(false);
    if (result.ok) {
      toast({ title: t("completedDone"), tone: "success" });
      router.refresh();
      return;
    }
    fail(result.error.code);
  }

  async function onTerminate() {
    setPending(true);
    const result = await terminateContractAction({ id: contractId, reason });
    setPending(false);
    if (result.ok) {
      setTerminateOpen(false);
      setReason("");
      toast({ title: t("terminatedDone"), tone: "success" });
      router.refresh();
      return;
    }
    fail(result.error.code);
  }

  const showRevise = status === "sent" || status === "declined" || status === "expired";

  if (
    status === "draft" ||
    status === "completed" ||
    status === "terminated" ||
    status === "cancelled"
  ) {
    return null;
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {status === "sent" && canSend ? (
          <Button
            type="button"
            variant="secondary"
            onClick={onRegenerate}
            loading={pending}
            className="gap-1.5"
          >
            <Link2 size={16} aria-hidden="true" />
            <span>{t("actions.regenerateLink")}</span>
          </Button>
        ) : null}
        {showRevise && canWrite ? (
          <Button
            type="button"
            variant="secondary"
            onClick={() => setDialog("revise")}
            className="gap-1.5"
          >
            <FileEdit size={16} aria-hidden="true" />
            <span>{t("actions.revise")}</span>
          </Button>
        ) : null}
        {status === "signed" && canWrite ? (
          <Button type="button" onClick={onComplete} loading={pending} className="gap-1.5">
            <CheckCheck size={16} aria-hidden="true" />
            <span>{t("actions.complete")}</span>
          </Button>
        ) : null}
        {status === "signed" && canTerminate ? (
          <Button
            type="button"
            variant="danger"
            onClick={() => setTerminateOpen(true)}
            className="gap-1.5"
          >
            <XCircle size={16} aria-hidden="true" />
            <span>{t("actions.terminate")}</span>
          </Button>
        ) : null}
        {status !== "signed" && canCancel ? (
          <Button
            type="button"
            variant="danger"
            onClick={() => setDialog("cancel")}
            className="gap-1.5"
          >
            <Ban size={16} aria-hidden="true" />
            <span>{t("cancelAction")}</span>
          </Button>
        ) : null}
      </div>

      <ConfirmDialog
        open={dialog !== null}
        onClose={() => setDialog(null)}
        onConfirm={onReviseOrCancel}
        title={t(dialog === "revise" ? "reviseConfirmTitle" : "cancelConfirmTitle")}
        message={t(dialog === "revise" ? "reviseConfirm" : "cancelConfirm")}
        confirmLabel={tc("confirm")}
        cancelLabel={tc("cancel")}
        pending={pending}
        tone={dialog === "cancel" ? "danger" : "primary"}
      />

      <Dialog
        open={terminateOpen}
        onClose={() => setTerminateOpen(false)}
        title={t("terminateTitle")}
        description={t("terminateHint")}
        footer={
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setTerminateOpen(false)}
              disabled={pending}
              className="gap-1.5"
            >
              <X size={15} aria-hidden="true" />
              <span>{tc("cancel")}</span>
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={onTerminate}
              loading={pending}
              className="gap-1.5"
            >
              <XCircle size={15} aria-hidden="true" />
              <span>{t("actions.terminate")}</span>
            </Button>
          </div>
        }
      >
        <Field label={t("terminateReason")} htmlFor="terminate-reason" required>
          <Textarea
            id="terminate-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            disabled={pending}
          />
        </Field>
      </Dialog>

      <Dialog
        open={linkUrl !== null}
        onClose={() => setLinkUrl(null)}
        title={t("linkTitle")}
        description={t("linkOnce")}
        footer={
          <div className="flex justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setLinkUrl(null)}
              className="gap-1.5"
            >
              <X size={15} aria-hidden="true" />
              <span>{tc("close")}</span>
            </Button>
          </div>
        }
      >
        <Field label={t("linkLabel")} htmlFor="fresh-link">
          <Input id="fresh-link" value={linkUrl ?? ""} readOnly dir="ltr" />
        </Field>
      </Dialog>
    </>
  );
}
