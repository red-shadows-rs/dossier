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
          ? "py-12 sm:py-16 px-4"
          : "rounded-xl border border-dashed border-border/80 bg-card/40 backdrop-blur-xs py-10 sm:py-14 px-6 shadow-2xs",
        className,
      )}
    >
      <div
        className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-2xl border border-primary/20 bg-gradient-to-b from-primary/15 via-primary/10 to-primary/5 text-primary shadow-xs ring-8 ring-primary/5 mb-3.5 transition-transform duration-300 hover:scale-105 [&>svg]:h-8 [&>svg]:w-8 sm:[&>svg]:h-9 sm:[&>svg]:w-9 [&>svg]:text-primary [&>svg]:stroke-[1.75]"
        aria-hidden="true"
      >
        {icon ?? <Inbox size={32} strokeWidth={1.5} />}
      </div>
      <h3 className="text-base sm:text-lg font-bold text-foreground tracking-tight max-w-md">
        {title}
      </h3>
      {description ? (
        <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground/85 max-w-md leading-relaxed text-center">
          {description}
        </p>
      ) : null}
      {action ? (
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
          {action}
        </div>
      ) : null}
    </div>
  );
}
