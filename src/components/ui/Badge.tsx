import type { ReactNode } from "react";
import { cn } from "./cn";

export type BadgeTone = "gray" | "blue" | "green" | "red" | "amber" | "teal";

const TONES: Record<BadgeTone, string> = {
  gray: "border-border bg-background text-muted-foreground",
  blue: "border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400",
  green:
    "border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400",
  red: "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400",
  amber:
    "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  teal: "border-teal-500/30 bg-teal-500/10 text-teal-600 dark:text-teal-400",
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
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

// 5.8 status colors
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
