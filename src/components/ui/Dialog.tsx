"use client";

import { useId, type ReactNode } from "react";
import MuiDialog from "@mui/material/Dialog";
import MuiDialogActions from "@mui/material/DialogActions";
import MuiDialogContent from "@mui/material/DialogContent";
import MuiDialogContentText from "@mui/material/DialogContentText";
import MuiDialogTitle from "@mui/material/DialogTitle";

export type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
};

export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  className,
}: DialogProps) {
  const descriptionId = useId();

  return (
    <MuiDialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      className={className}
      aria-describedby={description ? descriptionId : undefined}
    >
      <MuiDialogTitle>{title}</MuiDialogTitle>
      <MuiDialogContent>
        {description ? (
          <MuiDialogContentText id={descriptionId} sx={{ mb: children ? 2 : 0 }}>
            {description}
          </MuiDialogContentText>
        ) : null}
        {children}
      </MuiDialogContent>
      {footer ? <MuiDialogActions>{footer}</MuiDialogActions> : null}
    </MuiDialog>
  );
}