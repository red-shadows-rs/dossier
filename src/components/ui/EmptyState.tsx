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
          ? "py-10 sm:py-14 px-4"
          : "rounded-lg border border-dashed border-border/80 bg-muted/10 py-10 sm:py-14 px-4 text-center",
        className,
      )}
    >
      <div
        className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary mb-3.5 [&>svg]:h-6 [&>svg]:w-6 [&>svg]:stroke-[1.75]"
        aria-hidden="true"
      >
        {icon ?? <Inbox size={24} strokeWidth={1.75} />}
      </div>
      <h4 className="text-sm sm:text-base font-semibold text-foreground tracking-tight mb-1">
        {title}
      </h4>
      {description ? (
        <p className="text-xs sm:text-sm text-muted-foreground max-w-md leading-relaxed text-center mb-4">
          {description}
        </p>
      ) : null}
      {action ? (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {action}
        </div>
      ) : null}
    </div>
  );
}
