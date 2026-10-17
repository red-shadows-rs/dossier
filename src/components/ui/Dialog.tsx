"use client";

import { useId, type ReactNode } from "react";
import MuiDialog from "@mui/material/Dialog";
import MuiDialogActions from "@mui/material/DialogActions";
import MuiDialogContent from "@mui/material/DialogContent";
import MuiDialogContentText from "@mui/material/DialogContentText";
import MuiDialogTitle from "@mui/material/DialogTitle";
import { X } from "lucide-react";
import { useLocale } from "next-intl";
import { cn } from "./cn";

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | false;
  showCloseButton?: boolean;
  closeLabel?: string;
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
  maxWidth = "sm",
  showCloseButton = true,
  closeLabel,
}: DialogProps) {
  const descriptionId = useId();
  let activeLocale = "ar";
  try {
    activeLocale = useLocale();
  } catch {}
  const isAr = activeLocale !== "en";

  return (
    <MuiDialog
      open={open}
      onClose={(_event, reason) => {
        if (reason === "backdropClick") {
          return;
        }
        onClose();
      }}
      fullWidth
      maxWidth={maxWidth}
      aria-describedby={description ? descriptionId : undefined}
      slotProps={{
        backdrop: {
          className: "bg-black/70 transition-opacity",
        },
        paper: {
          className: cn(
            "bg-surface text-foreground border border-border shadow-2xl rounded-xl overflow-hidden m-4 max-h-[92vh] flex flex-col",
            className,
          ),
          style: {
            backgroundImage: "none",
          },
        },
      }}
    >
      <div className="flex items-center justify-between border-b border-border/80 px-6 py-4 shrink-0">
        <MuiDialogTitle
          component="h2"
          className="p-0 text-lg font-bold text-foreground leading-tight"
        >
          {title}
        </MuiDialogTitle>
        {showCloseButton ? (
          <button
            type="button"
            onClick={onClose}
            aria-label={closeLabel ?? (isAr ? "إغلاق" : "Close")}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-card hover:text-foreground focus:outline-hidden focus-visible:ring-2 focus-visible:ring-primary"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <MuiDialogContent className="p-6 overflow-y-auto">
        {description ? (
          <MuiDialogContentText
            id={descriptionId}
            className="mb-4 text-sm text-muted-foreground"
          >
            {description}
          </MuiDialogContentText>
        ) : null}
        {children}
      </MuiDialogContent>
      {footer ? (
        <MuiDialogActions className="border-t border-border/80 bg-surface/40 px-6 py-4 shrink-0">
          {footer}
        </MuiDialogActions>
      ) : null}
    </MuiDialog>
  );
}