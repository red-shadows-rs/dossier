import type { ReactNode } from "react";
import MuiChip from "@mui/material/Chip";
import type { ChipProps } from "@mui/material/Chip";

export type BadgeTone = "gray" | "blue" | "green" | "red" | "amber" | "teal";

const TONES: Record<BadgeTone, ChipProps["color"]> = {
  gray: "default",
  blue: "info",
  green: "success",
  red: "error",
  amber: "warning",
  teal: "success",
};

export function Badge({
  tone = "gray",
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <MuiChip
      size="small"
      variant="outlined"
      color={TONES[tone]}
      label={children}
      className={className}
    />
  );
}

const CONTRACT_TONES: Record<string, BadgeTone> = {
  draft: "gray",
  sent: "blue",
  signed: "green",
  declined: "red",
  expired: "amber",
  completed: "teal",
  terminated: "red",
  cancelled: "gray",
};

const INVOICE_TONES: Record<string, BadgeTone> = {
  draft: "gray",
  issued: "blue",
  partially_paid: "amber",
  paid: "green",
  void: "gray",
};

export function contractStatusTone(status: string): BadgeTone {
  return CONTRACT_TONES[status] ?? "gray";
}

export function invoiceStatusTone(status: string, overdue = false): BadgeTone {
  if (overdue) return "red";
  return INVOICE_TONES[status] ?? "gray";
}