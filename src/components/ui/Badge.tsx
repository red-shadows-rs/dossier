import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

export type BadgeTone = "gray" | "blue" | "green" | "red" | "amber" | "teal";

const TONE_STYLES: Record<
  BadgeTone,
  { bg: string; text: string; border: string; dot: string; glow: string }
> = {
  gray: {
    bg: "bg-muted/70 hover:bg-muted",
    text: "text-muted-foreground",
    border: "border-border/80",
    dot: "bg-muted-foreground/70",
    glow: "shadow-xs",
  },
  blue: {
    bg: "bg-sky-500/10 hover:bg-sky-500/15",
    text: "text-sky-600 dark:text-sky-400",
    border: "border-sky-500/30",
    dot: "bg-sky-500 shadow-[0_0_6px_rgba(14,165,233,0.6)]",
    glow: "shadow-xs",
  },
  green: {
    bg: "bg-emerald-500/10 hover:bg-emerald-500/15",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/30",
    dot: "bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]",
    glow: "shadow-xs",
  },
  red: {
    bg: "bg-rose-500/10 hover:bg-rose-500/15",
    text: "text-rose-600 dark:text-rose-400",
    border: "border-rose-500/30",
    dot: "bg-rose-500 shadow-[0_0_6px_rgba(244,63,94,0.6)]",
    glow: "shadow-xs",
  },
  amber: {
    bg: "bg-amber-500/10 hover:bg-amber-500/15",
    text: "text-amber-600 dark:text-amber-400",
    border: "border-amber-500/30",
    dot: "bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]",
    glow: "shadow-xs",
  },
  teal: {
    bg: "bg-teal-500/10 hover:bg-teal-500/15",
    text: "text-teal-600 dark:text-teal-400",
    border: "border-teal-500/30",
    dot: "bg-teal-500 shadow-[0_0_6px_rgba(20,184,166,0.6)]",
    glow: "shadow-xs",
  },
};

export function Badge({
  tone = "gray",
  className,
  dot = true,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  dot?: boolean;
  children: ReactNode;
}) {
  const t = TONE_STYLES[tone] ?? TONE_STYLES.gray;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold tracking-tight border transition-colors select-none whitespace-nowrap shrink-0",
        t.bg,
        t.text,
        t.border,
        t.glow,
        className,
      )}
    >
      {dot ? (
        <span
          className={cn("h-1.5 w-1.5 rounded-full shrink-0", t.dot)}
          aria-hidden="true"
        />
      ) : null}
      <span className="inline-flex items-center gap-1 whitespace-nowrap">{children}</span>
    </span>
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

const PROJECT_TONES: Record<string, BadgeTone> = {
  lead: "blue",
  active: "green",
  on_hold: "amber",
  completed: "teal",
  cancelled: "red",
};

export function projectStatusTone(status: string): BadgeTone {
  return PROJECT_TONES[status] ?? "gray";
}