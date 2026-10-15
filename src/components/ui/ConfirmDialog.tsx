"use client";

import type { ReactNode } from "react";
import { Check, Trash2, X } from "lucide-react";
import { Button } from "./Button";
import { Dialog } from "./Dialog";

export type ConfirmDialogProps = {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: ReactNode;
  message: ReactNode;
  confirmLabel: ReactNode;
  cancelLabel: ReactNode;
  pending?: boolean;
  tone?: "primary" | "danger";
};

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  pending,
  tone = "danger",
}: ConfirmDialogProps) {
  const ConfirmIcon = tone === "danger" ? Trash2 : Check;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      description={message}
      footer={
        <>
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={pending}
            className="gap-1.5"
          >
            <X size={15} aria-hidden="true" />
            <span>{cancelLabel}</span>
          </Button>
          <Button
            type="button"
            variant={tone}
            onClick={onConfirm}
            loading={pending}
            className="gap-1.5"
          >
            {!pending ? <ConfirmIcon size={15} aria-hidden="true" /> : null}
            <span>{confirmLabel}</span>
          </Button>
        </>
      }
    />
  );
}
