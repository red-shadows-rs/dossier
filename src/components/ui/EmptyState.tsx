// Dossier - Empty State Ui Component
// https://github.com/red-shadows-rs/dossier

import type { ReactNode } from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/components/ui/cn";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  bordered = true,
}: {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  bordered?: boolean;
}) {
  const isBorderless = !bordered || className?.includes("border-0");
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center select-none",
        isBorderless
          ? "py-10 sm:py-12 px-4"
          : "rounded-lg border border-dashed border-border/70 bg-card/40 py-8 sm:py-10 px-4",
        className,
      )}
    >
      <div
        className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-lg border border-border/70 bg-muted/40 text-muted-foreground mb-2.5 [&>svg]:h-5 [&>svg]:w-5 [&>svg]:stroke-[1.75]"
        aria-hidden="true"
      >
        {icon ?? <Inbox size={20} strokeWidth={1.5} />}
      </div>
      <p className="text-sm font-semibold text-foreground tracking-tight">
        {title}
      </p>
      {description ? (
        <p className="mt-1 text-xs text-muted-foreground max-w-sm leading-relaxed text-center">
          {description}
        </p>
      ) : null}
      {action ? (
        <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
          {action}
        </div>
      ) : null}
    </div>
  );
}
